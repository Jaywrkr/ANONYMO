// El camino de un proyecto en palabras simples (sistema/33): en qué paso va, qué te toca ahora y qué viene después.
// Sin dependencias de servidor: lo usan el inicio, el proyecto y la revisión.
import { FASES, agentePorId } from "@anonymo/agentes";
import { contratoPorId, type TareaId } from "@anonymo/pipeline";

/** Una vuelta de trabajo dura menos de 5 minutos: una tarea «en curso» por más que esto quedó trabada (sistema/36). */
export const VUELTA_MUERTA_MS = 330_000;
/** Entre una vuelta y la siguiente pasan segundos; si pasa más que esto sin nadie trabajando, se detuvo. */
export const SIN_VUELTA_MS = 90_000;

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
  controlPendiente?: {tarea:string;version:number};
  pendientesCliente?: { fecha: string; texto: string }[];
  modo?: "paso" | "fase" | "auto";
  revision?: { tarea: string; fecha: string; calidad?: "pendiente" | "cambios" };
  vueltas?: Record<string, string>;
  inicios?: Record<string, string>;
  error?: { mensaje: string; tarea?: string; fecha: string };
  actualizado?: string;
  direcciones?: { esperando?: boolean; opciones: { nombre: string }[]; tarea: string; cliente?: { n: number } };
}

const entregaDe = (t: string) => contratoPorId(t as TareaId)?.entrega ?? t;
const agenteDe = (t: string) => agentePorId(t.split(".")[1])?.nombre ?? t;
/** La próxima tarea que va a trabajar, si hay. */
export const siguienteTarea = (p: ProyectoCamino) => p.plan.tareas.find((t) => p.tareas[t] !== "lista" && t !== p.revision?.tarea);

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
  /** Modo paso: la entrega que espera revisión. */
  revision?: string;
  /** La vuelta se cortó o falló: hay que continuar. */
  trabado?: boolean;
  /** Hay direcciones de diseño esperando que elijan una. */
  direcciones?: boolean;
}

/** Lo que se sabe en vivo de la vuelta que está trabajando (sistema/42). */
export interface SenalVivo { tarea?: string; fase?: string; palabras?: number }
const VERBO: Record<string, string> = { preparando: "se está preparando", esperando: "espera la respuesta de la IA", pensando: "está pensando", buscando: "está buscando en la web", revisando: "está revisando", escribiendo: "está escribiendo" };

/**
 * `ultima`: cuándo dio la última señal una vuelta de este proyecto (la página del proyecto lo sabe).
 * Sin ese dato (listas, campana), no se da por detenido hasta que pasa el tiempo de una vuelta entera (sistema/44).
 */
