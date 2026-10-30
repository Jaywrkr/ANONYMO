import {versionadoActivo,vivoVersionado,bajarVersionado,leerArchivoVersionado,indiceActual,registrarBase,publicarVersionado,proyectosVersionados,estadoConCola,enPublicacion,hayPublicacionSinConfirmar} from "./versionado.ts";
// Almacén privado: copia de cada proyecto en un bucket privado de Supabase Storage.
// El repo es público: los proyectos de clientes viven en tu máquina (proyectos/, ignorado por git) y en la nube privada.
// Variables: SUPABASE_URL, SUPABASE_SERVICE_KEY (clave de servicio, nunca en el navegador), SUPABASE_BUCKET (por defecto "proyectos").
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import {tmpdir} from "node:os";
import { carpeta, enCarpeta } from "./almacen.ts";

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
  if(versionadoActivo(id))return (await publicarVersionado(id,new Map(),false,f)).subidos;
  const { url, key, bucket } = cfg();
  const base = join(carpeta(), id);
  if (!existsSync(base)) throw new Error(`No hay proyecto "${id}" en ${carpeta()}.`);
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

async function listarNivel(prefijo:string,f:typeof fetch){
 const {url,key,bucket}=cfg(),todos:{name:string;id:string|null}[]=[];let anterior='';
 for(let offset=0;offset<100000;offset+=1000){const r=await f(`${url}/storage/v1/object/list/${bucket}`,{method:'POST',headers:cabeceras(key,{'content-type':'application/json'}),body:JSON.stringify({prefix:prefijo,limit:1000,offset,sortBy:{column:'name',order:'asc'}})});if(!r.ok)throw new Error(`No se pudo listar el almacén: ${r.status}`);const pagina=await r.json() as {name:string;id:string|null}[];const firma=JSON.stringify(pagina);if(pagina.length&&firma===anterior)throw new Error('El almacén no avanzó al listar. No se usa una copia incompleta.');anterior=firma;todos.push(...pagina);if(pagina.length<1000)return todos;}throw new Error('El listado supera el límite de la operación.');
}
async function listarRemoto(prefijo:string,f:typeof fetch):Promise<string[]>{
 const out:string[]=[];for(const it of await listarNivel(prefijo,f)){if(!it.name||it.name==='.'||it.name==='..'||it.name.includes('/'))throw new Error('Ruta remota no válida.');const ruta=prefijo?`${prefijo}/${it.name}`:it.name;if(it.id===null)out.push(...await listarRemoto(ruta,f));else out.push(ruta);}return out;
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
  if(versionadoActivo(id)){const n=await bajarVersionado(id,f);if(n!==false)return n;}
  const rutas = await listarRemoto(id, f);
  if(versionadoActivo(id))registrarBase(id,null,rutas.length>0);
  if (!rutas.length && !espejo) throw new Error(`No hay "${id}" en la nube.`);
  // Se baja a una carpeta aparte y se cambia de una vez (sistema/37): quien esté leyendo el proyecto
  // nunca encuentra la carpeta a medio borrar.
  const final = join(carpeta(), id);
  const temporal = espejo ? join(carpeta(), `.bajando-${id}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) : final;
  for (const ruta of rutas) {
    const r = await f(`${url}/storage/v1/object/${bucket}/${ruta}`, { headers: cabeceras(key) });
    if (!r.ok) throw new Error(`No se pudo bajar ${ruta}: ${r.status}`);
    const local = join(temporal, relative(id, ruta));
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, new Uint8Array(await r.arrayBuffer()));
  }
  if (espejo) {
    mkdirSync(temporal, { recursive: true });
    const viejo = `${temporal}.viejo`;
    if (existsSync(final)) renameSync(final, viejo);
    renameSync(temporal, final);
    rmSync(viejo, { recursive: true, force: true });
  }
  return rutas.length;
}

/** Proyectos que hay en la nube. */
export async function proyectosEnNube(f:typeof fetch=fetch):Promise<string[]>{
 const legado=(await listarNivel('',f)).filter(x=>x.id===null&&x.name!=='_anonymo').map(x=>x.name);
 return process.env.ANONYMO_ALMACEN_VERSIONADO==='1'?[...new Set([...legado,...await proyectosVersionados(f)])]:legado;
}

/** Sube un solo archivo, por su ruta dentro de proyectos/ ("_analitica/2026-10-x.jsonl"). */
export async function subirRuta(rel: string, f: typeof fetch = fetch) {
  if(versionadoActivo(rel.split("/")[0]))throw new Error("No se guardan rutas sueltas de un proyecto versionado.");
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/${rel}`, {
    method: "POST",
    headers: cabeceras(key, { "x-upsert": "true", "content-type": "application/octet-stream" }),
    body: new Uint8Array(readFileSync(join(carpeta(), rel))),
  });
  if (!r.ok) throw new Error(`No se pudo subir ${rel}: ${r.status}`);
}

