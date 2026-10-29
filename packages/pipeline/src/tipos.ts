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
    /** Web publicada o de prueba: la audita Prisma. */
    url?: string;
    /** Respuestas a las preguntas de Atlas (cuestionario del portal o anotadas por Jay/Luna). */
    respuestas?: { pregunta: string; respuesta: string; fecha: string; quien: "jay" | "luna" | "cliente" }[];
  };
  /** Dónde se detiene para que Jay o Luna revisen. Si no viene, lo propone Atlas. */
  pausas?: Pausas;
  /** Quién aprueba cada fase en este proyecto, si no es el de siempre (sistema/14). */
  responsables?: Record<number, "jay" | "luna">;
  /** Idioma de las entregas, el portal y el PDF (sistema/20). Por defecto español. */
  idioma?: "es" | "en";
  /** Punto de partida por rubro (sistema/13): salud, comida, profesionales, tienda, espacios. */
  plantilla?: string;
  creado: string; // ISO
}

/**
 * Pausas de un proyecto:
 * "nunca"      corre de una y se revisa al final
 * "cada-fase"  se detiene al cerrar cada fase
 * "clave"      las que propone Atlas según el tipo de pedido
 * [1, 4]       solo al cerrar esas fases
 */
export type Pausas = "nunca" | "cada-fase" | "clave" | number[];

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
  /** Solo para el equipo: no se muestra en el portal del cliente (precios internos, nota del jurado, ventas). */
  interna?: boolean;
  /** Tarea liviana (sistema/23): la hace el modelo rápido (Haiku), más barato. */
  ligera?: boolean;
  /** Tarea creativa o de criterio (sistema/26): el modelo piensa antes de escribir. Las demás van directo, más baratas. */
  profunda?: boolean;
  /** Tope de tokens de salida. Por defecto 2500: entregas concretas, sin relleno. */
  salida?: number;
  /** Herramientas que necesita de verdad (fase 5.4). En simulado se marcan como pendientes. */
  herramientas?: ("web" | "dominios" | "redes" | "lighthouse" | "imagen")[];
  /** Formato fijo (sistema/35): las secciones que siempre lleva la entrega, en este orden. */
  estructura?: string[];
}

/** La marca del cliente (sistema/35): colores, fuentes y logo que el equipo usa tal cual. */
export interface Marca {
  colores: { nombre: string; hex: string }[];
  fuentes: { nombre: string; uso: string }[];
  /** Nombre del archivo del logo dentro de los archivos del proyecto. */
  logo?: string;
  notas?: string;
  actualizado?: string;
}

/** La propuesta para el cliente (sistema/35): editable por Jay o Luna y lista para descargar. */
export interface Propuesta {
  titulo: string;
  intro: string;
  quienes: string;
  entendimos: string;
  haremos: string;
  entregables: string;
  tiempos: string;
  items: { concepto: string; detalle: string; precio: number }[];
  condiciones: string;
  validez: string;
  actualizado: string;
}

/** El plan que arma Atlas para un pedido. */
export interface Plan {
  pedido: string;
  fases: number[];
  /** Por qué entra o se salta cada fase, en una línea. */
  razones: Record<number, string>;
  tareas: TareaId[]; // en orden de ejecución
  /** Tareas que Atlas sacó porque no aplican, con la razón. */
  quitadas: { id: TareaId; razon: string }[];
  /** Fases al final de las cuales se detiene. Se puede cambiar en cualquier momento. */
  pausas: number[];
  preguntas: string[]; // lo que Atlas necesita saber del cliente
  /** Lo que Atlas entendió del pedido, en una o dos frases (sistema/23). */
  resumen?: string;
  /** El plan lo armó Atlas con IA leyendo el pedido (si no, con reglas fijas). */
  porIA?: boolean;
  /** Si no usó IA, por qué (para que Jay y Luna lo vean y lo arreglen). */
  sinIA?: string;
}

export type HerramientaId = NonNullable<Contrato["herramientas"]>[number];

/** Lo que devuelve una herramienta antes de que el agente escriba. */
export interface ResultadoHerramienta {
  herramienta: HerramientaId;
  ok: boolean;
  /** Markdown corto que el agente lee y que queda en la entrega. */
  resumen: string;
  /** Si no está ok: qué falta, en una línea (va a "necesita"). */
  falta?: string;
  datos?: unknown;
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
  /** Datos que otros agentes o herramientas usan: finalistas, resultados de dominios, puntajes. */
  datos?: Record<string, unknown>;
  estado: EstadoTarea;
  /** simulado: estructura · real: API de Anthropic · manual: escrito a mano o en una sesión con Claude */
  modo: "simulado" | "real" | "manual";
  version: number;
  creado: string;
}

