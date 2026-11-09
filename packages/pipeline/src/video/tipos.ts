// Departamento de video (sistema/62): lo que se guarda de cada video.
// Un video no es un proyecto de la agencia: vive aparte (`_videos/<id>/`) para no bajar megas en cada página.

/** Una palabra con su tiempo en el video original (segundos). */
export interface Palabra { texto: string; inicio: number; fin: number }

export interface Transcripcion {
  idioma?: string;
  texto: string;
  palabras: Palabra[];
  /** Quién la hizo (modelo), para saber de dónde salió. */
  modelo?: string;
}

/** Un tramo de tiempo del original, en segundos. */
export interface TramoVideo { inicio: number; fin: number }

/** Por qué se quitó un tramo: lo muestra la interfaz. */
export type MotivoCorte = "silencio" | "muletilla" | "texto" | "inicio" | "final";
export interface Corte extends TramoVideo { motivo: MotivoCorte }

export type FormatoVideo = "9:16" | "1:1" | "16:9";
export const FORMATOS_VIDEO: FormatoVideo[] = ["9:16", "1:1", "16:9"];

export type IdPlantilla = "marca" | "limpio" | "caja";

/**
 * El JSON de edición: lo que el editor (y luego Atlas) cambia. El video original nunca se toca:
 * los cortes y los subtítulos se calculan a partir de esto y de la transcripción.
 */
export interface Edicion {
  /** Quitar pausas más largas que `pausaMax` segundos. */
  silencios: boolean;
  pausaMax: number;
  /** Quitar «eh», «mmm», «este»… */
  muletillas: boolean;
  /** Índices de palabras que se quitaron a mano (editar el video editando el texto). */
  quitadas: number[];
  subtitulos: { activos: boolean; plantilla: IdPlantilla; acento: string; tamano: number; posicion: "abajo" | "centro" | "arriba" };
  audio: { normalizar: boolean; limpiarRuido: boolean };
}

export const EDICION_INICIAL: Edicion = {
  silencios: true,
  pausaMax: 0.6,
  muletillas: true,
  quitadas: [],
  subtitulos: { activos: true, plantilla: "marca", acento: "#ffd43b", tamano: 1, posicion: "centro" },
  audio: { normalizar: true, limpiarRuido: false },
};

export type EstadoVideo = "subiendo" | "subido" | "transcrito" | "error";

/** Un paso pesado en curso: lo ve la interfaz para decir qué pasa y bloquear otro igual. */
export interface Ocupado { paso: "transcribir" | "render"; formato?: FormatoVideo; desde: string; avance?: number; texto?: string }

export interface ResultadoVideo { formato: FormatoVideo; archivo: string; listo: string; segundos: number; bytes: number; huella: string }

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
  transcripcion?: Transcripcion;
  edicion: Edicion;
  ocupado?: Ocupado;
  resultados: ResultadoVideo[];
  error?: string;
}
