// El camino de un proyecto en palabras simples (sistema/33): en qué paso va, qué te toca ahora y qué viene después.
// Sin dependencias de servidor: lo usan el inicio, el proyecto y la revisión.
import { FASES, agentePorId } from "@anonymo/agentes";

export type Paso = "pedido" | "plan" | "trabajo" | "revision" | "listo";

export const PASOS: { id: Paso; nombre: string; ayuda: string }[] = [
  { id: "pedido", nombre: "Pedido", ayuda: "Contaste lo que quiere el cliente." },
  { id: "plan", nombre: "Plan", ayuda: "Atlas decide quién trabaja. Nadie empieza hasta que digas «que empiecen»." },
  { id: "trabajo", nombre: "Trabajo", ayuda: "Los agentes hacen su parte, fase por fase." },
  { id: "revision", nombre: "Revisión", ayuda: "Al terminar cada fase, revisas y apruebas o pides cambios." },
  { id: "listo", nombre: "Listo", ayuda: "Todas las fases aprobadas." },
];

/** Lo mínimo del proyecto que hace falta para contar su camino. */
export interface ProyectoCamino {
  estado: string;
  faseActual: number;
  plan: { fases: number[]; tareas: string[] };
  tareas: Record<string, string>;
  esperaJurado?: boolean;
  pendientesCliente?: { fecha: string; texto: string }[];
}

export type Socio = "jay" | "luna";
export const nombreSocio = (s: string) => (s === "luna" ? "Luna" : "Jay");
export const nombreFase = (n: number) => FASES.find((f) => f.n === n)?.nombre ?? `Fase ${n}`;

export interface Momento {
  paso: Paso;
  /** Índice del paso actual (0 a 4). */
  indice: number;
  /** Qué hay que hacer ahora, dicho a quien entró. */
  ahora: string;
  /** Qué pasa después. */
  despues: string;
  /** Si la siguiente acción es de quien entró. */
  teToca: boolean;
  /** «toca» (decidir), «vivo» (trabajando), «cortado» (se cortó a mitad), «pausa», «listo». */
  tono: "toca" | "otro" | "vivo" | "cortado" | "pausa" | "listo";
  /** Texto del botón principal. */
  accion: string;
  /** Fase n de N. */
  fase: { n: number; de: number; nombre: string };
  /** Entregas hechas sobre el total. */
  hechas: number;
  total: number;
  /** Agentes trabajando ahora mismo. */
  trabajando: string[];
}

export function momento(p: ProyectoCamino, yo: Socio, responsableActual: Socio): Momento {
  const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
  const total = Math.max(1, p.plan.tareas.length);
  const pos = Math.max(0, p.plan.fases.indexOf(p.faseActual));
  const fase = { n: pos + 1, de: p.plan.fases.length, nombre: nombreFase(p.faseActual) };
  const siguiente = p.plan.fases[pos + 1];
  const trabajando = Object.entries(p.tareas).filter(([, e]) => e === "en-curso").map(([t]) => t.split(".")[1]);
  const nombres = (ids: string[]) => {
    const n = [...new Set(ids)].map((i) => agentePorId(i)?.nombre ?? i);
    return n.length <= 2 ? n.join(" y ") : `${n.slice(0, -1).join(", ")} y ${n.at(-1)}`;
  };
  const base = { fase, hechas, total, trabajando };

  if (p.estado === "plan") {
    return { ...base, paso: "plan", indice: 1, teToca: true, tono: "toca", accion: "Ver el plan",
      ahora: `Atlas armó el plan: ${p.plan.tareas.length} entregas en ${p.plan.fases.length} fase${p.plan.fases.length === 1 ? "" : "s"}. Revísalo y di «que empiecen».`,
      despues: `El equipo trabaja ${nombreFase(p.plan.fases[0])} y te avisa cuando toque revisar.` };
  }
  if (p.estado === "esperando") {
    const mio = responsableActual === yo;
    const n = p.plan.tareas.filter((t) => t.startsWith(`${p.faseActual}.`)).length;
    return { ...base, paso: "revision", indice: 3, teToca: mio, tono: mio ? "toca" : "otro",
      accion: mio ? "Revisar ahora" : "Revisar igual",
      ahora: p.esperaJurado
        ? "La nota de calidad no llegó a 7 después de dos rondas. Decide si se acepta así o se corrige."
        : mio ? `${fase.nombre} está listo: ${n} entrega${n === 1 ? "" : "s"} para revisar.` : `${fase.nombre} está listo. Le toca revisar a ${nombreSocio(responsableActual)}.`,
      despues: siguiente ? `Si apruebas, el equipo sigue con ${nombreFase(siguiente)}.` : "Si apruebas, el proyecto queda listo." };
  }
  if (p.estado === "en-curso") {
    if (trabajando.length) {
      return { ...base, paso: "trabajo", indice: 2, teToca: false, tono: "vivo", accion: "Ver en vivo",
        ahora: `${nombres(trabajando)} ${trabajando.length === 1 ? "está" : "están"} trabajando en ${fase.nombre}.`,
        despues: `Cuando terminen ${fase.nombre}, te toca revisar.` };
    }
    return { ...base, paso: "trabajo", indice: 2, teToca: true, tono: "cortado", accion: "Continuar",
      ahora: "El trabajo se cortó a mitad de camino (pasa si tarda más de 5 minutos). Lo terminado está guardado.",
      despues: "Al continuar, el equipo sigue desde donde quedó." };
  }
  if (p.estado === "parado") {
    return { ...base, paso: "trabajo", indice: 2, teToca: false, tono: "pausa", accion: "Reanudar",
      ahora: "Proyecto en pausa: nadie trabaja en él.", despues: "Al reanudar, vuelve a esperar tu decisión." };
  }
  return { ...base, paso: "listo", indice: 4, teToca: false, tono: "listo", accion: "Ver el proyecto",
    ahora: "Todas las fases están aprobadas.", despues: "Comparte el portal con el cliente para que vea el resultado." };
}
