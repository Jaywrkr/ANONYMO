// Departamento de video (sistema/62–64): subir, escuchar dónde hay silencio, cortar por partes, Atlas y exportar.
export * from "./tipos.ts";
export * from "./edicion.ts";
export * from "./almacen-video.ts";
export * from "./proceso.ts";
export * from "./atlas-video.ts";
export { medirVideo, rutaFfmpeg, filtrosRender, leerMedida, leerSilencios, umbralSilencio, MEDIDAS, type MarcaRender } from "./ffmpeg.ts";
export * from "./marcas-video.ts";
export * from "./guiones.ts";
