// Calendario del proyecto con fechas reales: duración típica de cada fase, desde que arranca el proyecto.
import { FASES, SERVICIO } from "@anonymo/agentes";
import type { Proyecto } from "./tipos.ts";

/** "3 a 5 días" → 5 · "2 semanas" → 14 · "3 a 5 semanas" → 35. Se toma el máximo: mejor prometer de menos. */
export function diasDe(texto: string): number {
  const n = [...texto.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const max = n.length ? Math.max(...n) : 2;
  return /semana/i.test(texto) ? max * 7 : /d[ií]a/i.test(texto) ? max : 14;
}

/** Días hábiles: se saltan sábados y domingos. */
function sumarHabiles(desde: Date, dias: number): Date {
  const d = new Date(desde);
  let quedan = Math.max(1, Math.round((dias * 5) / 7));
  while (quedan > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) quedan--;
  }
  return d;
}

export interface Tramo { fase: number; nombre: string; inicio: string; fin: string; estado: "hecha" | "en-curso" | "por-venir"; real: boolean }

export function calendario(p: Proyecto): Tramo[] {
  let cursor = new Date(p.pedido.creado);
  const tramos: Tramo[] = [];
  for (const f of p.plan.fases) {
    const tareas = p.plan.tareas.filter((t) => t.startsWith(`${f}.`));
    const hechas = tareas.every((t) => p.tareas[t] === "lista");
    const empezada = tareas.some((t) => p.tareas[t] !== "por-empezar");
    // Si la fase ya se aprobó, su fin es la fecha real de la aprobación.
    const aprobada = [...p.puertas].reverse().find((x) => x.fase === f && x.decision === "sigue");
    const inicio = new Date(cursor);
    const fin = aprobada && hechas ? new Date(aprobada.fecha) : sumarHabiles(inicio, diasDe(SERVICIO[f]?.dura ?? "2 semanas"));
    tramos.push({
      fase: f,
      nombre: FASES.find((x) => x.n === f)?.nombre ?? `Fase ${f}`,
      inicio: inicio.toISOString().slice(0, 10),
      fin: fin.toISOString().slice(0, 10),
      estado: hechas && aprobada ? "hecha" : empezada || p.faseActual === f ? "en-curso" : "por-venir",
      real: !!(aprobada && hechas),
    });
    cursor = fin;
  }
  return tramos;
}
