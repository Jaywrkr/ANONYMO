// FFmpeg para el departamento de video (sistema/62): medirVideo el video, sacar el audio y armar el resultado.
// En Vercel no hay FFmpeg instalado: se usa el de `ffmpeg-static` (trae libass para los subtítulos).
// En tu máquina puedes elegir otro con ANONYMO_FFMPEG=/ruta/ffmpeg.
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Edicion, FormatoVideo, TramoVideo } from "./tipos.ts";
import { MEDIDAS } from "./subtitulos.ts";

/**
 * Carpeta con las fuentes de la casa (Geist, OFL). En el servidor de Next el código va empaquetado
 * y `import.meta.url` ya no apunta aquí: se buscan también desde la carpeta de trabajo.
 */
export function carpetaFuentes(): string {
  const sub = [process.env.ANONYMO_FUENTES_SUB ?? "fuentes"].join("");
  const candidatos = [
    process.env.ANONYMO_FUENTES_VIDEO ?? "",
    (() => { try { return join(dirname(fileURLToPath(import.meta.url)), sub); } catch { return ""; } })(),
    join(process.cwd(), "packages/pipeline/src/video", sub),
    join(process.cwd(), "../../packages/pipeline/src/video", sub),
  ];
  return candidatos.find((c) => c && existsSync(join(c, ["Geist-Black", "ttf"].join(".")))) ?? candidatos[1];
}

let binario: string | undefined;
/**
 * El FFmpeg que se usa: ANONYMO_FFMPEG, el de `ffmpeg-static` o el del sistema.
 * Se busca por ruta y no con import(): así el binario (80 MB) solo viaja en la función que arma videos
 * (next.config.ts lo incluye ahí) y no en todas las demás.
 */
export async function rutaFfmpeg(): Promise<string> {
  if (process.env.ANONYMO_FFMPEG) return process.env.ANONYMO_FFMPEG;
  if (binario) return binario;
  // El nombre llega en una variable: el rastreador de Next no puede seguirlo y no lo mete en cada función.
  const paquete = [process.env.ANONYMO_FFMPEG_PAQUETE ?? "ffmpeg-static", "ffmpeg"].join("/");
  const candidatos = ["node_modules", "../../node_modules", "../node_modules"].map((d) => join(/* turbopackIgnore: true */ process.cwd(), d, paquete));
  return (binario = candidatos.find((c) => existsSync(c)) ?? "ffmpeg");
}

/** Corre FFmpeg; `alAvanzar` recibe los segundos de salida ya escritos. */
export async function correr(args: string[], o: { alAvanzar?: (seg: number) => void; senal?: AbortSignal } = {}): Promise<string> {
  const bin = await rutaFfmpeg();
  return new Promise((ok, mal) => {
    const p = spawn(/* turbopackIgnore: true */ bin, ["-hide_banner", "-nostdin", ...args], { stdio: ["ignore", "pipe", "pipe"], signal: o.senal });
    let err = "";
    let resto = "";
    p.stdout.on("data", (d: Buffer) => {
      resto += d.toString();
      const lineas = resto.split("\n");
      resto = lineas.pop() ?? "";
      for (const l of lineas) {
        const m = l.match(/^out_time_(?:us|ms)=(\d+)/);
        if (m) o.alAvanzar?.(Number(m[1]) / 1e6);
      }
    });
    p.stderr.on("data", (d: Buffer) => { err = (err + d.toString()).slice(-20000); });
    p.on("error", (e) => mal(new Error(`No se pudo abrir FFmpeg (${(e as Error).message}).`)));
    p.on("close", (c) => (c === 0 ? ok(err) : mal(new Error(`FFmpeg no pudo terminar: ${ultimaLinea(err)}`))));
  });
}
const ultimaLinea = (t: string) => t.trim().split("\n").filter((l) => !/^\s*(frame|size|Last message)/.test(l)).slice(-2).join(" · ").slice(0, 300);

export interface Medida { duracion: number; ancho: number; alto: number; audio: boolean; rotacion: number }

