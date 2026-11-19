// El medidor de gasto en IA (sistema/91): cada llamada a la API queda anotada con quién la hizo, para qué, con qué
// modelo y cuánto costó. Con eso el estudio sabe cuánto va hoy, esta semana y este mes, y frena solo al llegar al tope.
// Vive en la nube privada (o en tu máquina): `_gasto/meses/AAAA-MM.json` y `_gasto/ajustes/topes.json`. Nunca en el repo.
// Los precios salen de la documentación oficial de Anthropic (revisada el 19 nov 2026). Si cambian, se cambian aquí.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { carpeta } from "./almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "./nube.ts";

export const CARPETA_GASTO = "_gasto";

/** USD por millón de tokens. `cacheL`: leer del caché. `cacheE`: guardar en caché (5 minutos). */
export interface Precio { entrada: number; salida: number; cacheL: number; cacheE: number }
const TABLA: [RegExp, string, Precio][] = [
  [/fable-5-2|mythos-5-2/, "Fable 5.2", { entrada: 8, salida: 40, cacheL: 0.2, cacheE: 10 }],
  [/opus-5-5/, "Opus 5.5", { entrada: 4, salida: 20, cacheL: 0.2, cacheE: 5 }],
  [/sonnet-5-5|sonnet-5(?!-)/, "Sonnet 5.5", { entrada: 2, salida: 10, cacheL: 0.1, cacheE: 2.5 }],
  [/haiku-5-5/, "Haiku 5.5", { entrada: 0.1, salida: 0.5, cacheL: 0.01, cacheE: 0.125 }],
];
/** Lo que se cobra si el modelo no está en la tabla: el precio de Sonnet 5.5, para no quedarse corto por mucho. */
const POR_DEFECTO: Precio = { entrada: 2, salida: 10, cacheL: 0.1, cacheE: 2.5 };
export const PRECIO_BUSQUEDA = Number(process.env.ANTHROPIC_PRECIO_BUSQUEDA ?? 0.01);

export function precioModelo(modelo: string): Precio & { nombre: string; conocido: boolean } {
  const f = TABLA.find(([re]) => re.test(modelo));
  return f ? { ...f[2], nombre: f[1], conocido: true } : { ...POR_DEFECTO, nombre: modelo || "modelo sin nombre", conocido: false };
}

export interface UsoApi { entrada: number; salida: number; cacheL?: number; cacheE?: number; busquedas?: number }
const m4 = (n: number) => Math.round(n * 10000) / 10000;
export function costoLlamada(modelo: string, u: UsoApi) {
  const p = precioModelo(modelo);
  return m4((u.entrada * p.entrada + u.salida * p.salida + (u.cacheL ?? 0) * p.cacheL + (u.cacheE ?? 0) * p.cacheE) / 1e6 + (u.busquedas ?? 0) * PRECIO_BUSQUEDA);
}

/** Una llamada anotada. `origen`: el agente o la parte del estudio que la hizo (atlas, juez, faro, corte…). */
export interface Llamada extends UsoApi { t: string; origen: string; tarea?: string; proyecto?: string; modelo: string; usd: number; auto?: boolean }
export interface MesGasto { llamadas: Llamada[]; avisados?: Record<string, number> }
export interface Topes {
  /** Tope de gasto por día y por mes, en USD. */
  diario: number; mensual: number;
  /** Lo que queda en la consola de Anthropic según Jay, y desde cuándo se descuenta. */
  saldo?: { usd: number; desde: string };
  /** Permiso para seguir hoy después del tope: lo da Jay o Luna desde «Gasto», solo vale ese día y solo para trabajo lanzado a mano. */
  extra?: { dia: string; usd: number; quien: string };
}
/** Topes de arranque: holgados estos primeros días. El de régimen normal que se propone es 1.5 por día y 40 por mes. */
export const TOPES_INICIALES: Topes = { diario: 8, mensual: 60 };
export const TOPE_MIN = 0.5, TOPE_MAX = 500;

