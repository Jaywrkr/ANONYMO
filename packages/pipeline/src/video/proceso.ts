// Los pasos pesados del departamento de video (sistema/62): analizar el audio (sistema/64) y armar cada formato.
// Cada paso marca el video como ocupado (para bloquear otro igual y decir qué pasa) y guarda su avance aparte.
// Al terminar se vuelve a leer el video y solo se cambia lo que el paso produjo: si Luna movió la edición
// mientras tanto, no se pierde.
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { edicionSegura, partesDesdeSilencios, planEdicion, textoHuella, zoomDeTramos } from "./edicion.ts";
import { detectarSilencios, hojaDeCuadros, medirVideo, renderizar, umbralSilencio, volumenMedio, type MarcaRender } from "./ffmpeg.ts";
import { leerKit, traerArchivoKit } from "./marcas-video.ts";
import { cambiarVideo, guardarArchivoVideo, guardarAvance, traerArchivo } from "./almacen-video.ts";
import type { FormatoVideo, KitMarca, Ocupado, TrabajoVideo } from "./tipos.ts";

/** Un paso que lleva más que esto se considera perdido (la función de Vercel dura 5 minutos). */
const VENCE_MS = 6 * 60 * 1000;
/** Videos más largos que esto no caben en una vuelta de 5 minutos en Vercel. */
export const MAX_SEGUNDOS = Number(process.env.ANONYMO_VIDEO_MAX_SEG ?? 180);

export const estaOcupado = (t: TrabajoVideo, ahora = Date.now()) => !!t.ocupado && ahora - Date.parse(t.ocupado.desde) < VENCE_MS;

/** La huella de lo que se pidió: si cambia la edición, el resultado anterior queda viejo. */
export function huellaEdicion(t: Pick<TrabajoVideo, "edicion" | "analisis" | "duracion" | "marca">, formato: FormatoVideo, kit?: Pick<KitMarca, "actualizado">) {
  return createHash("sha256").update(textoHuella({ ...t, kit: kit?.actualizado }, formato)).digest("hex").slice(0, 16);
}

async function ocupar(id: string, o: Omit<Ocupado, "desde">) {
  const t = await cambiarVideo(id, (t) => {
    if (estaOcupado(t)) throw new Error(t.ocupado!.paso === "analizar" ? "Ya se está escuchando este video." : "Ya se está armando un video. Espera a que termine.");
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

/**
 * Escucha el video sin transcribirlo (sistema/64): mide el volumen, encuentra los silencios, divide el video en
 * partes (cada tramo con voz o sonido) y saca una hoja con la miniatura de cada parte.
 */
export async function analizarVideo(id: string) {
  const t = await ocupar(id, { paso: "analizar", avance: 0.05, texto: "Abriendo el video" });
  const avisar = avisador(id);
  try {
    return await conCarpeta(async (dir) => {
      const video = await traerArchivo(id, t.original!, join(dir, t.original!));
      const m = await medirVideo(video);
      if (m.duracion > MAX_SEGUNDOS) throw new Error(`El video dura ${Math.round(m.duracion)} s. Por ahora el máximo es ${MAX_SEGUNDOS} s (${Math.round(MAX_SEGUNDOS / 60)} min).`);
      const bytes = statSync(video).size;
      let partes = [{ inicio: 0, fin: m.duracion }];
      let umbralDb = 0;
      if (m.audio) {
        await avisar(0.2, "Escuchando dónde se habla y dónde hay silencio", true);
        umbralDb = umbralSilencio(await volumenMedio(video));
        partes = partesDesdeSilencios(await detectarSilencios(video, umbralDb), m.duracion);
        if (!partes.length) throw new Error("No se escucha nada en el video: no hay voz ni sonido que cortar.");
      }
      await avisar(0.6, "Sacando una imagen de cada parte", true);
      const archivo = "cuadros.jpg";
      const hoja = await hojaDeCuadros(video, partes, dir, join(dir, archivo), { ancho: m.ancho, alto: m.alto });
      await guardarArchivoVideo(id, archivo, join(dir, archivo), "image/jpeg");
      return cambiarVideo(id, (x) => {
        Object.assign(x, { duracion: m.duracion, ancho: m.ancho, alto: m.alto, bytes, estado: "analizado" as const, ocupado: undefined, error: undefined });
        x.analisis = { partes, umbralDb, cuadros: { archivo, ...hoja } };
        // Con otro análisis, las partes quitadas de antes ya no son las mismas.
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
    if (!t.analisis || !t.duracion) throw new Error("Primero hay que escuchar el video.");
    return await conCarpeta(async (dir) => {
      const video = await traerArchivo(id, t.original!, join(dir, t.original!));
      const m = await medirVideo(video);
      const edicion = edicionSegura(t.edicion, t.edicion);
      const plan = planEdicion(t.analisis, edicion, t.duracion!);
      // El kit de marca del video (sistema/65): se baja solo lo que la edición usa.
      const kit = t.marca ? await leerKit(t.marca) : undefined;
      if (t.marca && !kit) throw new Error("No encontramos la marca de este video. Elige otra o quítala.");
      let marca: MarcaRender | undefined;
      if (kit) {
        const usaLogo = kit.logo && (edicion.marca.logoEsquina || edicion.marca.cierre);
        const usaMusica = kit.musica && edicion.marca.musica;
        marca = {
          nombre: kit.nombre, color: kit.color, texto: kit.texto,
          logo: usaLogo ? await traerArchivoKit(kit.id, kit.logo!, join(dir, kit.logo!)) : undefined,
          musica: usaMusica ? await traerArchivoKit(kit.id, kit.musica!.archivo, join(dir, kit.musica!.archivo)) : undefined,
        };
      }
      await avisar(0.05, "Cortando, encuadrando y poniendo la marca", true);
      const archivo = `final-${formato.replace(":", "x")}.mp4`;
      const salida = join(dir, archivo);
      const inicio = Date.now();
      const total = plan.duracion + (edicion.marca.cierre && marca ? edicion.marca.cierreSegundos : 0);
      await renderizar({ entrada: video, salida, tramos: plan.tramos, formato, edicion, audio: m.audio, carpeta: dir, zooms: zoomDeTramos(plan.tramos, t.analisis, edicion), marca, alAvanzar: (s) => { void avisar(0.05 + 0.85 * Math.min(1, s / Math.max(0.1, total))); } });
      await avisar(0.92, "Guardando el resultado", true);
      await guardarArchivoVideo(id, archivo, salida);
      const listo = { formato, archivo, listo: new Date().toISOString(), segundos: Math.round((Date.now() - inicio) / 1000), bytes: statSync(salida).size, huella: huellaEdicion(t, formato, kit) };
      return cambiarVideo(id, (x) => {
        x.resultados = [...x.resultados.filter((r) => r.formato !== formato), listo];
        x.ocupado = undefined;
      });
    });
  } catch (e) {
    return fallar(id, e);
  }
}