/** Sube el proyecto y borra en la nube lo que ya no existe en local (por ejemplo, una solicitud archivada). */
export async function espejarProyecto(id: string, f: typeof fetch = fetch): Promise<{ subidos: number; borrados: number }> {
  if(versionadoActivo(id))throw new Error("Usa una operación aislada para guardar cambios versionados.");
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const base = join(carpeta(), id);
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
  if(versionadoActivo(id)){if(rel==="vivo.json"){const v=await vivoVersionado(id,f);return v?JSON.stringify(v):undefined;}const d=await leerArchivoVersionado(id,rel,f);if(d){const t=d.bytes?.toString("utf8");return rel==="estado.json"&&t?estadoConCola(id,t,f):t;}}
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/${id}/${rel}`, { headers: cabeceras(key), cache: "no-store" } as RequestInit);
  if (r.status === 404 || r.status === 400) return undefined;
  if (!r.ok) throw new Error(`No se pudo leer ${id}/${rel}: ${r.status}`);
  return r.text();
}

/** Borra un proyecto entero de la nube (solo cuando Jay o Luna lo piden con confirmación). */
export async function borrarRemoto(id: string, f: typeof fetch = fetch): Promise<number> {
  if(versionadoActivo(id))throw new Error("El borrado definitivo no está habilitado en el piloto versionado. No se borró ningún archivo.");
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

// ---- Subida directa (sistema/35) ----
// Vercel corta los pedidos a ~4,5 MB. Para archivos grandes, el navegador sube directo a la nube privada
// con una URL firmada de un solo uso (en _subidas/), y la acción del estudio la recoge después.

/** Clave de una subida: «<uuid>/<nombre-seguro>». */
const claveSegura = (clave: string) => {
  if (!/^[a-f0-9-]{36}\/[a-z0-9][a-z0-9._-]{0,90}$/.test(clave)) throw new Error("Subida no válida.");
  return clave;
};

/** URL firmada para que el navegador suba un archivo a _subidas/<clave> (vale unas 2 horas, una vez). */
export async function firmarSubida(clave: string, f: typeof fetch = fetch): Promise<string> {
  claveSegura(clave);
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/upload/sign/${bucket}/_subidas/${clave}`, { method: "POST", headers: cabeceras(key, { "content-type": "application/json" }), body: "{}" });
  if (!r.ok) throw new Error(`No se pudo preparar la subida: ${r.status} ${(await r.text()).slice(0, 120)}`);
  const { url: ruta } = (await r.json()) as { url: string };
  return `${url}/storage/v1${ruta.startsWith("/") ? "" : "/"}${ruta}`;
}

