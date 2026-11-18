// El estado del sistema (sistema/78): errores recientes, cuánto se usó Google hoy y el último respaldo.
// Lo lee la página «Estado del sistema». Vive en la nube privada (_estado/lista/estado.json), nunca en el repo.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { carpeta } from "./almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "./nube.ts";

export interface ErrorSistema { cuando: string; donde: string; que: string }
export interface EstadoSistema {
  errores: ErrorSistema[];
  /** Consultas a Google Maps del día (hora de Cuenca). */
  google: { dia: string; consultas: number };
  respaldo?: { cuando: string; ranura: string; archivos: number; faltaron: string[] };
}

const REL = "_estado/lista/estado.json";
const local = (rel: string) => join(carpeta(), rel);
export const diaCuenca = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });

async function leerTexto(rel: string): Promise<string | undefined> {
  if (nubeActiva()) {
    const b = await leerSuelto(rel);
    return b ? Buffer.from(b).toString("utf8") : undefined;
  }
  return existsSync(local(rel)) ? readFileSync(local(rel), "utf8") : undefined;
}

async function escribirTexto(rel: string, texto: string) {
  if (nubeActiva()) return subirSuelto(rel, new TextEncoder().encode(texto), "application/json");
  mkdirSync(dirname(local(rel)), { recursive: true });
  writeFileSync(`${local(rel)}.tmp`, texto);
  renameSync(`${local(rel)}.tmp`, local(rel));
}

export async function leerEstado(): Promise<EstadoSistema> {
  const t = await leerTexto(REL);
  const e = t ? (JSON.parse(t) as Partial<EstadoSistema>) : {};
  return { errores: e.errores ?? [], google: e.google ?? { dia: diaCuenca(), consultas: 0 }, respaldo: e.respaldo };
}

async function cambiarEstado(fn: (e: EstadoSistema) => void) {
  const e = await leerEstado();
  fn(e);
  await escribirTexto(REL, JSON.stringify(e, null, 1));
  return e;
}

/** Anota un error para la página de estado. Nunca lanza: anotar un error no debe causar otro. Guarda los 30 últimos. */
export async function anotarError(donde: string, que: string) {
  try {
    await cambiarEstado((e) => { e.errores = [{ cuando: new Date().toISOString(), donde, que: que.slice(0, 300) }, ...e.errores].slice(0, 30); });
  } catch { /* sin nube no hay dónde anotarlo */ }
}

/** Suma consultas a Google del día; al cambiar de día empieza en cero. */
export async function contarGoogle(n: number) {
  if (n <= 0) return;
  try {
    await cambiarEstado((e) => { const hoy = diaCuenca(); e.google = { dia: hoy, consultas: (e.google.dia === hoy ? e.google.consultas : 0) + n }; });
  } catch { /* el conteo es orientativo */ }
}

/** Lo que se respalda cada día: las listas que no son proyectos y que no se pueden rehacer. */
export const ARCHIVOS_RESPALDO: [string, string][] = [
  ["_prospectos/lista/lista.json", "prospectos.json"],
  ["_clientes/lista/fichas.json", "fichas.json"],
  ["_guiones/lista/guiones.json", "guiones.json"],
  ["_avisos/lista/celulares.json", "celulares.json"],
];

/** 14 ranuras que rotan por día: siempre hay copia de las últimas dos semanas y nunca hace falta borrar nada. */
export const ranuraRespaldo = (d = new Date()) => `dia-${String(Math.floor(Date.parse(`${diaCuenca(d)}T12:00:00Z`) / 86_400_000) % 14).padStart(2, "0")}`;

/** Copia las listas a _respaldos/<ranura>/. Devuelve qué copió y qué no existía todavía. */
export async function respaldar(d = new Date()) {
  const ranura = ranuraRespaldo(d);
  let archivos = 0;
  const faltaron: string[] = [];
  for (const [rel, nombre] of ARCHIVOS_RESPALDO) {
    const t = await leerTexto(rel);
    if (t === undefined) { faltaron.push(nombre); continue; }
    await escribirTexto(`_respaldos/${ranura}/${nombre}`, t);
    archivos++;
  }
  const respaldo = { cuando: d.toISOString(), ranura, archivos, faltaron };
  await cambiarEstado((e) => { e.respaldo = respaldo; });
  return respaldo;
}