export function momento(p: ProyectoCamino, yo: Socio, responsableActual: Socio, ahoraMs = Date.now(), vivo?: SenalVivo, ultima?: string | null): Momento {
  const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
  const total = Math.max(1, p.plan.tareas.length);
  const pos = Math.max(0, p.plan.fases.indexOf(p.faseActual));
  const fase = { n: pos + 1, de: p.plan.fases.length, nombre: nombreFase(p.faseActual) };
  const siguiente = p.plan.fases[pos + 1];
  const enCurso = Object.entries(p.tareas).filter(([, e]) => e === "en-curso").map(([t]) => t);
  // Una tarea «en curso» cuya vuelta empezó hace más de 5 minutos y medio ya no la está trabajando nadie.
  const viva = (t: string) => { const v = p.vueltas?.[t] ?? p.inicios?.[t]; return !!v && ahoraMs - Date.parse(v) < VUELTA_MUERTA_MS; };
  const trabajando = enCurso.filter(viva).map((t) => t.split(".")[1]);
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
  if (p.estado === "en-curso" && p.controlPendiente && !p.error && (vivo || ahoraMs-(Date.parse(p.actualizado??"")||0)<VUELTA_MUERTA_MS)) {
    const t=p.controlPendiente.tarea;
    return {...base,paso:"trabajo",indice:2,teToca:false,tono:"vivo",accion:"Ver la revisión",trabajando:[t.split(".")[1]],ahora:`Revisando ${entregaDe(t).toLowerCase()}, versión ${p.controlPendiente.version}.`,despues:"Comprobamos los requisitos antes de pedirte una decisión. Si falta una prueba, quedará pendiente."};
  }
  if (p.estado === "esperando" && p.direcciones?.esperando) {
    const mio = responsableActual === yo;
    const n = p.direcciones.opciones.length;
    const cli = p.direcciones.cliente ? ` El cliente prefiere «${p.direcciones.opciones[p.direcciones.cliente.n]?.nombre}».` : "";
    return { ...base, paso: "revision", indice: 3, teToca: mio, tono: mio ? "toca" : "otro", direcciones: true,
      accion: "Elegir una dirección",
      ahora: n ? `${agenteDe(p.direcciones.tarea)} propone ${n} direcciones de diseño. Elige una.${cli}` : `${agenteDe(p.direcciones.tarea)} no entregó las maquetas en el formato. Pídele otras.`,
      despues: `Con la elegida, ${agenteDe(p.direcciones.tarea)} diseña la web completa y el equipo la construye.` };
  }
  if (p.estado === "esperando" && p.revision && !p.esperaJurado) {
    const mio = responsableActual === yo;
    const t = p.revision.tarea;
    const sig = siguienteTarea(p);
    if(p.revision.calidad) return {...base,paso:"revision",indice:3,teToca:mio,tono:mio?"toca":"otro",revision:t,accion:"Ver qué falta",ahora:p.revision.calidad==="cambios"?`${entregaDe(t)} necesita cambios antes de poder aprobarse.`:`Falta completar la revisión de ${entregaDe(t).toLowerCase()}.`,despues:"En Requisitos y calidad puedes ver qué falta y volver a verificar la pieza. También puedes pedir cambios."};
    return { ...base, paso: "revision", indice: 3, teToca: mio, tono: mio ? "toca" : "otro", revision: t,
      accion: mio ? "Revisar la entrega" : "Revisar igual",
      ahora: mio ? `${agenteDe(t)} entregó ${entregaDe(t).toLowerCase()}. Revisa su entrega.` : `${agenteDe(t)} entregó ${entregaDe(t).toLowerCase()}. Le toca revisar a ${nombreSocio(responsableActual)}.`,
      despues: sig ? `Si apruebas, sigue ${agenteDe(sig)} con ${entregaDe(sig).toLowerCase()}.` : "Si apruebas, el proyecto queda listo." };
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
    const modo = p.modo ?? "fase";
    const despues = modo === "paso" ? "Cuando entregue, te toca revisar." : modo === "auto" ? "Sigue solo hasta el final. Te avisamos si algo necesita tu decisión." : `Cuando terminen ${fase.nombre}, te toca revisar.`;
    // Hay una vuelta viva (da señal): nunca se muestra como detenido, aunque la IA tarde (sistema/42).
    if (vivo) {
      const t = vivo.tarea ?? enCurso[0] ?? siguienteTarea(p);
      return { ...base, trabajando: t ? [t.split(".")[1]] : trabajando, paso: "trabajo", indice: 2, teToca: false, tono: "vivo", accion: "Ver en vivo",
        ahora: t ? `${agenteDe(t)} ${VERBO[vivo.fase ?? ""] ?? "está trabajando"}: ${entregaDe(t).toLowerCase()}.` : "El equipo está trabajando.",
        despues };
    }
    if (p.error) {
      return { ...base, paso: "trabajo", indice: 2, teToca: true, tono: "cortado", accion: "Continuar", trabado: true,
        ahora: `${p.error.tarea ? agenteDe(p.error.tarea) : "El equipo"} no pudo trabajar. Lo terminado está guardado.`,
        despues: `Motivo: ${p.error.mensaje.slice(0, 160)}. Al continuar, lo intenta de nuevo.` };
    }
    if (trabajando.length) {
      const t = enCurso.find(viva)!;
      return { ...base, paso: "trabajo", indice: 2, teToca: false, tono: "vivo", accion: "Ver en vivo",
        ahora: trabajando.length === 1 ? `${agenteDe(t)} está trabajando: ${entregaDe(t).toLowerCase()}.` : `${nombres(trabajando)} están trabajando en ${fase.nombre}.`,
        despues };
    }
    // Entre una vuelta y la siguiente pasan segundos: recién después de un rato sin nadie se da por detenido.
    const marca = Math.max(Date.parse(p.actualizado ?? "") || 0, Date.parse(ultima ?? "") || 0);
    const reciente = ahoraMs - marca < (ultima === undefined ? VUELTA_MUERTA_MS : SIN_VUELTA_MS) && !enCurso.length;
    if (reciente) {
      const sig = siguienteTarea(p);
      return { ...base, paso: "trabajo", indice: 2, teToca: false, tono: "vivo", accion: "Ver en vivo",
        ahora: sig ? `${agenteDe(sig)} está por empezar: ${entregaDe(sig).toLowerCase()}.` : "El equipo está cerrando la fase.", despues };
    }
    return { ...base, paso: "trabajo", indice: 2, teToca: true, tono: "cortado", accion: "Continuar", trabado: true,
      ahora: enCurso.length ? `${agenteDe(enCurso[0])} se detuvo a mitad de camino. Lo terminado está guardado.` : "El equipo se detuvo. Lo terminado está guardado.",
      despues: "Al continuar, sigue desde donde quedó." };
  }
  if (p.estado === "parado") {
    return { ...base, paso: "trabajo", indice: 2, teToca: false, tono: "pausa", accion: "Reanudar",
      ahora: "Proyecto en pausa: nadie trabaja en él.", despues: (p.modo ?? "fase") === "fase" ? "Al reanudar, vuelve a esperar tu decisión." : "Al reanudar, el equipo sigue desde donde quedó." };
  }
  return { ...base, paso: "listo", indice: 4, teToca: false, tono: "listo", accion: "Ver el proyecto",
    ahora: "Todas las fases están aprobadas.", despues: "Comparte el portal con el cliente para que vea el resultado." };
}
