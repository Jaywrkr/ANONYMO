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

/** Lo que el render toma del kit de marca (sistema/65), ya bajado al disco. */
export interface MarcaRender { logo?: string; musica?: string; color: string; texto: string; nombre: string }

/** Las entradas del render en orden: 0 = video, después logo y música si se usan. */
function entradas(ed: Edicion, m?: MarcaRender) {
  const usaLogo = !!m?.logo && (ed.marca.logoEsquina || ed.marca.cierre);
  const usaMusica = !!m?.musica && ed.marca.musica;
  return { logo: usaLogo ? 1 : -1, musica: usaMusica ? (usaLogo ? 2 : 1) : -1, cierre: ed.marca.cierre && !!m };
}

/**
 * Los filtros del render. Por tramo: corta, encuadra al formato llenando el cuadro y, si toca, cierra el plano
 * (zoom). Une los tramos con corte seco o fundido corto. Pone el logo en la esquina y el cierre con el logo
 * sobre el color de la marca. El audio: la voz con un fundido de 12 ms en cada corte (sin clics), la música
 * de la marca que baja sola cuando se habla (sidechain) y todo al nivel de redes (−14 LUFS).
 */
export function filtrosRender(tramos: TramoVideo[], formato: FormatoVideo, ed: Edicion, o: { audio: boolean; zooms?: boolean[]; marca?: MarcaRender; textoCierre?: string }) {
  const { ancho: W, alto: H } = MEDIDAS[formato];
  const ent = entradas(ed, o.marca);
  const f: string[] = [];
  const fade = 0.012;
  const fundido = ed.motion.transicion === "fundido" && tramos.length > 1;
  const df = fundido ? duracionFundidoTramos(tramos) : 0;
  const z = ZOOM_RENDER;
  tramos.forEach((t, i) => {
    const d = t.fin - t.inicio;
    const cerrar = o.zooms?.[i] ? `,scale=${Math.round((W * z) / 2) * 2}:${Math.round((H * z) / 2) * 2}:flags=lanczos,crop=${W}:${H}` : "";
    f.push(`[0:v]trim=start=${t.inicio.toFixed(3)}:end=${t.fin.toFixed(3)},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}${cerrar},setsar=1,fps=30,format=yuv420p[v${i}]`);
    if (o.audio) f.push(`[0:a]atrim=start=${t.inicio.toFixed(3)}:end=${t.fin.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, d - fade).toFixed(3)}:d=${fade}[a${i}]`);
  });
  // Unir los tramos.
  let video = "v0", voz = o.audio ? "a0" : "";
  if (tramos.length > 1 && fundido) {
    let acum = tramos[0].fin - tramos[0].inicio;
    for (let i = 1; i < tramos.length; i++) {
      f.push(`[${video}][v${i}]xfade=transition=fade:duration=${df.toFixed(3)}:offset=${(acum - df).toFixed(3)}[x${i}]`);
      if (o.audio) f.push(`[${voz}][a${i}]acrossfade=d=${df.toFixed(3)}:c1=tri:c2=tri[y${i}]`);
      video = `x${i}`; voz = o.audio ? `y${i}` : "";
      acum += tramos[i].fin - tramos[i].inicio - df;
    }
  } else if (tramos.length > 1) {
    f.push(`${tramos.map((_, i) => (o.audio ? `[v${i}][a${i}]` : `[v${i}]`)).join("")}concat=n=${tramos.length}:v=1:a=${o.audio ? 1 : 0}${o.audio ? "[vc][ac]" : "[vc]"}`);
    video = "vc"; voz = o.audio ? "ac" : "";
  }
  // Logo: uno para la esquina y otro para el cierre.
  const logos: string[] = [];
  if (ent.logo >= 0) {
    const usos = [ed.marca.logoEsquina ? "le" : "", ent.cierre ? "lc" : ""].filter(Boolean);
    f.push(`[${ent.logo}:v]format=rgba${usos.length > 1 ? `,split=2[${usos[0]}0][${usos[1]}0]` : `[${usos[0]}0]`}`);
    logos.push(...usos);
  }
  if (logos.includes("le")) {
    const lado = Math.round(Math.min(W, H) * 0.16);
    f.push(`[le0]scale=${lado}:${lado}:force_original_aspect_ratio=decrease,colorchannelmixer=aa=0.9[le]`);
    const mx = Math.round(W * 0.05), my = Math.round(H * (formato === "9:16" ? 0.06 : 0.05));
    f.push(`[${video}][le]overlay=W-w-${mx}:${my}:format=auto,format=yuv420p[vl]`);
    video = "vl";
  }
  // Cierre: el color de la marca con el logo (o el nombre) al centro, que entra con un fundido.
  const cs = ed.marca.cierreSegundos;
  if (ent.cierre && o.marca) {
    f.push(`color=c=${o.marca.color.replace("#", "0x")}:s=${W}x${H}:r=30:d=${cs},format=yuv420p[fondo]`);
    if (logos.includes("lc")) {
      const lado = Math.round(Math.min(W, H) * 0.42);
      f.push(`[lc0]scale=${lado}:${lado}:force_original_aspect_ratio=decrease[lc]`);
      f.push(`[fondo][lc]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuv420p[cie0]`);
    } else if (o.textoCierre) {
      f.push(`[fondo]ass=${escaparRuta(o.textoCierre)}:fontsdir=${escaparRuta(carpetaFuentes())}[cie0]`);
    } else f.push(`[fondo]null[cie0]`);
    f.push(`[cie0]fade=t=in:st=0:d=0.35,setsar=1[cie]`);
    f.push(`[${video}][cie]concat=n=2:v=1:a=0[vk]`);
    video = "vk";
    if (voz) { f.push(`anullsrc=r=48000:cl=stereo,atrim=0:${cs},asetpts=PTS-STARTPTS[sil]`); f.push(`[${voz}][sil]concat=n=2:v=0:a=1[vozk]`); voz = "vozk"; }
  }
  f.push(`[${video}]null[vo]`);
  // Audio final.
  const total = duracionFinalRender(tramos, ed, ent.cierre);
  const limpiar = ed.audio.limpiarRuido ? "highpass=f=80,afftdn=nf=-25" : "";
  if (voz && limpiar) { f.push(`[${voz}]${limpiar}[vozl]`); voz = "vozl"; }
  let mezcla = voz;
  if (ent.musica >= 0) {
    f.push(`[${ent.musica}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${ed.marca.volumenMusica},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(3)}:d=1.5[mus]`);
    if (voz) {
      // La voz manda: la música baja sola cuando alguien habla.
      f.push(`[${voz}]asplit=2[vozm][vozsc]`);
      f.push(`[mus][vozsc]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[musd]`);
      f.push(`[vozm][musd]amix=inputs=2:duration=first:normalize=0[mix]`);
      mezcla = "mix";
    } else mezcla = "mus";
  }
  if (mezcla) {
    const cadena = [ed.audio.normalizar ? "loudnorm=I=-14:TP=-1.5:LRA=11" : "", "aresample=48000"].filter(Boolean).join(",");
    f.push(`[${mezcla}]${cadena}[ao]`);
  }
  return { filtros: f.join(";\n"), audio: !!mezcla, total };
}

