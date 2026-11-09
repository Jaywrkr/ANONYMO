// Departamento de video (sistema/62, sin transcripción desde sistema/64): lo que se guarda de cada video.
// Un video no es un proyecto de la agencia: vive aparte (`_videos/<id>/`) para no bajar megas en cada página.

/** Un tramo de tiempo del original, en segundos. */
export interface TramoVideo { inicio: number; fin: number }

/**
 * Lo que sale de escuchar el video (sistema/64): dónde hay sonido. Cada «parte» es un tramo con voz o sonido
 * entre dos silencios. No se transcribe nada: se mide el audio con FFmpeg.
 */
export interface Analisis {
  partes: TramoVideo[];
  /** Volumen por debajo del cual se consideró silencio (dB). */
  umbralDb: number;
  /** Hoja con una miniatura numerada por parte (la ven Luna y Atlas). */
  cuadros?: { archivo: string; columnas: number; ancho: number; alto: number; total: number };
}

/** Por qué se quitó un tramo: lo muestra la interfaz. */
export type MotivoCorte = "silencio" | "parte" | "inicio" | "final";
export interface Corte extends TramoVideo { motivo: MotivoCorte }

export type FormatoVideo = "9:16" | "1:1" | "16:9";
export const FORMATOS_VIDEO: FormatoVideo[] = ["9:16", "1:1", "16:9"];

/**
 * El JSON de edición: lo que el editor (y Atlas) cambia. El video original nunca se toca:
 * los cortes se calculan a partir de esto y del análisis del audio.
 */
export interface Edicion {
  /** Quitar pausas más largas que `pausaMax` segundos. */
  silencios: boolean;
  pausaMax: number;
  /** Índices de partes que se quitaron (tocándolas o pidiéndoselo a Atlas). */
  quitadas: number[];
  audio: { normalizar: boolean; limpiarRuido: boolean };
}

export const EDICION_INICIAL: Edicion = {
  silencios: true,
  pausaMax: 0.6,
  quitadas: [],
  audio: { normalizar: true, limpiarRuido: false },
};

export type EstadoVideo = "subiendo" | "subido" | "analizado" | "error";

/** Un paso pesado en curso: lo ve la interfaz para decir qué pasa y bloquear otro igual. */
export interface Ocupado { paso: "analizar" | "render"; formato?: FormatoVideo; desde: string; avance?: number; texto?: string }

export interface ResultadoVideo { formato: FormatoVideo; archivo: string; listo: string; segundos: number; bytes: number; huella: string }

/** Un mensaje del chat del video con Atlas (sistema/63). */
export interface MensajeVideo { quien: "luna" | "jay" | "atlas"; texto: string; cuando: string; cambios?: string[]; noSePuede?: string[]; error?: boolean }

export interface TrabajoVideo {
  id: string;
  nombre: string;
  /** Cliente o marca, si Luna lo pone. */
  cliente?: string;
  creado: string;
  actualizado: string;
  autor: string;
  estado: EstadoVideo;
  /** «original.mp4», «original.mov»… dentro de la carpeta del video. */
  original?: string;
  bytes?: number;
  duracion?: number;
  ancho?: number;
  alto?: number;
  analisis?: Analisis;
  edicion: Edicion;
  ocupado?: Ocupado;
  resultados: ResultadoVideo[];
  error?: string;
  /** Lo que Luna pidió al subir: Atlas lo aplica apenas termina el análisis (sistema/63). */
  pedido?: string;
  /** Ya se aplicó el pedido inicial (para no aplicarlo dos veces). */
  pedidoAplicado?: boolean;
  conversacion?: MensajeVideo[];
}
