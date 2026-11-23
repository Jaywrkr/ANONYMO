// El mes de contenido (sistema/96): Faro arma el calendario de un cliente con lo que se sabe de él.
// Las fechas las pone el sistema según cada cuánto publica; Faro llena cada fecha con su serie, formato, idea, texto
// y qué se ve. Jay o Luna aprueban pieza por pieza, piden cambios o la corrigen a mano, y los reels pasan a guion.
// Vive en `_contenido/lista/meses.json` (nube privada o proyectos/). Nunca se publica nada solo.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { pedirEstructura } from "../ia.ts";

export type FormatoPieza = "reel" | "carrusel" | "post" | "historia";
export const FORMATOS: Record<FormatoPieza, string> = { reel: "Reel", carrusel: "Carrusel", post: "Post", historia: "Historia" };
export type EstadoPieza = "propuesta" | "aprobada" | "cambio";
export const ESTADOS_PIEZA: Record<EstadoPieza, string> = { propuesta: "Por revisar", aprobada: "Aprobada", cambio: "Pidieron un cambio" };

export interface Pieza {
  id: string;
  /** AAAA-MM-DD */
  fecha: string;
  serie: string;
  formato: FormatoPieza;
  /** De qué trata, en una frase. */
  idea: string;
  /** El texto que acompaña la publicación. */
  texto: string;
  /** Qué se ve: la imagen, las láminas o las tomas. */
  visual: string;
  estado: EstadoPieza;
  nota?: string;
  /** El guion de Faro, si es un reel y ya se escribió. */
  guion?: string;
}

export interface PasoMes { cuando: string; quien: string; que: string }

export interface MesContenido {
  id: string;
  /** La ficha del cliente. */
  cliente: string;
  nombre: string;
  /** AAAA-MM */
  mes: string;
  canales: string;
  frecuencia: string;
  pedido?: string;
  series: { nombre: string; para: string }[];
  piezas: Pieza[];
  historia: PasoMes[];
  creado: string;
  actualizado: string;
}

interface ListaMeses { actualizado: string; meses: Record<string, MesContenido> }

const REL = "_contenido/lista/meses.json";
const local = () => join(carpeta(), REL);
export const idMesValido = (id: string) => /^c-[a-z0-9][a-z0-9-]{0,60}-\d{4}-\d{2}$/.test(id);
export const idMes = (cliente: string, mes: string) => `c-${cliente}-${mes}`;

async function leer(): Promise<ListaMeses> {
  let texto: string | undefined;
  if (nubeActiva()) { const b = await leerSuelto(REL); texto = b ? Buffer.from(b).toString("utf8") : undefined; }
  else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  const l = texto ? (JSON.parse(texto) as ListaMeses) : undefined;
  return { actualizado: l?.actualizado ?? "", meses: l?.meses ?? {} };
}

async function guardar(l: ListaMeses) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), "_contenido", "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

export async function listarMeses(): Promise<MesContenido[]> {
  return Object.values((await leer()).meses).sort((a, b) => b.mes.localeCompare(a.mes) || b.actualizado.localeCompare(a.actualizado));
}
export async function leerMesContenido(id: string) {
  return idMesValido(id) ? (await leer()).meses[id] : undefined;
}

// — Fechas: las pone el sistema, no la IA —

const NUMEROS: Record<string, number> = { una: 1, un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7 };
/** Cuántas veces por semana, de lo que dice la ficha («3 veces por semana», «todos los días», «dos a la semana»). Sin dato, 3. */
export function vecesPorSemana(frecuencia: string | undefined): number {
  const t = (frecuencia ?? "").toLowerCase();
  if (/diari|todos los d[ií]as|cada d[ií]a/.test(t)) return 7;
  const n = Number(t.match(/\d+/)?.[0] ?? NUMEROS[Object.keys(NUMEROS).find((k) => new RegExp(`\\b${k}\\b`).test(t)) ?? ""] ?? NaN);
  if (!Number.isFinite(n) || n <= 0) return 3;
  if (/mes/.test(t)) return Math.max(1, Math.min(7, Math.round(n / 4)));
  return Math.max(1, Math.min(7, n));
}

