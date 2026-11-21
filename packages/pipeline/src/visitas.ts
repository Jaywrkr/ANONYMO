// El informe mensual de la web en vivo (sistema/99): visitas, de dónde llegan y cuántos tocaron WhatsApp o llamar.
// Sin cookies ni datos de la persona: la web avisa una vez por visita y por clic, y aquí solo se suman números por día.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "./almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "./nube.ts";

export type EventoVisita = "visita" | "whatsapp" | "llamada" | "pregunta";
export type OrigenVisita = "google" | "instagram" | "facebook" | "tiktok" | "directo" | "otro";
export interface DiaVisitas { visita: number; whatsapp: number; llamada: number; pregunta: number }
export interface SinRespuesta { q: string; dia: string; ia?: boolean }
export interface MesVisitas {
  dias: Record<string, DiaVisitas>; paginas: Record<string, number>; origen: Partial<Record<OrigenVisita, number>>;
  /** Lo que le preguntaron al asistente y no tenía escrito (sistema/100): el cliente lo convierte en respuesta. */
  sinRespuesta?: SinRespuesta[];
  /** Respuestas con IA del mes (plan Pro), para el tope. */
  ia?: number;
  actualizado: string;
}

const ZONA = "America/Guayaquil";
/** «2026-11-21» en hora de Ecuador. */
export const diaDe = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const mesDe = (d = new Date()) => diaDe(d).slice(0, 7);

/** De dónde llegó, por la dirección de la página anterior. */
export function origenDe(referente: string | undefined, propio?: string): OrigenVisita {
  let h = "";
  try { h = referente ? new URL(referente).hostname.replace(/^www\./, "") : ""; } catch { return "otro"; }
  if (!h || (propio && h === propio)) return "directo";
  if (/(^|\.)google\./.test(h)) return "google";
  if (/instagram\.com$|^l\.instagram\.com$/.test(h)) return "instagram";
  if (/facebook\.com$|fb\.me$|^l\.facebook\.com$/.test(h)) return "facebook";
  if (/tiktok\.com$/.test(h)) return "tiktok";
  return "otro";
}

/** Los robots no cuentan como visitas. */
export const esRobot = (agente: string | null | undefined) => !agente || /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|facebookexternalhit|whatsapp|curl|wget|python|node/i.test(agente);

const rel = (id: string, mes: string) => `_visitas/${id}/${mes}.json`;
const local = (id: string, mes: string) => join(carpeta(), "_visitas", id, `${mes}.json`);
const vacio = (): MesVisitas => ({ dias: {}, paginas: {}, origen: {}, actualizado: "" });

export async function leerVisitas(id: string, mes: string): Promise<MesVisitas> {
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/.test(id) || !/^\d{4}-\d{2}$/.test(mes)) return vacio();
  let t: string | undefined;
  try {
    if (nubeActiva()) { const b = await leerSuelto(rel(id, mes)); t = b ? Buffer.from(b).toString("utf8") : undefined; }
    else if (existsSync(local(id, mes))) t = readFileSync(local(id, mes), "utf8");
  } catch { return vacio(); }
  const m = t ? (JSON.parse(t) as MesVisitas) : undefined;
  return { ...vacio(), ...m };
}

async function guardar(id: string, mes: string, m: MesVisitas) {
  m.actualizado = new Date().toISOString();
  const json = JSON.stringify(m);
  if (nubeActiva()) return subirSuelto(rel(id, mes), new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), "_visitas", id), { recursive: true });
  writeFileSync(`${local(id, mes)}.tmp`, json);
  renameSync(`${local(id, mes)}.tmp`, local(id, mes));
}

/** Suma un evento del día. Lee y escribe el mes entero y, si otro anotó en el medio, vuelve a intentar (como el medidor de gasto). */
// En un mismo servidor las anotaciones de una web van en fila: así dos visitas a la vez nunca se pisan.
const filas = new Map<string, Promise<unknown>>();
export function registrarVisita(id: string, e: { evento: EventoVisita; pagina?: string; origen?: OrigenVisita }, ahora = new Date()): Promise<MesVisitas> {
  return cambiarMes(id, ahora, (m) => sumar(m, e, ahora));
}

/** Cambia el mes de una web en fila (ver arriba). Si `fn` devuelve undefined, no guarda nada. */
export function cambiarMes(id: string, ahora: Date, fn: (m: MesVisitas) => MesVisitas | undefined): Promise<MesVisitas> {
  const clave = `${id}:${mesDe(ahora)}`;
  const r = (filas.get(clave) ?? Promise.resolve()).catch(() => undefined).then(() => anotar(id, ahora, fn));
  filas.set(clave, r);
  void r.finally(() => { if (filas.get(clave) === r) filas.delete(clave); }).catch(() => undefined);
  return r;
}

