// El contrato del pipeline: qué entra, qué sale y cómo se guarda un proyecto.
import type { TipoPedido } from "@anonymo/agentes";

/** Lo que manda el cliente desde el formulario (o Jay desde la terminal). */
export interface Pedido {
  id: string; // slug: "clinica-sonrisa"
  cliente: string;
  correo?: string;
  tipo: TipoPedido;
  descripcion: string;
  /** Lo que se sepa de entrada. Lo que falte, lo pregunta Atlas. */
  contexto?: {
    rubro?: string;
    ciudad?: string;
    publico?: string;
    referencias?: string[];
    presupuesto?: string;
    plazo?: string;
    tieneMarca?: boolean;
  };
  creado: string; // ISO
}

/** Id de una tarea: fase y agente. "1.sonda", "4.orla". */
export type TareaId = `${number}.${string}`;

export type Formato = "md" | "json";

/** Lo que un agente debe hacer en una fase. Es fijo: sale de contratos.ts. */
export interface Contrato {
  id: TareaId;
  fase: number;
  agente: string;
  /** Nombre corto de lo que entrega, el mismo que se ve en la sala. */
  entrega: string;
  /** Qué tiene que lograr, en una o dos frases. Es la base del prompt. */
  objetivo: string;
  /** Tareas cuyas entregas lee antes de empezar. Si una no está en el plan, se omite. "todo" = todo lo anterior. */
  usa: TareaId[] | "todo";
  formato: Formato;
  /** Lo que el Jurado y ustedes revisan para darla por buena. */
  criterios: string[];
  /** Herramientas que necesita de verdad (fase 5.4). En simulado se marcan como pendientes. */
  herramientas?: ("web" | "dominios" | "redes" | "lighthouse" | "imagen")[];
}

/** El plan que arma Atlas para un pedido. */
export interface Plan {
  pedido: string;
  fases: number[];
  /** Por qué entra o se salta cada fase, en una línea. */
  razones: Record<number, string>;
  tareas: TareaId[]; // en orden de ejecución
  preguntas: string[]; // lo que Atlas necesita saber del cliente
}

export type EstadoTarea = "por-empezar" | "en-curso" | "lista" | "rehacer";

/** Lo que entrega un agente. Se guarda como entregas/<fase>-<agente>.md */
export interface Entrega {
  tarea: TareaId;
  agente: string;
  titulo: string; // = Contrato.entrega
  /** Lo que el agente "dice" en la sala: una o dos frases. */
  dice: string;
  /** Lo que necesita del cliente o del equipo para seguir. */
  necesita: string;
  contenido: string; // markdown
  /** Solo el Jurado: nota de 0 a 10 con pesos Awwwards. */
  nota?: number;
  estado: EstadoTarea;
  modo: "simulado" | "real";
  version: number;
  creado: string;
}

export type Decision = "sigue" | "cambia" | "para";

/** La pausa al cerrar cada fase. */
export interface Puerta {
  fase: number;
  decision: Decision;
  nota?: string;
  quien: "jay" | "luna" | "auto";
  fecha: string;
}

export type EstadoProyecto = "en-curso" | "esperando" | "listo" | "parado";

/** estado.json: la foto del proyecto que lee la sala. */
export interface Proyecto {
  pedido: Pedido;
  plan: Plan;
  faseActual: number;
  estado: EstadoProyecto;
  tareas: Record<TareaId, EstadoTarea>;
  puertas: Puerta[];
  actualizado: string;
}

/** Nota mínima del Jurado para cerrar el proyecto. */
export const NOTA_MINIMA = 7;

/**
 * Cómo se guarda un proyecto en el repo (prototipo):
 *
 * proyectos/<id>/
 *   pedido.json        lo que pidió el cliente
 *   plan.json          lo que decidió Atlas
 *   estado.json        Proyecto: fase, estado de cada tarea, puertas
 *   entregas/1-sonda.md  una por tarea, con frontmatter (Entrega sin contenido) + contenido
 *   bitacora.md        qué pasó y cuándo, en una línea por evento
 */
export const ARCHIVOS = {
  pedido: "pedido.json",
  plan: "plan.json",
  estado: "estado.json",
  entregas: "entregas",
  bitacora: "bitacora.md",
} as const;

export const archivoEntrega = (id: TareaId) => `${id.replace(".", "-")}.md`;
