// Motion, primera parte (sistema/62): las plantillas de subtítulos de la casa y el archivo .ass que dibuja FFmpeg.
// La vista previa del navegador lee las mismas medidas (`estiloSub`) para verse igual que el render.
import type { Edicion, FormatoVideo, IdPlantilla } from "./tipos.ts";
import type { GrupoSub } from "./edicion.ts";

export interface PlantillaSub {
  id: IdPlantilla;
  nombre: string;
  /** Para qué sirve, en una frase. */
  uso: string;
  /** Familia y peso de Geist (incluida en el repo, licencia OFL). */
  fuente: "Geist Black" | "Geist Bold" | "Geist SemiBold";
  peso: number;
  mayusculas: boolean;
  /** Tamaño de letra como fracción del lado corto del video. */
  escala: number;
  /** Resalta la palabra que se está diciendo con el color de acento. */
  resalta: boolean;
  /** Fondo oscuro detrás del texto. */
  caja: boolean;
}

export const PLANTILLAS_SUB: PlantillaSub[] = [
  { id: "marca", nombre: "Marca", uso: "Pocas palabras grandes y la que se dice en color. Para reels y anuncios.", fuente: "Geist Black", peso: 900, mayusculas: true, escala: 0.088, resalta: true, caja: false },
  { id: "limpio", nombre: "Limpio", uso: "Frase completa, discreta, abajo. Para entrevistas y testimonios.", fuente: "Geist SemiBold", peso: 600, mayusculas: false, escala: 0.046, resalta: false, caja: false },
  { id: "caja", nombre: "Caja", uso: "Texto sobre fondo oscuro: se lee sobre cualquier imagen.", fuente: "Geist Bold", peso: 700, mayusculas: false, escala: 0.05, resalta: false, caja: true },
];
export const plantillaSub = (id: IdPlantilla) => PLANTILLAS_SUB.find((p) => p.id === id) ?? PLANTILLAS_SUB[0];

/** Tamaño de salida de cada formato. */
export const MEDIDAS: Record<FormatoVideo, { ancho: number; alto: number }> = {
  "9:16": { ancho: 1080, alto: 1920 },
  "1:1": { ancho: 1080, alto: 1080 },
  "16:9": { ancho: 1920, alto: 1080 },
};

/**
 * Dónde y qué tan grande va el texto, en fracciones del cuadro (0–1).
 * En vertical, «abajo» queda sobre la zona que tapan los botones de Reels y TikTok.
 */
export function estiloSub(s: Edicion["subtitulos"], formato: FormatoVideo) {
  const p = plantillaSub(s.plantilla);
  const { ancho, alto } = MEDIDAS[formato];
  const corto = Math.min(ancho, alto);
  const vertical = formato === "9:16";
  const y = s.posicion === "arriba" ? 0.2 : s.posicion === "centro" ? (vertical ? 0.64 : 0.6) : vertical ? 0.76 : 0.86;
  return { plantilla: p, tamano: (p.escala * s.tamano * corto) / alto, y, margen: vertical ? 0.08 : 0.1 };
}

/** «#ffd43b» → «&H003BD4FF» (ASS guarda el color al revés: azul, verde, rojo). */
export function colorAss(hex: string, alfa = 0) {
  const h = hex.replace("#", "");
  return `&H${alfa.toString(16).padStart(2, "0").toUpperCase()}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}

const tiempo = (s: number) => {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), seg = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
/** El texto no puede abrir llaves ni barras: ASS las leería como órdenes. */
const seguro = (t: string) => t.replace(/[{}]/g, "").replace(/\\/g, "/").replace(/\n/g, " ");

/** El archivo de subtítulos completo para un formato. */
export function archivoAss(grupos: GrupoSub[], s: Edicion["subtitulos"], formato: FormatoVideo): string {
  const { ancho, alto } = MEDIDAS[formato];
  const { plantilla: p, tamano, y, margen } = estiloSub(s, formato);
  const fs = Math.round(tamano * alto);
  const blanco = "&H00FFFFFF", negro = colorAss("#000000"), acento = colorAss(s.acento);
  const borde = p.caja ? Math.round(fs * 0.28) : p.id === "marca" ? Math.max(3, Math.round(fs * 0.09)) : Math.max(2, Math.round(fs * 0.07));
  const fondo = p.caja ? colorAss("#000000", 0x38) : negro;
  const sombra = p.caja ? 0 : p.id === "marca" ? Math.round(fs * 0.04) : Math.round(fs * 0.05);
  const ml = Math.round(ancho * margen);
  const px = Math.round(ancho / 2), py = Math.round(alto * y);
  const lineas = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${ancho}`,
    `PlayResY: ${alto}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Base,${p.fuente},${fs},${blanco},${acento},${p.caja ? fondo : negro},${colorAss("#000000", p.caja ? 0x38 : 0x60)},0,0,0,0,100,100,${p.id === "marca" ? -1 : 0},0,${p.caja ? 3 : 1},${borde},${sombra},5,${ml},${ml},0,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const texto = (w: string) => seguro(p.mayusculas ? w.toLocaleUpperCase("es") : w);
  for (const g of grupos) {
    const pos = `\\an5\\pos(${px},${py})`;
    // Entrada con un pequeño golpe de escala: se siente vivo sin distraer.
    const entra = p.id === "marca" ? "\\fscx86\\fscy86\\t(0,110,\\fscx100\\fscy100)" : "\\alpha&HFF&\\t(0,120,\\alpha&H00&)";
    if (!p.resalta) {
      lineas.push(`Dialogue: 0,${tiempo(g.inicio)},${tiempo(g.fin)},Base,,0,0,0,,{${pos}${entra}}${g.palabras.map((w) => texto(w.texto)).join(" ")}`);
      continue;
    }
    // Una línea por palabra dicha: la que suena va en el color de acento.
    g.palabras.forEach((w, k) => {
      const ini = k === 0 ? g.inicio : w.inicio;
      const fin = k + 1 < g.palabras.length ? g.palabras[k + 1].inicio : g.fin;
      if (fin - ini <= 0.005) return;
      const cuerpo = g.palabras.map((x, j) => (j === k ? `{\\c${acento}}${texto(x.texto)}{\\c${blanco}}` : texto(x.texto))).join(" ");
      lineas.push(`Dialogue: 0,${tiempo(ini)},${tiempo(fin)},Base,,0,0,0,,{${pos}${k === 0 ? entra : ""}}${cuerpo}`);
    });
  }
  return lineas.join("\n") + "\n";
}