/** Recoge una subida: devuelve sus bytes y la borra de _subidas/. */
export async function recogerSubida(clave: string, f: typeof fetch = fetch): Promise<{ nombre: string; datos: Buffer }> {
  claveSegura(clave);
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/_subidas/${clave}`, { headers: cabeceras(key), cache: "no-store" } as RequestInit);
  if (!r.ok) throw new Error(`No llegó el archivo ${clave.split("/")[1]} (${r.status}). Vuelve a subirlo.`);
  const datos = Buffer.from(await r.arrayBuffer());
  if(process.env.ANONYMO_ALMACEN_VERSIONADO!=="1")await f(`${url}/storage/v1/object/${bucket}`, { method: "DELETE", headers: cabeceras(key, { "content-type": "application/json" }), body: JSON.stringify({ prefixes: [`_subidas/${clave}`] }) }).catch(() => {});
  return { nombre: clave.split("/")[1], datos };
}

/** Borra las subidas que nadie recogió en un día (formularios que no se mandaron). */
export async function limpiarSubidas(f: typeof fetch = fetch): Promise<number> {
  const { url, key, bucket } = cfg();
  const lista = async (prefix: string) => {
    const r = await f(`${url}/storage/v1/object/list/${bucket}`, { method: "POST", headers: cabeceras(key, { "content-type": "application/json" }), body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
    return r.ok ? ((await r.json()) as { name: string; id: string | null; created_at?: string }[]) : [];
  };
  const viejo = Date.now() - 24 * 3600 * 1000;
  const borrar: string[] = [];
  for (const sub of (await lista("_subidas")).filter((x) => x.id === null))
    for (const a of await lista(`_subidas/${sub.name}`))
      if (a.id && a.created_at && Date.parse(a.created_at) < viejo) borrar.push(`_subidas/${sub.name}/${a.name}`);
  if (borrar.length) await f(`${url}/storage/v1/object/${bucket}`, { method: "DELETE", headers: cabeceras(key, { "content-type": "application/json" }), body: JSON.stringify({ prefixes: borrar }) });
  return borrar.length;
}

/**
 * Sube solo lo que cambió desde `desde` (ms), sin borrar nada en la nube (sistema/36).
 * Lo usan las vueltas de trabajo: si mientras tanto alguien subió un archivo, no se pierde.
 */
export async function subirCambiados(id: string, desde: number, f: typeof fetch = fetch): Promise<number> {
  if(versionadoActivo(id))throw new Error("El guardado por hora no está habilitado en modo versionado.");
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const base = join(carpeta(), id);
  if (!existsSync(base)) return 0;
  let n = 0;
  for (const ruta of archivosLocales(base)) {
    if (statSync(ruta).mtimeMs < desde) continue;
    const destino = `${id}/${relative(base, ruta).split("\\").join("/")}`;
    const r = await f(`${url}/storage/v1/object/${bucket}/${destino}`, {
      method: "POST",
      headers: cabeceras(key, { "x-upsert": "true", "content-type": "application/octet-stream" }),
      body: new Uint8Array(readFileSync(ruta)),
    });
    if (!r.ok) throw new Error(`No se pudo subir ${destino}: ${r.status}`);
    n++;
  }
  return n;
}

/**
 * Como espejarProyecto, pero sube solo lo que cambió desde `desde` (sistema/39): una acción que toca un archivo
 * no vuelve a subir todas las fotos del proyecto. Lo que ya no existe en local se borra en la nube.
 */
export async function espejarCambios(id: string, desde: number, f: typeof fetch = fetch): Promise<{ subidos: number; borrados: number }> {
  if(versionadoActivo(id))throw new Error("El espejo por hora no está habilitado en modo versionado.");
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const base = join(carpeta(), id);
  if (!existsSync(base)) return { subidos: 0, borrados: 0 };
  const locales = new Set(archivosLocales(base).map((r) => `${id}/${relative(base, r).split("\\").join("/")}`));
  if (!locales.size) return { subidos: 0, borrados: 0 };
  const subidos = await subirCambiados(id, desde, f);
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

/** Lee un archivo de la nube como bytes, sin bajar el proyecto (sistema/42: la vista previa de la web). */
export async function leerRemotoBytes(id: string, rel: string, f: typeof fetch = fetch): Promise<Uint8Array | undefined> {
  if(versionadoActivo(id)){const d=await leerArchivoVersionado(id,rel,f);if(d)return d.bytes;}
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const r = await f(`${url}/storage/v1/object/${bucket}/${id}/${rel.split("/").map(encodeURIComponent).join("/")}`, { headers: cabeceras(key), cache: "no-store" } as RequestInit);
  if (r.status === 404 || r.status === 400) return undefined;
  if (!r.ok) throw new Error(`No se pudo leer ${id}/${rel}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/**
 * Huella del proyecto en disco (sistema/43): ruta → hash del contenido. Sirve para saber qué cambió una acción
 * sin depender de la hora de los archivos (en Vercel la hora del disco no es fina y se perdían cambios rápidos).
 */
export type Huella = Map<string, string>;

export function huellaProyecto(id: string): Huella {
  idSeguro(id);
  const base = join(carpeta(), id);
  const h: Huella = new Map();
  if (!existsSync(base)) return h;
  for (const ruta of archivosLocales(base)) h.set(`${id}/${relative(base, ruta).split("\\").join("/")}`, createHash("sha1").update(readFileSync(ruta)).digest("hex"));
  return h;
}

/** Sube lo nuevo o cambiado respecto de la huella `antes` y, con `espejo`, borra en la nube lo que ya no está. */
export async function subirDistintos(id: string, antes: Huella, espejo = true, f: typeof fetch = fetch): Promise<{ subidos: number; borrados: number }> {
  if(versionadoActivo(id))return publicarVersionado(id,antes,espejo,f);
  idSeguro(id);
  const { url, key, bucket } = cfg();
  const ahora = huellaProyecto(id);
  if (!ahora.size) return { subidos: 0, borrados: 0 };
  let subidos = 0;
  for (const [rel, hash] of ahora) {
    if (antes.get(rel) === hash) continue;
    const r = await f(`${url}/storage/v1/object/${bucket}/${rel}`, {
      method: "POST",
      headers: cabeceras(key, { "x-upsert": "true", "content-type": "application/octet-stream" }),
      body: new Uint8Array(readFileSync(join(carpeta(), rel))),
    });
    if (!r.ok) throw new Error(`No se pudo subir ${rel}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    subidos++;
  }
  let borrados = 0;
  if (espejo) {
    // Solo se borra lo que existía al empezar y ya no está (lo que otro subió mientras tanto se respeta).
    const sobran = [...antes.keys()].filter((r) => !ahora.has(r));
    if (sobran.length) {
      const r = await f(`${url}/storage/v1/object/${bucket}`, { method: "DELETE", headers: cabeceras(key, { "content-type": "application/json" }), body: JSON.stringify({ prefixes: sobran }) });
      if (!r.ok) throw new Error(`No se pudo limpiar ${id} en la nube: ${r.status}`);
      borrados = sobran.length;
    }
  }
  return { subidos, borrados };
}

/** Importación explícita: solo con el proyecto detenido y la carpeta antigua estable. No elimina el origen. */
export async function importarProyectoVersionado(id:string,f:typeof fetch=fetch){
 if(!versionadoActivo(id))throw new Error('El proyecto no está incluido en el piloto versionado.');
 const temporal=mkdtempSync(join(tmpdir(),'anonymo-importacion-'));let conservar=false;
 try{return await enPublicacion(()=>enCarpeta(temporal,async()=>{
  if(await indiceActual(id,f))throw new Error('Este proyecto ya tiene una revisión versionada.');
  await bajarProyecto(id,f,true);const base=join(carpeta(),id),estado=JSON.parse(readFileSync(join(base,'estado.json'),'utf8'));
  if(estado.estado==='en-curso')throw new Error('Pausa el proyecto y espera a que terminen las vueltas antiguas antes de importar.');
  const vivo=existsSync(join(base,'vivo.json'))?JSON.parse(readFileSync(join(base,'vivo.json'),'utf8')):undefined;
  if(vivo&&!vivo.fin&&Date.now()-Date.parse(vivo.latido)<90000)throw new Error('Todavía hay una vuelta antigua con señal reciente.');
  const rutas=await listarRemoto(id,f),locales=archivosLocales(base).map(p=>id+'/'+relative(base,p).split('\\').join('/'));
  if(JSON.stringify([...rutas].sort())!==JSON.stringify(locales.sort()))throw new Error('La carpeta cambió durante la importación. No se publicó.');
  for(const ruta of rutas){const b=await leerRemotoBytes(id,ruta.slice(id.length+1),f);if(!b||!Buffer.from(b).equals(readFileSync(join(base,ruta.slice(id.length+1)))))throw new Error('Un archivo cambió durante la importación. No se publicó.');}
  try{return await publicarVersionado(id,new Map(),false,f,true);}catch(e){conservar=hayPublicacionSinConfirmar();throw e;}
 }));}finally{if(!conservar)rmSync(temporal,{recursive:true,force:true});}
}
