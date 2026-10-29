// Almacén privado: copia de cada proyecto en un bucket privado de Supabase Storage.
// El repo es público: los proyectos de clientes viven en tu máquina (proyectos/, ignorado por git) y en la nube privada.
// Variables: SUPABASE_URL, SUPABASE_SERVICE_KEY (clave de servicio, nunca en el navegador), SUPABASE_BUCKET (por defecto "proyectos").
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { CARPETA } from "./almacen.ts";

/** Hay nube configurada (Supabase). */
export const nubeConfigurada = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/** El servidor trabaja contra la nube: en Vercel (disco temporal) o si lo pides con ANONYMO_NUBE=1. */
export const nubeActiva = () => nubeConfigurada() && (!!process.env.VERCEL || process.env.ANONYMO_NUBE === "1");

const cfg = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local.");
  return { url, key, bucket: process.env.SUPABASE_BUCKET ?? "proyectos" };
};
/** Solo nombres de proyecto simples: nada de "../" ni barras (el id llega desde la URL). */
const idSeguro = (id: string) => {
  if (!/^[a-z0-9_][a-z0-9_-]{0,80}$/i.test(id)) throw new Error(`Nombre de proyecto no válido: "${id}".`);
  return id;
};

const cabeceras = (key: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${key}`, apikey: key, ...extra });

function archivosLocales(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    return statSync(r).isDirectory() ? archivosLocales(r) : [r];
  });
}

/** Sube (o actualiza) todo el proyecto. */
export async function subirProyecto(id: string, f: typeof fetch = fetch): Promise<number> {
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const base = join(CARPETA, id);
  if (!existsSync(base)) throw new Error(`No hay proyecto "${id}" en ${CARPETA}.`);
  let n = 0;
  for (const ruta of archivosLocales(base)) {
    const destino = `${id}/${relative(base, ruta).split("\\").join("/")}`;
    const r = await f(`${url}/storage/v1/object/${bucket}/${destino}`, {
      method: "POST",
      headers: cabeceras(key, { "x-upsert": "true", "content-type": "application/octet-stream" }),
      body: new Uint8Array(readFileSync(ruta)),
    });
    if (!r.ok) throw new Error(`No se pudo subir ${destino}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    n++;
  }
  return n;
}

async function listarRemoto(prefijo: string, f: typeof fetch): Promise<string[]> {
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: cabeceras(key, { "content-type": "application/json" }),
    body: JSON.stringify({ prefix: prefijo, limit: 1000, offset: 0 }),
  });
  if (!r.ok) throw new Error(`No se pudo listar ${prefijo}: ${r.status}`);
  const items = (await r.json()) as { name: string; id: string | null }[];
  const out: string[] = [];
  for (const it of items) {
    const ruta = prefijo ? `${prefijo}/${it.name}` : it.name;
    if (it.id === null) out.push(...(await listarRemoto(ruta, f)));
    else out.push(ruta);
  }
  return out;
}

/** Cuántos pedidos de la web esperan en la nube (sin los archivados). No baja nada. */
export async function solicitudesEnNube(f: typeof fetch = fetch): Promise<number> {
  const rutas = await listarRemoto("_solicitudes", f).catch(() => [] as string[]);
  return rutas.filter((r) => /^_solicitudes\/[^/]+\.json$/.test(r)).length;
}

/** Baja el proyecto desde la nube (pisa la copia local). Con `espejo`, la copia local queda idéntica: borra lo que ya no está. */
export async function bajarProyecto(id: string, f: typeof fetch = fetch, espejo = false): Promise<number> {
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const rutas = await listarRemoto(id, f);
  if (!rutas.length && !espejo) throw new Error(`No hay "${id}" en la nube.`);
  if (espejo) rmSync(join(CARPETA, id), { recursive: true, force: true });
  for (const ruta of rutas) {
    const r = await f(`${url}/storage/v1/object/${bucket}/${ruta}`, { headers: cabeceras(key) });
    if (!r.ok) throw new Error(`No se pudo bajar ${ruta}: ${r.status}`);
    const local = join(CARPETA, ruta);
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, new Uint8Array(await r.arrayBuffer()));
  }
  return rutas.length;
}

/** Proyectos que hay en la nube. */
export async function proyectosEnNube(f: typeof fetch = fetch): Promise<string[]> {
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: cabeceras(key, { "content-type": "application/json" }),
    body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
  });
  if (!r.ok) throw new Error(`No se pudo listar la nube: ${r.status}`);
  return ((await r.json()) as { name: string; id: string | null }[]).filter((x) => x.id === null).map((x) => x.name);
}

/** Sube un solo archivo, por su ruta dentro de proyectos/ ("_analitica/2026-10-x.jsonl"). */
export async function subirRuta(rel: string, f: typeof fetch = fetch) {
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/${rel}`, {
    method: "POST",
    headers: cabeceras(key, { "x-upsert": "true", "content-type": "application/octet-stream" }),
    body: new Uint8Array(readFileSync(join(CARPETA, rel))),
  });
  if (!r.ok) throw new Error(`No se pudo subir ${rel}: ${r.status}`);
}

/** Sube el proyecto y borra en la nube lo que ya no existe en local (por ejemplo, una solicitud archivada). */
export async function espejarProyecto(id: string, f: typeof fetch = fetch): Promise<{ subidos: number; borrados: number }> {
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const base = join(CARPETA, id);
  // Sin copia local no se toca nada: nunca se borra la nube por un proyecto que no se bajó.
  if (!existsSync(base)) return { subidos: 0, borrados: 0 };
  const locales = new Set(archivosLocales(base).map((r) => `${id}/${relative(base, r).split("\\").join("/")}`));
  if (!locales.size) return { subidos: 0, borrados: 0 };
  const subidos = await subirProyecto(id, f);
  const sobran = (await listarRemoto(id, f)).filter((r) => !locales.has(r));
  if (sobran.length) {
    const r = await f(`${url}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: cabeceras(key, { "content-type": "application/json" }),
      body: JSON.stringify({ prefixes: sobran }),
    });
    if (!r.ok) throw new Error(`No se pudo limpiar ${id} en la nube: ${r.status}`);
  }
  return { subidos, borrados: sobran.length };
}

/** Lee un solo archivo de la nube sin bajar el proyecto entero (la oficina en vivo lee solo estado.json). */
export async function leerRemoto(id: string, rel: string, f: typeof fetch = fetch): Promise<string | undefined> {
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/${id}/${rel}`, { headers: cabeceras(key), cache: "no-store" } as RequestInit);
  if (r.status === 404 || r.status === 400) return undefined;
  if (!r.ok) throw new Error(`No se pudo leer ${id}/${rel}: ${r.status}`);
  return r.text();
}

/** Borra un proyecto entero de la nube (solo cuando Jay o Luna lo piden con confirmación). */
export async function borrarRemoto(id: string, f: typeof fetch = fetch): Promise<number> {
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const rutas = await listarRemoto(id, f);
  if (!rutas.length) return 0;
  const r = await f(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: cabeceras(key, { "content-type": "application/json" }),
    body: JSON.stringify({ prefixes: rutas }),
  });
  if (!r.ok) throw new Error(`No se pudo borrar ${id} en la nube: ${r.status}`);
  return rutas.length;
}
