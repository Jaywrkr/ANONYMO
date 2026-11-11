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
  /** Motion (sistema/65): zoom y transiciones entre partes. */
  motion: {
    /** En cada corte alterna plano normal y plano cerrado (el estilo de los videos hablados en redes). */
    zoomAlterno: boolean;
    /** Partes (índices) que van con plano cerrado para remarcarlas. */
    zoomPartes: number[];
    /** Entre un tramo y otro: corte seco o fundido corto. */
    transicion: "corte" | "fundido";
  };
  /** Marca (sistema/65): lo que se toma del kit de marca del video. */
  marca: {
    logoEsquina: boolean;
    /** Cierre con el logo sobre el color de la marca. */
    cierre: boolean;
    cierreSegundos: number;
    /** Música de la marca, que baja sola cuando alguien habla. */
    musica: boolean;
    /** Volumen de la música: 0,05 (muy bajo) a 0,5 (alto). */
    volumenMusica: number;
  };
}

export const EDICION_INICIAL: Edicion = {
  silencios: true,
  pausaMax: 0.6,
  quitadas: [],
  audio: { normalizar: true, limpiarRuido: false },
  motion: { zoomAlterno: false, zoomPartes: [], transicion: "corte" },
  marca: { logoEsquina: false, cierre: false, cierreSegundos: 2, musica: false, volumenMusica: 0.18 },
};

/** Kit de marca de un cliente (sistema/65): colores, logo y música propia. Vive en `_marcas/<id>/`. */
export interface KitMarca {
  id: string;
  nombre: string;
  /** Color principal (#rrggbb): fondo del cierre. */
  color: string;
  /** Color del texto sobre el fondo si no hay logo. */
  texto: string;
  /** «logo.png» dentro de la carpeta del kit. */
  logo?: string;
  musica?: { archivo: string; nombre: string };
  actualizado: string;
}

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
  /** Kit de marca elegido para este video (sistema/65). */
  marca?: string;
  /** El guion de Faro con que se grabó (sistema/71): Corte lo lee al editar. */
  guion?: string;
}