/** Los días de la semana en que se publica (0 = lunes), repartidos para no amontonar. */
export const DIAS_PUBLICACION: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${a}`; };

/** Las fechas del mes en que se publica. */
export function fechasDelMes(mes: string, frecuencia: string | undefined): string[] {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const dias = DIAS_PUBLICACION[vecesPorSemana(frecuencia)]!;
  const out: string[] = [];
  for (let d = 1; d <= new Date(Date.UTC(a, m, 0)).getUTCDate(); d++) {
    const dia = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
    if (dias.includes(dia)) out.push(`${mes}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

const hoyCuenca = (ahora: Date) => new Date(ahora.toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
/** El mes que se planifica si no se dice otro: el siguiente. */
export function mesPorDefecto(ahora = new Date()): string {
  const h = hoyCuenca(ahora);
  const s = new Date(h.getFullYear(), h.getMonth() + 1, 1);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`;
}
/** El mes nombrado en un texto («diciembre», «enero 2027»): el próximo que venga. */
export function mesDeTexto(texto: string, ahora = new Date()): string | undefined {
  const t = texto.toLowerCase();
  const i = MESES.findIndex((m) => t.includes(m));
  if (i < 0) return undefined;
  const h = hoyCuenca(ahora);
  const anio = Number(t.match(/20\d{2}/)?.[0]) || (i < h.getMonth() ? h.getFullYear() + 1 : h.getFullYear());
  return `${anio}-${String(i + 1).padStart(2, "0")}`;
}

// — Faro arma el mes —

export const SISTEMA_MES = `Faro arma el mes de contenido de un cliente de Unmake. Piensa en series: pocos temas que se repiten y se reconocen.
Respondes siempre con la herramienta «armar_mes».

Reglas:
- Usa solo lo que se sabe del cliente. No inventes precios, promociones, premios, nombres ni datos de su negocio. Si una pieza necesita un dato que no está, escríbela sin ese dato.
- De 3 a 5 series. Cada pieza pertenece a una serie y las series se alternan.
- Una pieza por cada fecha de la lista, en el mismo orden. «n» es el número de la fecha.
- Los formatos se reparten: reels para lo que se muestra o se explica en movimiento, carruseles para enseñar algo en pasos, posts para una idea o una frase, historias para lo del día. En TikTok y YouTube, solo reels.
- «idea»: de qué trata, en una frase. «texto»: lo que acompaña la publicación, en el tono del cliente, con un cierre que diga qué hacer (escribir, guardar, visitar), sin sonar a anuncio. «visual»: qué se ve, para que Luna lo produzca (tomas, láminas o la imagen).
- Español de Ecuador, directo, sin palabras rebuscadas ni frases de motivación vacías. Sin emojis de relleno.`;

const HERRAMIENTA_MES = {
  nombre: "armar_mes",
  descripcion: "El mes de contenido: las series y una pieza por fecha.",
  esquema: {
    type: "object",
    properties: {
      series: { type: "array", items: { type: "object", properties: { nombre: { type: "string" }, para: { type: "string", description: "Para qué sirve esta serie" } }, required: ["nombre", "para"] } },
      piezas: {
        type: "array",
        items: {
          type: "object",
          properties: { n: { type: "integer" }, serie: { type: "string" }, formato: { type: "string", enum: ["reel", "carrusel", "post", "historia"] }, idea: { type: "string" }, texto: { type: "string" }, visual: { type: "string" } },
          required: ["n", "serie", "formato", "idea", "texto", "visual"],
        },
      },
    },
    required: ["series", "piezas"],
  },
};

const corto = (x: unknown, n: number) => String(x ?? "").trim().slice(0, n);

/** Lo que devuelve la IA, limpio, con límites y una pieza por fecha. Si faltan muchas, no sirve. */
export function leerMesIA(x: unknown, fechas: string[]) {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const series = (Array.isArray(r.series) ? r.series : []).slice(0, 6).map((s) => ({ nombre: corto((s as { nombre?: unknown })?.nombre, 60), para: corto((s as { para?: unknown })?.para, 200) })).filter((s) => s.nombre);
  const porN = new Map<number, Record<string, unknown>>();
  for (const p of Array.isArray(r.piezas) ? r.piezas : []) { const n = Number((p as { n?: unknown })?.n); if (Number.isInteger(n) && n >= 1 && n <= fechas.length && !porN.has(n)) porN.set(n, p as Record<string, unknown>); }
  const piezas: Omit<Pieza, "id">[] = [];
  fechas.forEach((fecha, i) => {
    const p = porN.get(i + 1);
    if (!p) return;
    const formato = (["reel", "carrusel", "post", "historia"] as const).find((f) => f === p.formato) ?? "post";
    const idea = corto(p.idea, 300), texto = corto(p.texto, 2200);
    if (idea && texto) piezas.push({ fecha, serie: corto(p.serie, 60) || series[0]?.nombre || "General", formato, idea, texto, visual: corto(p.visual, 600), estado: "propuesta" });
  });
  if (!series.length || piezas.length < Math.ceil(fechas.length * 0.8)) throw new Error("Faro no devolvió el mes completo. Vuelve a pedirlo.");
  return { series, piezas };
}

/** Faro arma el mes y queda guardado para revisar. Un mes por cliente: si ya existe, no se vuelve a gastar. */
export async function armarMes(o: { cliente: string; nombre: string; mes: string; saber: string; canales: string; frecuencia: string; pedido?: string; por: string }): Promise<MesContenido> {
  if (!/^\d{4}-\d{2}$/.test(o.mes)) throw new Error("No entendí el mes.");
  const id = idMes(o.cliente, o.mes);
  if ((await leer()).meses[id]) throw new Error(`Ya hay un mes de contenido para ${o.nombre} en ${nombreMes(o.mes)}. Ábrelo desde Contenido.`);
  const fechas = fechasDelMes(o.mes, o.frecuencia);
  const texto = [
    `## Cliente\n${o.nombre}`,
    `## Lo que sabemos del cliente (úsalo tal cual; no inventes nada más de su negocio)\n${o.saber.slice(0, 4000)}`,
    o.pedido?.trim() ? `## Lo que pidieron para este mes\n${o.pedido.trim().slice(0, 800)}` : "",
    `## Dónde publica\n${o.canales}`,
    `## Fechas (${fechas.length}, ${nombreMes(o.mes)})\n${fechas.map((f, i) => `${i + 1}. ${f} (${DIA[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7]})`).join("\n")}`,
  ].filter(Boolean).join("\n\n");
  let crudo: unknown;
  try {
    crudo = await pedirEstructura(SISTEMA_MES, texto, HERRAMIENTA_MES, 12000, { origen: "faro", tarea: "contenido" });
  } catch (e) {
    throw new Error(`Faro no pudo armar el mes: ${(e as Error).message}`);
  }
  if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Faro no puede armar el mes.");
  const { series, piezas } = leerMesIA(crudo, fechas);
  const ahora = new Date().toISOString();
  const mes: MesContenido = {
    id, cliente: o.cliente, nombre: o.nombre, mes: o.mes, canales: o.canales, frecuencia: o.frecuencia, pedido: o.pedido?.trim() || undefined, series,
    piezas: piezas.map((p, i) => ({ ...p, id: `p${String(i + 1).padStart(2, "0")}` })),
    historia: [
      { cuando: ahora, quien: o.por, que: `Pidió el mes de ${nombreMes(o.mes)}` },
      { cuando: ahora, quien: "faro", que: `Armó ${piezas.length} piezas en ${series.length} series${piezas.length < fechas.length ? ` (faltaron ${fechas.length - piezas.length})` : ""}` },
    ],
    creado: ahora, actualizado: ahora,
  };
  // Se vuelve a leer justo antes de guardar: si otro lo armó mientras tanto, gana el primero.
  const l = await leer();
  if (l.meses[id]) throw new Error(`Ya hay un mes de contenido para ${o.nombre} en ${nombreMes(o.mes)}.`);
  l.meses[id] = mes;
  await guardar(l);
  return mes;
}