const ZONA = "America/Guayaquil";
export const diaGasto = (t: Date | string = new Date()) => new Date(t).toLocaleDateString("en-CA", { timeZone: ZONA });
const mesDe = (dia: string) => dia.slice(0, 7);
const rutaMes = (mes: string) => `${CARPETA_GASTO}/meses/${mes}.json`;
const RUTA_TOPES = `${CARPETA_GASTO}/ajustes/topes.json`;

async function leerTexto(rel: string): Promise<string | undefined> {
  if (nubeActiva()) { const b = await leerSuelto(rel); return b ? Buffer.from(b).toString("utf8") : undefined; }
  const f = join(carpeta(), rel);
  return existsSync(f) ? readFileSync(f, "utf8") : undefined;
}
async function guardarTexto(rel: string, texto: string) {
  if (nubeActiva()) return subirSuelto(rel, new TextEncoder().encode(texto), "application/json");
  const f = join(carpeta(), rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(`${f}.tmp`, texto);
  renameSync(`${f}.tmp`, f);
}
/** Lee, cambia y guarda sin pisar lo que otro agente anotó en el medio (igual que la lista de prospectos). */
async function cambiar<T, R>(rel: string, vacio: () => T, fn: (x: T) => R, intentos = 5): Promise<R> {
  for (let i = 0; ; i++) {
    const antes = await leerTexto(rel);
    const x = antes ? (JSON.parse(antes) as T) : vacio();
    const r = fn(x);
    if (i < intentos - 1 && (await leerTexto(rel)) !== antes) { await new Promise((ok) => setTimeout(ok, 30 + Math.random() * 120)); continue; }
    await guardarTexto(rel, JSON.stringify(x));
    return r;
  }
}

export async function leerMes(mes = mesDe(diaGasto())): Promise<MesGasto> {
  const t = await leerTexto(rutaMes(mes));
  const m = t ? (JSON.parse(t) as MesGasto) : { llamadas: [] };
  return { ...m, llamadas: m.llamadas ?? [] };
}
export async function leerTopes(): Promise<Topes> {
  const t = await leerTexto(RUTA_TOPES);
  return { ...TOPES_INICIALES, ...(t ? (JSON.parse(t) as Partial<Topes>) : {}) };
}
export const topeValido = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= TOPE_MIN && n <= TOPE_MAX;
export async function cambiarTopes(c: { diario?: number; mensual?: number; saldo?: number | null; extra?: number | null }, quien: string, ahora = new Date()): Promise<Topes> {
  return cambiar<Partial<Topes>, Topes>(RUTA_TOPES, () => ({}), (t) => {
    if (c.diario !== undefined) t.diario = c.diario;
    if (c.mensual !== undefined) t.mensual = c.mensual;
    if (c.saldo === null) delete t.saldo; else if (c.saldo !== undefined) t.saldo = { usd: c.saldo, desde: ahora.toISOString() };
    if (c.extra === null) delete t.extra; else if (c.extra !== undefined) t.extra = { dia: diaGasto(ahora), usd: c.extra, quien };
    return { ...TOPES_INICIALES, ...t };
  });
}

const suma = (l: Llamada[]) => m4(l.reduce((s, x) => s + x.usd, 0));
const delDia = (m: MesGasto, dia: string) => m.llamadas.filter((x) => diaGasto(x.t) === dia);

/** Cuánto va gastado hoy y este mes, y si todavía se puede gastar. */
export async function estadoGasto(ahora = new Date()) {
  const dia = diaGasto(ahora);
  const [mes, topes] = await Promise.all([leerMes(mesDe(dia)), leerTopes()]);
  const hoy = suma(delDia(mes, dia)), delMes = suma(mes.llamadas);
  const extra = topes.extra?.dia === dia ? topes.extra.usd : 0;
  return { dia, hoy, mes: delMes, topes, extra, topeHoy: topes.diario, topeHoyConPermiso: topes.diario + extra, pasaDia: hoy >= topes.diario, pasaMes: delMes >= topes.mensual };
}

export class TopeDeGasto extends Error {
  alcance: "dia" | "mes";
  constructor(alcance: "dia" | "mes", texto: string) { super(texto); this.name = "TopeDeGasto"; this.alcance = alcance; }
}

/**
 * Antes de cada llamada a la IA: si ya se llegó al tope, no se llama. El trabajo automático (`auto`) se detiene en el
 * tope sin más. El lanzado a mano puede seguir ese día solo si Jay o Luna dieron permiso desde «Gasto».
 * Si no se puede leer el medidor, se deja pasar: una falla de la nube no debe parar el estudio.
 */
export async function exigirPresupuesto(auto = false, ahora = new Date()) {
  if (process.env.ANONYMO_SIN_TOPE === "1") return;
  let e: Awaited<ReturnType<typeof estadoGasto>>;
  try { e = await estadoGasto(ahora); } catch { return; }
  const usd = (n: number) => `USD ${n.toFixed(2)}`;
  if (e.mes >= e.topes.mensual) throw new TopeDeGasto("mes", `Se llegó al tope de gasto en IA de este mes (${usd(e.topes.mensual)}). Para seguir, súbelo en Mejorar el estudio → Gasto.`);
  if (e.hoy >= (auto ? e.topeHoy : e.topeHoyConPermiso)) throw new TopeDeGasto("dia", `Se llegó al tope de gasto en IA de hoy (${usd(e.topeHoy)}). ${auto ? "El trabajo automático sigue mañana." : "Para seguir hoy, da permiso en Mejorar el estudio → Gasto."}`);
}

/** Los avisos de gasto (50, 80 y 100 % del tope del día y del mes). Quien quiera enterarse se anota aquí (el estudio manda el aviso al celular). */
export interface AvisoGasto { alcance: "dia" | "mes"; nivel: 50 | 80 | 100; gastado: number; tope: number }
const oyentes = ((globalThis as { __anonymoGasto?: ((a: AvisoGasto) => unknown)[] }).__anonymoGasto ??= []);
export function alAvisarGasto(fn: (a: AvisoGasto) => unknown) { if (!oyentes.includes(fn)) oyentes.push(fn); }
const NIVELES = [50, 80, 100] as const;

/** Anota una llamada. Nunca lanza: si el medidor falla, el trabajo del agente no se pierde. Devuelve lo que costó. */
export async function anotarGasto(l: Omit<Llamada, "t" | "usd">, ahora = new Date()): Promise<number> {
  const usd = costoLlamada(l.modelo, l);
  try {
    const dia = diaGasto(ahora);
    const topes = await leerTopes();
    const avisos = await cambiar<MesGasto, AvisoGasto[]>(rutaMes(mesDe(dia)), () => ({ llamadas: [] }), (m) => {
      m.llamadas ??= [];
      const limpio: Llamada = { t: ahora.toISOString(), origen: l.origen, modelo: l.modelo, entrada: l.entrada, salida: l.salida, usd };
      if (l.tarea) limpio.tarea = l.tarea;
      if (l.proyecto) limpio.proyecto = l.proyecto;
      if (l.cacheL) limpio.cacheL = l.cacheL;
      if (l.cacheE) limpio.cacheE = l.cacheE;
      if (l.busquedas) limpio.busquedas = l.busquedas;
      if (l.auto) limpio.auto = true;
      m.llamadas.push(limpio);
      // Qué umbrales se cruzaron con esta llamada y todavía no se avisaron.
      const out: AvisoGasto[] = [];
      const ya = (m.avisados ??= {});
      const revisar = (alcance: "dia" | "mes", clave: string, gastado: number, tope: number) => {
        const nivel = [...NIVELES].reverse().find((n) => gastado >= (tope * n) / 100);
        if (nivel && (ya[clave] ?? 0) < nivel) { ya[clave] = nivel; out.push({ alcance, nivel, gastado, tope }); }
      };
      revisar("dia", dia, suma(delDia(m, dia)), topes.diario);
      revisar("mes", "mes", suma(m.llamadas), topes.mensual);
      return out;
    });
    for (const a of avisos) for (const fn of oyentes) { try { await fn(a); } catch { /* un aviso que falla no rompe nada */ } }
  } catch { /* sin medidor: el trabajo sigue */ }
  return usd;
}

/** El lunes de la semana de `dia` (AAAA-MM-DD). */
function lunes(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Todo lo que muestra la pantalla «Gasto». */
export async function resumenGasto(ahora = new Date()) {
  const dia = diaGasto(ahora), mes = mesDe(dia), desde = lunes(dia);
  const [actual, topes] = await Promise.all([leerMes(mes), leerTopes()]);
  // La semana puede empezar en el mes anterior.
  const anterior = mesDe(desde) !== mes ? await leerMes(mesDe(desde)) : { llamadas: [] as Llamada[] };
  const semana = [...anterior.llamadas, ...actual.llamadas].filter((x) => diaGasto(x.t) >= desde);
  const agrupar = (clave: (x: Llamada) => string | undefined) => {
    const g = new Map<string, { usd: number; llamadas: number }>();
    for (const x of actual.llamadas) { const k = clave(x); if (!k) continue; const a = g.get(k) ?? { usd: 0, llamadas: 0 }; a.usd += x.usd; a.llamadas++; g.set(k, a); }
    return [...g].map(([nombre, v]) => ({ nombre, usd: m4(v.usd), llamadas: v.llamadas })).sort((a, b) => b.usd - a.usd);
  };
  // El saldo: lo que Jay anotó de la consola, menos lo gastado desde ese momento (puede cruzar de mes).
  let saldo: { usd: number; desde: string; queda: number } | undefined;
  if (topes.saldo) {
    const d0 = topes.saldo.desde;
    const meses = new Set([mesDe(diaGasto(d0)), mes]);
    let gastado = 0;
    for (const k of meses) gastado += suma((k === mes ? actual : await leerMes(k)).llamadas.filter((x) => x.t >= d0));
    // Meses completos entre los dos, si los hay.
    const c = new Date(`${mesDe(diaGasto(d0))}-15T12:00:00Z`);
    for (c.setUTCMonth(c.getUTCMonth() + 1); c.toISOString().slice(0, 7) < mes; c.setUTCMonth(c.getUTCMonth() + 1)) gastado += suma((await leerMes(c.toISOString().slice(0, 7))).llamadas);
    saldo = { ...topes.saldo, queda: Math.round((topes.saldo.usd - gastado) * 100) / 100 };
  }
  const hoy = delDia(actual, dia);
  const extra = topes.extra?.dia === dia ? topes.extra.usd : 0;
  const cache = actual.llamadas.reduce((s, x) => s + (x.cacheL ?? 0), 0), entrada = actual.llamadas.reduce((s, x) => s + x.entrada + (x.cacheL ?? 0) + (x.cacheE ?? 0), 0);
  return {
    dia, topes, extra, saldo,
    hoy: { usd: suma(hoy), llamadas: hoy.length },
    semana: { usd: suma(semana), llamadas: semana.length, desde },
    mes: { usd: suma(actual.llamadas), llamadas: actual.llamadas.length },
    porOrigen: agrupar((x) => x.origen),
    porModelo: agrupar((x) => precioModelo(x.modelo).nombre),
    porProyecto: agrupar((x) => x.proyecto),
    automatico: suma(actual.llamadas.filter((x) => x.auto)),
    /** De cada 100 tokens de entrada del mes, cuántos salieron del caché (más barato). */
    deCache: entrada ? Math.round((cache / entrada) * 100) : 0,
    desconocidos: [...new Set(actual.llamadas.filter((x) => !precioModelo(x.modelo).conocido).map((x) => x.modelo))],
    ultimas: actual.llamadas.slice(-25).reverse(),
  };
}
export type ResumenGasto = Awaited<ReturnType<typeof resumenGasto>>;
