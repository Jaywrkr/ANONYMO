// Dónde viven los videos (sistema/62). En tu máquina: proyectos/_videos/<id>/. En línea: la misma ruta en la nube privada.
// Cada video tiene su trabajo.json (estado, transcripción, edición) y sus archivos (original y resultados).
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { carpeta } from "../almacen.ts";
import { bajarSuelto, carpetasEn, firmarLectura, firmarSubidaEn, leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { EDICION_INICIAL, type TrabajoVideo } from "./tipos.ts";

export const CARPETA_VIDEOS = "_videos";
/** Videos que se aceptan. */
export const TIPOS_VIDEO: Record<string, string> = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".m4v": "video/mp4", ".webm": "video/webm" };
/** Tope por video original (la nube de Supabase acepta hasta lo que diga su plan). */
export const MAX_VIDEO = Number(process.env.ANONYMO_VIDEO_MAX_MB ?? 500) * 1024 * 1024;

export const idVideoValido = (id: string) => /^v-[a-z0-9][a-z0-9-]{2,70}$/.test(id);
const exigirId = (id: string) => { if (!idVideoValido(id)) throw new Error("Video no válido."); return id; };
export const archivoValido = (a: string) => /^[a-z0-9][a-z0-9._-]{0,90}$/.test(a) && !a.includes("..");

export const dirVideo = (id: string) => join(carpeta(), CARPETA_VIDEOS, exigirId(id));
const rel = (id: string, archivo: string) => {
  if (!archivoValido(archivo)) throw new Error("Archivo no válido.");
  return `${CARPETA_VIDEOS}/${exigirId(id)}/${archivo}`;
};

/** Un id corto y legible: «v-reel-lanzamiento-3f9a». */
export function nuevoIdVideo(nombre: string) {
  const base = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "video";
  return `v-${base}-${randomBytes(2).toString("hex")}`;
}

/** Valida nombre y peso del video antes de aceptarlo. Devuelve la extensión. */
export function validarVideo(nombre: string, bytes: number) {
  const ext = extname(nombre).toLowerCase();
  if (!TIPOS_VIDEO[ext]) throw new Error(`Ese archivo no es un video que podamos editar. Se aceptan ${Object.keys(TIPOS_VIDEO).join(" ")}.`);
  if (!(bytes > 0)) throw new Error("El video está vacío.");
  if (bytes > MAX_VIDEO) throw new Error(`El video pesa más de ${Math.round(MAX_VIDEO / 1024 / 1024)} MB.`);
  return ext;
}

export function trabajoNuevo(id: string, nombre: string, autor: string, ext: string, bytes: number, cliente?: string): TrabajoVideo {
  const ahora = new Date().toISOString();
  return { id, nombre: nombre.slice(0, 120), cliente: cliente?.slice(0, 80) || undefined, creado: ahora, actualizado: ahora, autor, estado: "subiendo", original: `original${ext}`, bytes, edicion: structuredClone(EDICION_INICIAL), resultados: [] };
}

async function leerJson<T>(id: string, archivo: string): Promise<T | undefined> {
  if (nubeActiva()) {
    const b = await leerSuelto(rel(id, archivo));
    return b ? (JSON.parse(Buffer.from(b).toString("utf8")) as T) : undefined;
  }
  const r = rutaLocal(id, archivo);
  return existsSync(r) ? (JSON.parse(readFileSync(r, "utf8")) as T) : undefined;
}

async function guardarJson(id: string, archivo: string, x: unknown) {
  const json = JSON.stringify(x, null, 2);
  if (nubeActiva()) return subirSuelto(rel(id, archivo), new TextEncoder().encode(json), "application/json");
  mkdirSync(dirVideo(id), { recursive: true });
  const r = rutaLocal(id, archivo);
  writeFileSync(`${r}.tmp`, json);
  renameSync(`${r}.tmp`, r);
}

export const leerVideo = (id: string) => leerJson<TrabajoVideo>(exigirId(id), "trabajo.json");

export async function guardarVideo(t: TrabajoVideo) {
  t.actualizado = new Date().toISOString();
  await guardarJson(t.id, "trabajo.json", t);
}

/** Lee lo último guardado, aplica el cambio y lo guarda (para no pisar lo que otro cambió mientras tanto). */
export async function cambiarVideo(id: string, fn: (t: TrabajoVideo) => void | Promise<void>) {
  const t = await leerVideo(id);
  if (!t) throw new Error("No encontramos ese video.");
  await fn(t);
  await guardarVideo(t);
  return t;
}

/** El avance de un paso pesado va aparte: así guardarlo seguido no pisa la edición que Luna está cambiando. */
export interface AvanceVideo { avance: number; texto: string; cuando: string }
export const leerAvance = (id: string) => leerJson<AvanceVideo>(id, "avance.json").catch(() => undefined);
export const guardarAvance = (id: string, a: Omit<AvanceVideo, "cuando">) => guardarJson(id, "avance.json", { ...a, cuando: new Date().toISOString() });

/** Todos los videos, el más reciente primero. */
export async function listarVideos(): Promise<TrabajoVideo[]> {
  let ids: string[] = [];
  if (nubeActiva()) ids = await carpetasEn(CARPETA_VIDEOS).catch(() => []);
  else { const d = join(carpeta(), CARPETA_VIDEOS); ids = existsSync(d) ? readdirSync(d) : []; }
  const todos = await Promise.all(ids.filter(idVideoValido).map((id) => leerVideo(id).catch(() => undefined)));
  return todos.filter((x): x is TrabajoVideo => !!x).sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

/** Ruta del archivo en el disco de esta máquina (solo sin nube). */
export function rutaLocal(id: string, archivo: string) {
  rel(id, archivo);
  return join(dirVideo(id), archivo);
}

/** Dónde subir el original desde el navegador. En tu máquina: undefined (sube por el estudio). */
export async function urlSubida(id: string, archivo: string) {
  return nubeActiva() ? firmarSubidaEn(rel(id, archivo)) : undefined;
}

/** URL para que el navegador lea el archivo directo de la nube (undefined en tu máquina). */
export async function urlLectura(id: string, archivo: string, segundos = 3 * 3600) {
  return nubeActiva() ? firmarLectura(rel(id, archivo), segundos) : undefined;
}

/** Deja el archivo en el disco de esta máquina y devuelve su ruta (en línea lo baja a `destino`). */
export async function traerArchivo(id: string, archivo: string, destino: string) {
  if (!nubeActiva()) {
    const r = rutaLocal(id, archivo);
    if (!existsSync(r)) throw new Error("No encontramos el video original. Vuelve a subirlo.");
    return r;
  }
  await bajarSuelto(rel(id, archivo), destino);
  return destino;
}

/** Guarda un archivo hecho en esta máquina junto al video. */
export async function guardarArchivoVideo(id: string, archivo: string, origen: string, tipo = "video/mp4") {
  if (nubeActiva()) return subirSuelto(rel(id, archivo), new Uint8Array(readFileSync(origen)), tipo);
  const d = rutaLocal(id, archivo);
  if (d !== origen) { mkdirSync(dirVideo(id), { recursive: true }); writeFileSync(d, readFileSync(origen)); }
}

/** Guarda bytes que llegaron por el estudio (solo en tu máquina; en línea suben directo a la nube). */
export function guardarLocal(id: string, archivo: string, datos: Uint8Array) {
  mkdirSync(dirVideo(id), { recursive: true });
  writeFileSync(rutaLocal(id, archivo), datos);
  return statSync(rutaLocal(id, archivo)).size;
}