export interface CambioPieza { estado?: EstadoPieza; idea?: string; texto?: string; visual?: string; nota?: string | null; guion?: string; formato?: FormatoPieza }

/** Aprobar, pedir un cambio o corregir una pieza. Lee lo último antes de guardar, para que Jay y Luna no se pisen. */
export async function cambiarPieza(mesId: string, piezaId: string, c: CambioPieza, por: string): Promise<MesContenido> {
  const l = await leer();
  const m = l.meses[mesId];
  if (!m) throw new Error("No encontramos ese mes de contenido.");
  const p = m.piezas.find((x) => x.id === piezaId);
  if (!p) throw new Error("No encontramos esa pieza.");
  const que: string[] = [];
  for (const k of ["idea", "texto", "visual"] as const) {
    if (c[k] === undefined) continue;
    const v = corto(c[k], k === "texto" ? 2200 : 600);
    if (!v) throw new Error("No puede quedar vacía: escribe algo o deja lo que estaba.");
    if (v !== p[k]) { p[k] = v; que.push(k); }
  }
  if (c.formato && c.formato !== p.formato && FORMATOS[c.formato]) { p.formato = c.formato; que.push("formato"); }
  if (c.guion) { p.guion = c.guion; que.push("guion"); }
  if (c.estado && c.estado !== p.estado) {
    if (c.estado === "cambio" && !corto(c.nota, 400)) throw new Error("Cuenta qué hay que cambiar.");
    p.estado = c.estado;
    que.push(ESTADOS_PIEZA[c.estado].toLowerCase());
  }
  if (c.nota !== undefined) p.nota = corto(c.nota, 400) || undefined;
  if (c.estado === "aprobada") delete p.nota;
  // Si se corrige a mano una pieza con cambio pedido, vuelve a quedar por revisar.
  if (!c.estado && p.estado === "cambio" && que.some((x) => ["idea", "texto", "visual"].includes(x))) p.estado = "propuesta";
  if (que.length) m.historia.push({ cuando: new Date().toISOString(), quien: por, que: `${p.fecha}: ${que.join(", ")}` });
  m.actualizado = new Date().toISOString();
  await guardar(l);
  return m;
}

/** Cuántas piezas hay en cada estado. */
export function resumenMes(m: Pick<MesContenido, "piezas">) {
  const r = { total: m.piezas.length, aprobadas: 0, cambios: 0, porRevisar: 0 };
  for (const p of m.piezas) { if (p.estado === "aprobada") r.aprobadas++; else if (p.estado === "cambio") r.cambios++; else r.porRevisar++; }
  return r;
}

/** El mes en texto, para mandárselo al cliente por WhatsApp o correo. Solo las piezas aprobadas. */
export function textoMesParaCliente(m: MesContenido) {
  const fecha = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return `${DIA[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()}`; };
  const aprobadas = m.piezas.filter((p) => p.estado === "aprobada");
  return [
    `Contenido de ${m.nombre} · ${nombreMes(m.mes)}`,
    `Series: ${m.series.map((s) => s.nombre).join(", ")}`,
    "",
    ...aprobadas.map((p) => `${fecha(p.fecha)} · ${FORMATOS[p.formato]} · ${p.serie}\n${p.idea}\n«${p.texto}»`),
  ].join("\n\n").replace(/\n\n\n+/g, "\n\n");
}