export type Decision = "sigue" | "cambia" | "para";

/** La pausa al cerrar cada fase. */
export interface Puerta {
  fase: number;
  decision: Decision;
  nota?: string;
  quien: "jay" | "luna" | "auto" | "cliente";
  fecha: string;
}

/** "plan": Atlas armó el plan y espera que Jay o Luna digan «que empiecen» (sistema/23). */
export type EstadoProyecto = "plan" | "en-curso" | "esperando" | "listo" | "parado";

/** Algo que dijo el cliente. Todos los agentes lo leen desde que entra. */
export interface NotaCliente {
  fecha: string;
  texto: string;
  /** Quién la anotó: Jay o Luna desde la terminal o el estudio, o el cliente desde su portal. */
  quien: "jay" | "luna" | "cliente";
  /** A quién se lo mandó Atlas. */
  tareas: TareaId[];
}

/** Cómo trabaja el equipo: un agente a la vez con tu revisión, por fases o solo (sistema/36). */
export type ModoTrabajo = "paso" | "fase" | "auto";

/** estado.json: la foto del proyecto que lee la sala. */
export interface Proyecto {
  pedido: Pedido;
  plan: Plan;
  faseActual: number;
  estado: EstadoProyecto;
  tareas: Record<TareaId, EstadoTarea>;
  puertas: Puerta[];
  /** Notas de "cambiar" pendientes por fase: los agentes las leen al rehacer. */
  cambios: Record<number, string>;
  /** Uso de IA por tarea: una entrada por cada vez que se hizo (sistema/11). */
  costos?: Record<string, { entrada: number; salida: number; busquedas: number; usd: number; estimado: boolean; fecha: string }[]>;
  /** Caso público (web/03): solo con permiso escrito del cliente. */
  caso?: { publico: boolean; permiso: string; fecha: string; resumen?: string; testimonio?: { texto: string; autor: string; logo?: string } };
  /** Presupuesto vivo (sistema/15): horas base de Ledger y lo que suman los cambios. Jay puede fijar sus horas reales y su tarifa (sistema/35). */
  presupuesto?: { horas?: number; horasJay?: number; tarifa?: number; ajustes: { tarea: string; horas: number; motivo: string; fecha: string; incluido?: boolean }[] };
  /** Cuándo empezó cada tarea que está en curso (sistema/35), para mostrar cuánto lleva. */
  inicios?: Record<string, string>;
  /**
   * Cómo trabaja el equipo (sistema/36). «paso»: trabaja un agente y espera tu revisión;
   * «fase»: se detiene al cerrar las fases con pausa; «auto»: sigue solo hasta el final. Sin valor: «fase».
   */
  modo?: ModoTrabajo;
  /** En modo paso: la entrega que espera tu revisión antes de que siga el siguiente agente. */
  revision?: { tarea: TareaId; fecha: string };
  /** Cuándo empezó la vuelta actual de cada tarea (cada vuelta corre en un pedido de menos de 5 minutos). */
  vueltas?: Record<string, string>;
  /** Lo que un agente alcanzó a escribir antes de que se acabara el tiempo de su vuelta: la siguiente sigue desde ahí. */
  parciales?: Record<string, string>;
  /** El último error al trabajar (por ejemplo, la API no respondió): se muestra y se puede continuar. */
  error?: { mensaje: string; tarea?: string; fecha: string };
  /** Se arrancó con «probar sin gastar IA»: todas las vueltas usan el motor simulado. */
  prueba?: boolean;
  /** Colores, fuentes y logo del cliente (sistema/35). */
  marca?: Marca;
  /** Propuesta editable para el cliente (sistema/35). */
  propuesta?: Propuesta;
  /** Enlace privado del cliente: /portal/<id>?t=<token>. */
  portal?: { token: string; creado: string };
  /** Comentarios que el cliente dejó en su portal y que Jay o Luna todavía no mandan al equipo. */
  pendientesCliente?: { fecha: string; texto: string }[];
  /** Lo que ha dicho el cliente, en orden. */
  notasCliente?: NotaCliente[];
  /** En la papelera (sistema/31): no aparece ni trabaja; se restaura o se borra para siempre. Se vacía sola a los 30 días. */
  papelera?: { fecha: string; quien: "jay" | "luna" };
  /** Rondas automáticas de rehacer por nota del Jurado. */
  rondasJurado?: number;
  /** Se detuvo porque el Jurado no llegó al mínimo después de las rondas automáticas. */
  esperaJurado?: boolean;
  /** Jay o Luna aceptaron cerrar aunque la nota no llegue. */
  juradoAceptado?: boolean;
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
