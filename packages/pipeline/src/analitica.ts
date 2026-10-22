// Analítica propia, sin cookies (web/19): eventos anónimos en proyectos/_analitica/AAAA-MM.jsonl.
// No guarda IP ni identificadores: ruta, evento, idioma, tipo de equipo, de dónde vino (solo el dominio) y un valor.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CARPETA } from "./almacen.ts";

export interface Evento { t: string; e: string; ruta: string; idioma?: string; equipo?: "celular" | "escritorio"; origen?: string; valor?: string | number }

const carpeta = () => join(CARPETA, "_analitica");
const EVENTOS = new Set(["vista", "sala-tiempo", "sala-agente", "formulario", "compartir", "sonido", "idioma"]);

export function registrar(ev: Omit<Evento, "t">) {
  if (!EVENTOS.has(ev.e) || typeof ev.ruta !== "string" || ev.ruta.length > 200) return;
  const limpio: Evento = {
    t: new Date().toISOString(),
    e: ev.e,
    ruta: ev.ruta.split("?")[0],
    idioma: ev.idioma === "en" ? "en" : "es",
    equipo: ev.equipo === "celular" ? "celular" : "escritorio",
    origen: ev.origen ? String(ev.origen).slice(0, 80) : undefined,
    valor: typeof ev.valor === "number" ? Math.max(0, Math.min(ev.valor, 86400)) : ev.valor ? String(ev.valor).slice(0, 40) : undefined,
  };
  mkdirSync(carpeta(), { recursive: true });
  appendFileSync(join(carpeta(), `${limpio.t.slice(0, 7)}.jsonl`), JSON.stringify(limpio) + "\n");
}

export function leerEventos(dias = 30): Evento[] {
  if (!existsSync(carpeta())) return [];
  const desde = Date.now() - dias * 86400_000;
  return readdirSync(carpeta())
    .filter((f) => f.endsWith(".jsonl"))
    .flatMap((f) => readFileSync(join(carpeta(), f), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as Evento))
    .filter((e) => new Date(e.t).getTime() >= desde);
}

/** Lo que Pulso lee: visitas, páginas, tiempo en la sala, agentes más vistos y contactos. */
export function resumenAnalitica(dias = 30) {
  const ev = leerEventos(dias);
  const vistas = ev.filter((e) => e.e === "vista");
  const cuenta = (l: string[]) => Object.entries(l.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const tiempos = ev.filter((e) => e.e === "sala-tiempo").map((e) => Number(e.valor) || 0);
  return {
    dias,
    vistas: vistas.length,
    paginas: cuenta(vistas.map((e) => e.ruta)).slice(0, 10),
    origenes: cuenta(vistas.map((e) => e.origen ?? "directo")).slice(0, 8),
    celular: vistas.length ? Math.round((vistas.filter((e) => e.equipo === "celular").length / vistas.length) * 100) : 0,
    ingles: vistas.length ? Math.round((vistas.filter((e) => e.idioma === "en").length / vistas.length) * 100) : 0,
    salaSegundos: tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0,
    agentes: cuenta(ev.filter((e) => e.e === "sala-agente").map((e) => String(e.valor))).slice(0, 8),
    formularios: ev.filter((e) => e.e === "formulario").length,
    compartidos: ev.filter((e) => e.e === "compartir").length,
  };
}