/** Cuánto se acerca el plano cerrado (igual que en la vista previa). */
const ZOOM_RENDER = 1.18;
const duracionFundidoTramos = (tramos: TramoVideo[]) => Math.max(0.05, Math.min(0.25, ...tramos.map((t) => (t.fin - t.inicio) / 2)));
function duracionFinalRender(tramos: TramoVideo[], ed: Edicion, cierre: boolean) {
  const base = tramos.reduce((s, t) => s + t.fin - t.inicio, 0);
  const solape = ed.motion.transicion === "fundido" && tramos.length > 1 ? (tramos.length - 1) * duracionFundidoTramos(tramos) : 0;
  return base - solape + (cierre ? ed.marca.cierreSegundos : 0);
}

/** El nombre de la marca en el cierre cuando no hay logo (libass: el FFmpeg de Vercel no trae drawtext). */
export function assNombre(nombre: string, color: string, formato: FormatoVideo) {
  const { ancho: W, alto: H } = MEDIDAS[formato];
  const hex = color.replace("#", "");
  const c = `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`.toUpperCase();
  const fs = Math.round(Math.min(W, H) * 0.09);
  return ["[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "WrapStyle: 0", "",
    "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: N,Geist SemiBold,${fs},${c},${c},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,${Math.round(W * 0.1)},${Math.round(W * 0.1)},0,1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,0:00:00.00,0:01:00.00,N,,0,0,0,,${nombre.replace(/[{}\\]/g, "").replace(/\n/g, " ").slice(0, 60)}`].join("\n") + "\n";
}

/** Las rutas dentro de un filtro de FFmpeg no pueden llevar «:» ni comillas sin escapar. */
const escaparRuta = (r: string) => r.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,");

export interface OpcionesRender { entrada: string; salida: string; tramos: TramoVideo[]; formato: FormatoVideo; edicion: Edicion; audio: boolean; carpeta: string; zooms?: boolean[]; marca?: MarcaRender; vista?: boolean; alAvanzar?: (seg: number) => void; senal?: AbortSignal }

/** Arma el video final de un formato. Devuelve su duración esperada. */
export async function renderizar(o: OpcionesRender) {
  if (!o.tramos.length) throw new Error("No queda nada del video con estos cortes.");
  const sufijo = o.formato.replace(":", "x");
  const ent = entradas(o.edicion, o.marca);
  let textoCierre: string | undefined;
  if (ent.cierre && o.marca && ent.logo < 0) {
    textoCierre = join(o.carpeta, `cierre-${sufijo}.ass`);
    writeFileSync(textoCierre, assNombre(o.marca.nombre, o.marca.texto, o.formato));
  }
  const r = filtrosRender(o.tramos, o.formato, o.edicion, { audio: o.audio, zooms: o.zooms, marca: o.marca, textoCierre });
  const guion = join(o.carpeta, `filtros-${sufijo}.txt`);
  writeFileSync(guion, r.filtros);
  const args = [
    "-y", "-i", o.entrada,
    ...(ent.logo >= 0 ? ["-i", o.marca!.logo!] : []),
    ...(ent.musica >= 0 ? ["-stream_loop", "-1", "-i", o.marca!.musica!] : []),
    "-filter_complex_script", guion,
    "-map", "[vo]", ...(r.audio ? ["-map", "[ao]"] : []),
    "-c:v", "libx264", "-preset", o.vista ? "ultrafast" : "veryfast", "-crf", o.vista ? "28" : "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
    ...(r.audio ? ["-c:a", "aac", "-b:a", "160k"] : []),
    "-t", r.total.toFixed(3),
    "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", o.salida,
  ];
  await correr(args, { alAvanzar: o.alAvanzar, senal: o.senal });
  return r.total;
}
