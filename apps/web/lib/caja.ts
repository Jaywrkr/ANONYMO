// Lo que devuelve la caja de Atlas (sistema/95): una tarjeta con lo hecho y sus botones.
export interface Tarjeta {
  titulo: string;
  texto?: string;
  /** Botones: un enlace interno o externo, un texto para copiar, o abrir la conversación de un proyecto. */
  botones?: { texto: string; href?: string; copiar?: string; externo?: boolean; proyecto?: string }[];
}