async function anotar(id: string, ahora: Date, fn: (m: MesVisitas) => MesVisitas | undefined) {
  const mes = mesDe(ahora);
  for (let i = 0; ; i++) {
    const antes = JSON.stringify(await leerVisitas(id, mes));
    const m = fn(JSON.parse(antes) as MesVisitas);
    if (!m) return JSON.parse(antes) as MesVisitas;
    if (i < 4 && JSON.stringify(await leerVisitas(id, mes)) !== antes) { await new Promise((ok) => setTimeout(ok, 30 + Math.random() * 120)); continue; }
    await guardar(id, mes, m);
    return m;
  }
}

function sumar(m: MesVisitas, e: { evento: EventoVisita; pagina?: string; origen?: OrigenVisita }, ahora: Date) {
  const dia = diaDe(ahora);
  const d = (m.dias[dia] ??= { visita: 0, whatsapp: 0, llamada: 0, pregunta: 0 });
  d[e.evento]++;
  if (e.evento === "visita") {
    if (e.pagina && /^[a-zA-Z0-9._\-/]{1,80}\.html$/.test(e.pagina) && (e.pagina in m.paginas || Object.keys(m.paginas).length < 40)) m.paginas[e.pagina] = (m.paginas[e.pagina] ?? 0) + 1;
    const o = e.origen ?? "directo";
    m.origen[o] = (m.origen[o] ?? 0) + 1;
  }
  return m;
}

export const NOMBRE_ORIGEN: Record<OrigenVisita, string> = { google: "Google", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", directo: "Directo o un enlace guardado", otro: "Otras webs" };

/** Los totales del mes, el mes anterior para comparar y los días con su número. */
export function resumenVisitas(m: MesVisitas, anterior?: MesVisitas) {
  const suma = (x: MesVisitas) => Object.values(x.dias).reduce((a, d) => ({ visita: a.visita + d.visita, whatsapp: a.whatsapp + d.whatsapp, llamada: a.llamada + d.llamada, pregunta: a.pregunta + d.pregunta }), { visita: 0, whatsapp: 0, llamada: 0, pregunta: 0 });
  const t = suma(m);
  const a = anterior ? suma(anterior) : undefined;
  const contactos = t.whatsapp + t.llamada;
  return {
    ...t,
    contactos,
    /** De cada 100 visitas, cuántas escribieron o llamaron. */
    conversion: t.visita ? Math.round((contactos / t.visita) * 1000) / 10 : 0,
    antes: a,
    origen: (Object.entries(m.origen) as [OrigenVisita, number][]).sort((x, y) => y[1] - x[1]),
    paginas: Object.entries(m.paginas).sort((x, y) => y[1] - x[1]),
    mejorDia: Object.entries(m.dias).sort((x, y) => y[1].visita - x[1].visita)[0]?.[0],
  };
}
export type ResumenVisitas = ReturnType<typeof resumenVisitas>;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreDelMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
export function mesAnterior(mes: string) { const [a, m] = mes.split("-").map(Number) as [number, number]; return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`; }

/** El informe en texto, para mandárselo al cliente por WhatsApp o correo. Sin adornos: los números y qué significan. */
export function textoInforme(negocio: string, mes: string, r: ResumenVisitas) {
  const cambio = (ahora: number, antes?: number) => (antes === undefined || !antes ? "" : ahora >= antes ? ` (${Math.round(((ahora - antes) / antes) * 100)} % más que el mes anterior)` : ` (${Math.round(((antes - ahora) / antes) * 100)} % menos que el mes anterior)`);
  const lineas = [
    `Tu web en ${nombreDelMes(mes)} · ${negocio}`,
    "",
    `Visitas: ${r.visita}${cambio(r.visita, r.antes?.visita)}`,
    `Te escribieron por WhatsApp: ${r.whatsapp}${cambio(r.whatsapp, r.antes?.whatsapp)}`,
    ...(r.llamada ? [`Te llamaron desde la web: ${r.llamada}`] : []),
    ...(r.pregunta ? [`Preguntas al asistente: ${r.pregunta}`] : []),
    ...(r.visita ? [`De cada 100 visitas, ${r.conversion} te contactaron.`] : []),
    ...(r.origen.length ? ["", `De dónde llegaron: ${r.origen.slice(0, 3).map(([o, n]) => `${NOMBRE_ORIGEN[o]} ${n}`).join(", ")}.`] : []),
  ];
  return lineas.join("\n");
}

/** Lo que escribió un visitante, sin números largos (teléfonos, cédulas) y corto. */
export const limpiarPregunta = (t: string) => t.replace(/\s+/g, " ").replace(/[\d][\d\s.-]{5,}\d/g, "…").trim().slice(0, 160);

/** Anota una pregunta que el asistente no tenía escrita. Hasta 60 por mes; las repetidas no se suman. */
export function anotarSinRespuesta(id: string, q: string, ia = false, ahora = new Date()) {
  const texto = limpiarPregunta(q);
  if (texto.length < 3) return Promise.resolve(undefined);
  return cambiarMes(id, ahora, (m) => {
    const l = m.sinRespuesta ?? [];
    if (l.length >= 60 || l.some((x) => x.q.toLowerCase() === texto.toLowerCase())) return;
    m.sinRespuesta = [...l, { q: texto, dia: diaDe(ahora), ...(ia ? { ia: true } : {}) }];
    return m;
  });
}
