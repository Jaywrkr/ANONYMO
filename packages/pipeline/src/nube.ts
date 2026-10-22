// Almacén privado: copia de cada proyecto en un bucket privado de Supabase Storage.
// El repo es público: los proyectos de clientes viven en tu máquina (proyectos/, ignorado por git) y en la nube privada.
// Variables: SUPABASE_URL, SUPABASE_SERVICE_KEY (clave de servicio, nunca en el navegador), SUPABASE_BUCKET (por defecto "proyectos").
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { CARPETA } from "./almacen.ts";

const cfg = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local.");
  return { url, key, bucket: process.env.SUPABASE_BUCKET ?? "proyectos" };
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

/** Baja el proyecto desde la nube (pisa la copia local). */
export async function bajarProyecto(id: string, f: typeof fetch = fetch): Promise<number> {
  const { url, key, bucket } = cfg();
  const rutas = await listarRemoto(id, f);
  if (!rutas.length) throw new Error(`No hay "${id}" en la nube.`);
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
