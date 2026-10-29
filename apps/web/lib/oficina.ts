// Qué está haciendo cada agente, a partir de los proyectos (sistema/30). Sin dependencias de servidor:
// lo usan el estudio (servidor) y la oficina en vivo (navegador).
import { AGENTES, FASES } from "@anonymo/agentes";

export type EstadoAgente = "trabajando" | "revisar" | "cola" | "listo" | "libre";

/** Lo mínimo de un proyecto para pintar la oficina. */
export interface ProyectoOficina {
  id: string;
  nombre: string;
  estado: string; // plan | en-curso | esperando | listo | parado
  faseActual: number;
  tareas: Record<string, string>; // "4.orla": "lista" | "en-curso" | "por-empezar" | "rehacer"
  /** Modo paso (sistema/36): la única entrega que espera revisión. */
  revision?: { tarea: string };
}

export interface TrabajoAgente {
  proyecto: string;
  nombre: string;
  tarea: string;
  estado: EstadoAgente;
}

export interface Puesto {
  estado: EstadoAgente;
  trabajos: TrabajoAgente[];
}

const PESO: Record<EstadoAgente, number> = { trabajando: 4, revisar: 3, cola: 2, listo: 1, libre: 0 };

export const TEXTO_ESTADO: Record<EstadoAgente, string> = {
  trabajando: "Trabajando",
  revisar: "Te toca revisar",
  cola: "En cola",
  listo: "Entregó",
  libre: "Libre",
};

/** Estado de una tarea dentro de su proyecto, visto desde la oficina. */
export function estadoTarea(p: ProyectoOficina, tarea: string): EstadoAgente {
  const t = p.tareas[tarea];
  if (t === "en-curso") return p.estado === "parado" ? "cola" : "trabajando";
  if (t === "lista") {
    if (p.estado !== "esperando") return "listo";
    if (p.revision) return p.revision.tarea === tarea ? "revisar" : "listo";
    return Number(tarea.split(".")[0]) === p.faseActual ? "revisar" : "listo";
  }
  if (p.estado === "listo" || p.estado === "parado") return "libre";
  return "cola";
}

/** Un puesto por agente: su estado más urgente y en qué proyectos está. */
export function puestos(proyectos: ProyectoOficina[]): Record<string, Puesto> {
  const r: Record<string, Puesto> = Object.fromEntries(AGENTES.map((a) => [a.id, { estado: "libre" as EstadoAgente, trabajos: [] }]));
  for (const p of proyectos) {
    if (p.estado === "listo") continue;
    for (const tarea of Object.keys(p.tareas)) {
      const id = tarea.split(".")[1];
      if (!r[id]) continue;
      const estado = estadoTarea(p, tarea);
      if (estado === "libre") continue;
      r[id].trabajos.push({ proyecto: p.id, nombre: p.nombre, tarea, estado });
      if (PESO[estado] > PESO[r[id].estado]) r[id].estado = estado;
    }
  }
  for (const v of Object.values(r)) v.trabajos.sort((a, b) => PESO[b.estado] - PESO[a.estado]);
  return r;
}

export const nombreFase = (n: number) => FASES.find((f) => f.n === n)?.nombre ?? `Fase ${n}`;