/** Duración, tamaño (ya girado) y si tiene sonido. Sin ffprobe: lo dice el propio FFmpeg. */
export async function medirVideo(archivo: string): Promise<Medida> {
  const bin = await rutaFfmpeg();
  const salida = await new Promise<string>((ok, mal) => {
    const p = spawn(/* turbopackIgnore: true */ bin, ["-hide_banner", "-i", archivo], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    p.on("error", (e) => mal(new Error(`No se pudo abrir FFmpeg (${(e as Error).message}).`)));
    p.on("close", () => ok(err));
  });
  return leerMedida(salida);
}

export function leerMedida(t: string): Medida {
  const d = t.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!d) throw new Error("No parece un video que se pueda abrir.");
  const duracion = Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
  const v = t.match(/Stream #[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/);
  const rot = Number(t.match(/rotate\s*:\s*(-?\d+)/)?.[1] ?? t.match(/rotation of (-?\d+(?:\.\d+)?) degrees/)?.[1] ?? 0);
  let ancho = Number(v?.[1] ?? 0), alto = Number(v?.[2] ?? 0);
  if (Math.abs(Math.round(rot)) % 180 === 90) [ancho, alto] = [alto, ancho];
  return { duracion, ancho, alto, audio: /Stream #[^\n]*Audio:/.test(t), rotacion: rot };
}

/** Audio liviano para transcribir (mono, 16 kHz, 48 kbps): 1 hora pesa ~21 MB, dentro del límite de Whisper. */
export async function sacarAudio(video: string, salida: string) {
  await correr(["-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", salida]);
  return salida;
}

/**
 * Los filtros del render: corta y une los tramos (con un fundido de 12 ms para que no suene un clic),
 * encuadra al formato llenando el cuadro, quema los subtítulos y deja el volumen en el nivel de redes (−14 LUFS).
 */
export function filtrosRender(tramos: TramoVideo[], formato: FormatoVideo, ed: Edicion, o: { ass?: string; audio: boolean; fuentes?: string }) {
  const { ancho, alto } = MEDIDAS[formato];
  const f: string[] = [];
  const fade = 0.012;
  tramos.forEach((t, i) => {
    const d = (t.fin - t.inicio).toFixed(3);
    f.push(`[0:v]trim=start=${t.inicio.toFixed(3)}:end=${t.fin.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
    if (o.audio) f.push(`[0:a]atrim=start=${t.inicio.toFixed(3)}:end=${t.fin.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, Number(d) - fade).toFixed(3)}:d=${fade}[a${i}]`);
  });
  const ent = tramos.map((_, i) => (o.audio ? `[v${i}][a${i}]` : `[v${i}]`)).join("");
  f.push(`${ent}concat=n=${tramos.length}:v=1:a=${o.audio ? 1 : 0}${o.audio ? "[vc][ac]" : "[vc]"}`);
  const sub = o.ass ? `,ass=${escaparRuta(o.ass)}:fontsdir=${escaparRuta(o.fuentes ?? carpetaFuentes())}` : "";
  f.push(`[vc]scale=${ancho}:${alto}:force_original_aspect_ratio=increase:flags=lanczos,crop=${ancho}:${alto},setsar=1,fps=30,format=yuv420p${sub}[vo]`);
  if (o.audio) {
    const cadena = [ed.audio.limpiarRuido ? "highpass=f=80,afftdn=nf=-25" : "", ed.audio.normalizar ? "loudnorm=I=-14:TP=-1.5:LRA=11" : "", "aresample=48000"].filter(Boolean).join(",");
    f.push(`[ac]${cadena}[ao]`);
  }
  return f.join(";\n");
}
/** Las rutas dentro de un filtro de FFmpeg no pueden llevar «:» ni comillas sin escapar. */
const escaparRuta = (r: string) => r.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,");

export interface OpcionesRender { entrada: string; salida: string; tramos: TramoVideo[]; formato: FormatoVideo; edicion: Edicion; ass?: string; audio: boolean; carpeta: string; vista?: boolean; alAvanzar?: (seg: number) => void; senal?: AbortSignal }

/** Arma el video final de un formato. */
export async function renderizar(o: OpcionesRender) {
  if (!o.tramos.length) throw new Error("No queda nada del video con estos cortes.");
  const guion = join(o.carpeta, `filtros-${o.formato.replace(":", "x")}.txt`);
  writeFileSync(guion, filtrosRender(o.tramos, o.formato, o.edicion, { ass: o.ass, audio: o.audio }));
  const args = [
    "-y", "-i", o.entrada,
    "-filter_complex_script", guion,
    "-map", "[vo]", ...(o.audio ? ["-map", "[ao]"] : []),
    "-c:v", "libx264", "-preset", o.vista ? "ultrafast" : "veryfast", "-crf", o.vista ? "28" : "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
    ...(o.audio ? ["-c:a", "aac", "-b:a", "160k"] : []),
    "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", o.salida,
  ];
  await correr(args, { alAvanzar: o.alAvanzar, senal: o.senal });
  return o.salida;
}
