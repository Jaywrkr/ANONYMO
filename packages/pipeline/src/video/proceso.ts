// Los pasos pesados del departamento de video (sistema/62): transcribir y armar cada formato.
// Cada paso marca el video como ocupado (para bloquear otro igual y decir qué pasa) y guarda su avance aparte.
// Al terminar se vuelve a leer el video y solo se cambia lo que el paso produjo: si Luna movió la edición
// mientras tanto, no se pierde.
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planEdicion, textoHuella } from "./edicion.ts";
import { archivoAss } from "./subtitulos.ts";
import { medirVideo, renderizar, sacarAudio } from "./ffmpeg.ts";
import { transcribir } from "./transcribir.ts";
import { cambiarVideo, guardarArchivoVideo, guardarAvance, traerArchivo } from "./almacen-video.ts";
import type { FormatoVideo, Ocupado, TrabajoVideo } from "./tipos.ts";

/** Un paso que lleva más que esto se considera perdido (la función de Vercel dura 5 minutos). */
const VENCE_MS = 6 * 60 * 1000;
/** Videos más largos que esto no caben en una vuelta de 5 minutos en Vercel. */
export const MAX_SEGUNDOS = Number(process.env.ANONYMO_VIDEO_MAX_SEG ?? 180);

export const estaOcupado = (t: TrabajoVideo, ahora = Date.now()) => !!t.ocupado && ahora - Date.parse(t.ocupado.desde) < VENCE_MS;

/** La huella de lo que se pidió: si cambia la edición, el resultado anterior queda viejo. */
export function huellaEdicion(t: Pick<TrabajoVideo, "edicion" | "transcripcion" | "duracion">, formato: FormatoVideo) {
  return createHash("sha256").update(textoHuella(t, formato)).digest("hex").slice(0, 16);
}

async function ocupar(id: string, o: Omit<Ocupado, "desde">) {
  const t = await cambiarVideo(id, (t) => {
    if (estaOcupado(t)) throw new Error(t.ocupado!.paso === "transcribir" ? "Ya se está transcribiendo este video." : "Ya se está armando un video. Espera a que termine.");
    t.ocupado = { ...o, desde: new Date().toISOString() };
    t.error = undefined;
  });
  await guardarAvance(id, { avance: o.avance ?? 0, texto: o.texto ?? "" }).catch(() => {});
  return t;
}

/** Guarda el avance como mucho cada 3 segundos, en orden. */
function avisador(id: string) {
  let ultimo = 0, cola: Promise<unknown> = Promise.resolve(), texto = "";
  return (avance: number, nuevo?: string, forzar = false) => {
    if (nuevo) texto = nuevo;
    if (!forzar && Date.now() - ultimo < 3000) return cola;
    ultimo = Date.now();
    const a = Math.max(0, Math.min(1, avance));
    cola = cola.then(() => guardarAvance(id, { avance: a, texto })).catch(() => {});
    return cola;
  };
}

async function conCarpeta<T>(fn: (dir: string) => Promise<T>) {
  const dir = mkdtempSync(join(tmpdir(), "anonymo-video-"));
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function fallar(id: string, e: unknown): Promise<never> {
  await cambiarVideo(id, (t) => {
    t.ocupado = undefined;
    t.error = (e as Error).message;
    if (t.estado === "subiendo") t.estado = "error";
  }).catch(() => {});
  throw e;
}

/** Mide el video, saca el audio y lo transcribe con tiempos por palabra. */
export async function transcribirVideo(id: string, o: { idioma?: string } = {}) {
  const t = await ocupar(id, { paso: "transcribir", avance: 0.05, texto: "Abriendo el video" });
  const avisar = avisador(id);
  try {
    return await conCarpeta(async (dir) => {
      const video = await traerArchivo(id, t.original!, join(dir, t.original!));
      const m = await medirVideo(video);
      if (!m.audio) throw new Error("Este video no tiene sonido: no hay voz que transcribir.");
      if (m.duracion > MAX_SEGUNDOS) throw new Error(`El video dura ${Math.round(m.duracion)} s. Por ahora el máximo es ${MAX_SEGUNDOS} s (${Math.round(MAX_SEGUNDOS / 60)} min).`);
      const bytes = statSync(video).size;
      await avisar(0.25, "Separando la voz", true);
      const audio = await sacarAudio(video, join(dir, "voz.mp3"));
      await avisar(0.4, "Escuchando cada palabra", true);
      const tr = await transcribir(audio, o);
      if (!tr.palabras.length) throw new Error("No se escuchó ninguna palabra en el video.");
      return cambiarVideo(id, (x) => {
        Object.assign(x, { duracion: m.duracion, ancho: m.ancho, alto: m.alto, bytes, transcripcion: tr, estado: "transcrito" as const, ocupado: undefined, error: undefined });
        // Con otra transcripción, los cortes a mano de antes ya no apuntan a las mismas palabras.
        x.edicion.quitadas = [];
        x.resultados = [];
      });
    });
  } catch (e) {
    return fallar(id, e);
  }
}

/** Arma el video final en un formato y lo guarda junto al original. */
export async function renderVideo(id: string, formato: FormatoVideo) {
  const t = await ocupar(id, { paso: "render", formato, avance: 0.02, texto: "Preparando" });
  const avisar = avisador(id);
  try {
    if (!t.transcripcion || !t.duracion) throw new Error("Primero hay que transcribir el video.");
    return await conCarpeta(async (dir) => {
      const video = await traerArchivo(id, t.original!, join(dir, t.original!));
      const m = await medirVideo(video);
      const plan = planEdicion(t.transcripcion, t.edicion, t.duracion!, formato === "9:16");
      const ass = plan.grupos.length ? join(dir, "subtitulos.ass") : undefined;
      if (ass) writeFileSync(ass, archivoAss(plan.grupos, t.edicion.subtitulos, formato));
      await avisar(0.05, "Cortando y poniendo subtítulos", true);
      const archivo = `final-${formato.replace(":", "x")}.mp4`;
      const salida = join(dir, archivo);
      const inicio = Date.now();
      await renderizar({ entrada: video, salida, tramos: plan.tramos, formato, edicion: t.edicion, ass, audio: m.audio, carpeta: dir, alAvanzar: (s) => { void avisar(0.05 + 0.85 * Math.min(1, s / Math.max(0.1, plan.duracion))); } });
      await avisar(0.92, "Guardando el resultado", true);
      await guardarArchivoVideo(id, archivo, salida);
      const listo = { formato, archivo, listo: new Date().toISOString(), segundos: Math.round((Date.now() - inicio) / 1000), bytes: statSync(salida).size, huella: huellaEdicion(t, formato) };
      return cambiarVideo(id, (x) => {
        x.resultados = [...x.resultados.filter((r) => r.formato !== formato), listo];
        x.ocupado = undefined;
      });
    });
  } catch (e) {
    return fallar(id, e);
  }
}
