// FFmpeg para el departamento de video (sistema/62; sin transcripción desde sistema/64): medir el video,
// escuchar dónde hay silencio, sacar las miniaturas de cada parte y armar el resultado.
// En Vercel no hay FFmpeg instalado: se usa el de `ffmpeg-static`.
// En tu máquina puedes elegir otro con ANONYMO_FFMPEG=/ruta/ffmpeg.
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Edicion, FormatoVideo, TramoVideo } from "./tipos.ts";

/** Tamaño de salida de cada formato. */
export const MEDIDAS: Record<FormatoVideo, { ancho: number; alto: number }> = {
  "9:16": { ancho: 1080, alto: 1920 },
  "1:1": { ancho: 1080, alto: 1080 },
  "16:9": { ancho: 1920, alto: 1080 },
};

/**
 * Carpeta con la fuente de los números de las miniaturas (Geist, OFL). En el servidor de Next el código va empaquetado
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
  return candidatos.find((c) => c && existsSync(join(c, ["Geist-SemiBold", "ttf"].join(".")))) ?? candidatos[1];
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
    p.stderr.on("data", (d: Buffer) => { err = (err + d.toString()).slice(-4_000_000); });
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

/** Volumen medio del audio (dB), para saber qué es silencio en este video. */
export async function volumenMedio(video: string): Promise<number> {
  const t = await correr(["-i", video, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
  const m = t.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/);
  return m ? Number(m[1]) : -30;
}

/**
 * El umbral de silencio sale del volumen del propio video: 12 dB por debajo del promedio,
 * entre −50 dB (estudio muy silencioso) y −26 dB (calle con ruido).
 */
export const umbralSilencio = (medio: number) => Math.round(Math.min(-26, Math.max(-50, medio - 12)) * 10) / 10;

/** Los silencios del audio (de al menos `minimo` segundos), con su inicio y fin. */
export async function detectarSilencios(video: string, umbralDb: number, minimo = 0.2): Promise<TramoVideo[]> {
  const t = await correr(["-i", video, "-vn", "-af", `silencedetect=noise=${umbralDb}dB:d=${minimo}`, "-f", "null", "-"]);
  return leerSilencios(t);
}

export function leerSilencios(t: string): TramoVideo[] {
  const out: TramoVideo[] = [];
  let inicio: number | undefined;
  for (const l of t.split("\n")) {
    const a = l.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    if (a) inicio = Math.max(0, Number(a[1]));
    const b = l.match(/silence_end:\s*(\d+(?:\.\d+)?)/);
    if (b && inicio !== undefined) { out.push({ inicio, fin: Number(b[1]) }); inicio = undefined; }
  }
  // Un silencio que llega hasta el final no trae «silence_end».
  if (inicio !== undefined) out.push({ inicio, fin: Number.POSITIVE_INFINITY });
  return out;
}

/**
 * Una hoja con una miniatura por parte, numeradas desde 1, en filas de `columnas`.
 * La ve Luna para elegir qué quitar y la ve Atlas para entender el video sin transcribirlo.
 */
export async function hojaDeCuadros(video: string, partes: TramoVideo[], carpeta: string, salida: string, o: { ancho?: number; alto?: number; columnas?: number } = {}) {
  const total = Math.min(partes.length, 80);
  const vertical = (o.alto ?? 16) > (o.ancho ?? 9);
  const ancho = vertical ? 120 : 192;
  const alto = Math.round(((o.alto && o.ancho ? o.alto / o.ancho : 16 / 9) * ancho) / 2) * 2 || 214;
  const columnas = Math.min(o.columnas ?? 10, Math.max(1, total));
  for (let i = 0; i < total; i++) {
    const p = partes[i];
    const t = Math.max(0, p.inicio + Math.min(0.4, (p.fin - p.inicio) / 2));
    await correr(["-y", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1", "-vf", `scale=${ancho}:${alto}:force_original_aspect_ratio=increase,crop=${ancho}:${alto}`, "-q:v", "4", join(carpeta, `c-${String(i + 1).padStart(3, "0")}.jpg`)]);
  }
  const filas = Math.ceil(total / columnas), hueco = 4;
  // Los números van con libass (el FFmpeg de Vercel no trae drawtext): un .ass con un número por miniatura.
  const W = columnas * ancho + (columnas - 1) * hueco, H = filas * alto + (filas - 1) * hueco;
  const fs = Math.round(ancho / 5);
  const numeros = join(carpeta, "numeros.ass");
  writeFileSync(numeros, [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: N,Geist SemiBold,${fs},&H00FFFFFF,&H00FFFFFF,&H48000000,&H00000000,0,0,0,0,100,100,0,0,3,${Math.round(fs / 4)},0,7,0,0,0,1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...Array.from({ length: total }, (_, i) => `Dialogue: 0,0:00:00.00,0:00:10.00,N,,0,0,0,,{\\pos(${(i % columnas) * (ancho + hueco) + 8},${Math.floor(i / columnas) * (alto + hueco) + 6})}${i + 1}`),
  ].join("\n") + "\n");
  await correr(["-y", "-framerate", "1", "-i", join(carpeta, "c-%03d.jpg"), "-vf", `tile=${columnas}x${filas}:padding=${hueco}:color=white,ass=${escaparRuta(numeros)}:fontsdir=${escaparRuta(carpetaFuentes())}`, "-frames:v", "1", "-q:v", "4", salida]);
  return { columnas, ancho, alto, total };
}

/**
 * Los filtros del render: corta y une los tramos (con un fundido de 12 ms para que no suene un clic),
 * encuadra al formato llenando el cuadro y deja el volumen en el nivel de redes (−14 LUFS).
 */
export function filtrosRender(tramos: TramoVideo[], formato: FormatoVideo, ed: Edicion, o: { audio: boolean }) {
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
  f.push(`[vc]scale=${ancho}:${alto}:force_original_aspect_ratio=increase:flags=lanczos,crop=${ancho}:${alto},setsar=1,fps=30,format=yuv420p[vo]`);
  if (o.audio) {
    const cadena = [ed.audio.limpiarRuido ? "highpass=f=80,afftdn=nf=-25" : "", ed.audio.normalizar ? "loudnorm=I=-14:TP=-1.5:LRA=11" : "", "aresample=48000"].filter(Boolean).join(",");
    f.push(`[ac]${cadena}[ao]`);
  }
  return f.join(";\n");
}
/** Las rutas dentro de un filtro de FFmpeg no pueden llevar «:» ni comillas sin escapar. */
const escaparRuta = (r: string) => r.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,");

export interface OpcionesRender { entrada: string; salida: string; tramos: TramoVideo[]; formato: FormatoVideo; edicion: Edicion; audio: boolean; carpeta: string; vista?: boolean; alAvanzar?: (seg: number) => void; senal?: AbortSignal }

/** Arma el video final de un formato. */
export async function renderizar(o: OpcionesRender) {
  if (!o.tramos.length) throw new Error("No queda nada del video con estos cortes.");
  const guion = join(o.carpeta, `filtros-${o.formato.replace(":", "x")}.txt`);
  writeFileSync(guion, filtrosRender(o.tramos, o.formato, o.edicion, { audio: o.audio }));
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
