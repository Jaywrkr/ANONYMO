// Los colores de cada muestra (sistema/85). Regla de Jay: se respeta el color del negocio; si no se sabe, va el de su rubro.
// De dónde sale el color del negocio: el que Jay pone a mano, o el que su web declara (theme-color) o más usa en su CSS.
// De un solo color sale la paleta completa de cada plantilla, con contraste comprobado para que el texto siempre se lea.
import type { PlantillaMuestra, Prospecto } from "./tipos.ts";

export type Tono = "salud" | "legal" | "belleza" | "otro";

export interface Paleta {
  /** El papel: el fondo donde va el contenido. */
  fondo: string;
  tinta: string;
  /** El color de la marca. */
  bloque: string;
  sobreBloque: string;
  /** El color que salta: botones y sellos. */
  acento: string;
  sobreAcento: string;
  suave: string;
  texto: string;
  linea: string;
  /** Los tres colores del cielo que hace de imagen mientras el negocio no sube sus fotos. */
  cielo: [string, string, string];
}

/** El color de cada rubro cuando no se conoce el del negocio. */
export const COLOR_RUBRO: Record<Tono, string> = { salud: "#0B5D5A", legal: "#172B5E", belleza: "#7A1E46", otro: "#1E3FCF" };

export const colorValido = (c: unknown): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

function aHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
const luz = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
/** Contraste WCAG entre dos colores (1 a 21). */
export const contraste = (a: string, b: string) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
/** De dos textos posibles, el que mejor se lee sobre ese fondo. */
const sobre = (fondo: string, claro: string, oscuro: string) => (contraste(fondo, claro) >= contraste(fondo, oscuro) ? claro : oscuro);

/** Un color sirve de marca si tiene color de verdad: ni blanco, ni negro, ni gris. */
export function esColorDeMarca(hex: string) {
  if (!colorValido(hex)) return false;
  const [, s, l] = aHsl(hex);
  return s >= 0.18 && l >= 0.08 && l <= 0.92;
}

/** El color de marca que se ve en el HTML de su web: el theme-color o, si no, el que más repite su CSS. */
export function colorEnHtml(html: string): string | undefined {
  const largo = (c: string) => (c.length === 4 ? "#" + [...c.slice(1)].map((x) => x + x).join("") : c).toUpperCase();
  const tema = html.match(/<meta[^>]+name=["'](?:theme-color|msapplication-TileColor)["'][^>]+content=["'](#[0-9a-f]{3}(?:[0-9a-f]{3})?)["']/i)?.[1];
  if (tema && esColorDeMarca(largo(tema))) return largo(tema);
  const cuenta = new Map<string, number>();
  for (const m of html.matchAll(/(?:background(?:-color)?|color|fill|border-color|--[\w-]+)\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/gi)) {
    const c = largo(m[1]!);
    if (esColorDeMarca(c)) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  const [mejor] = [...cuenta].sort((a, b) => b[1] - a[1]);
  return mejor && mejor[1] >= 3 ? mejor[0] : undefined;
}

/** El color de este negocio, y de dónde salió. */
export function colorDe(p: Pick<Prospecto, "color" | "revision">, tono: Tono): { color: string; origen: "mano" | "web" | "rubro" } {
  if (p.color && esColorDeMarca(p.color)) return { color: p.color.toUpperCase(), origen: "mano" };
  const deWeb = p.revision?.estado === "ok" ? p.revision.color : undefined;
  if (deWeb && esColorDeMarca(deWeb)) return { color: deWeb, origen: "web" };
  return { color: COLOR_RUBRO[tono], origen: "rubro" };
}

/** Las paletas afinadas a mano de «Color» y «Sereno» para el color de cada rubro (sistema/84). */
const AFINADAS: Partial<Record<PlantillaMuestra, Record<Tono, Paleta>>> = {
  grafico: {
    salud: { fondo: "#F3FAF7", tinta: "#07302F", bloque: "#0B5D5A", sobreBloque: "#E9FFF8", acento: "#FFD23F", sobreAcento: "#07302F", suave: "#D6F0E7", texto: "#3F5F5C", linea: "#07302F22", cielo: ["#9FF0D2", "#16A39A", "#FFE48A"] },
    legal: { fondo: "#F4F5F8", tinta: "#0F1B38", bloque: "#172B5E", sobreBloque: "#EEF2FF", acento: "#F2B84B", sobreAcento: "#0F1B38", suave: "#DCE2F2", texto: "#47506A", linea: "#0F1B3822", cielo: ["#9DB4FF", "#2B48A8", "#F7D38A"] },
    belleza: { fondo: "#FFF5F1", tinta: "#3A0F23", bloque: "#7A1E46", sobreBloque: "#FFECE6", acento: "#FFB38A", sobreAcento: "#3A0F23", suave: "#FBDDD6", texto: "#6E4553", linea: "#3A0F2322", cielo: ["#FFB7C8", "#C2456F", "#FFD9A8"] },
    otro: { fondo: "#F3F6FB", tinta: "#0B1740", bloque: "#1E3FCF", sobreBloque: "#EEF3FF", acento: "#B9F3C8", sobreAcento: "#0B1740", suave: "#DBE4FA", texto: "#46507A", linea: "#0B174022", cielo: ["#A9C0FF", "#3558E6", "#C9F7D6"] },
  },
  sereno: {
    salud: { fondo: "#F1F5F1", tinta: "#1C2B27", bloque: "#3C6B5C", sobreBloque: "#F1F5F1", acento: "#1C2B27", sobreAcento: "#F1F5F1", suave: "#DFE9E1", texto: "#56665F", linea: "#1C2B2726", cielo: ["#D6E8DA", "#8FBFA9", "#F4E6C3"] },
    legal: { fondo: "#F2F2EE", tinta: "#22241F", bloque: "#5A5B3A", sobreBloque: "#F2F2EE", acento: "#22241F", sobreAcento: "#F2F2EE", suave: "#E3E3D9", texto: "#5E6056", linea: "#22241F26", cielo: ["#DCDAC6", "#A5A680", "#EFE6CF"] },
    belleza: { fondo: "#F8F1EF", tinta: "#30211F", bloque: "#8F4B55", sobreBloque: "#F8F1EF", acento: "#30211F", sobreAcento: "#F8F1EF", suave: "#F0DEDA", texto: "#6C5753", linea: "#30211F26", cielo: ["#F3D2CC", "#D49AA0", "#F7E5D3"] },
    otro: { fondo: "#F0F3F5", tinta: "#1C2328", bloque: "#3D5868", sobreBloque: "#F0F3F5", acento: "#1C2328", sobreAcento: "#F0F3F5", suave: "#DEE5EA", texto: "#55626B", linea: "#1C232826", cielo: ["#CFDDE5", "#93AEBD", "#ECE4D2"] },
  },
};

/** La receta de cada plantilla: de un color de marca, su paleta completa. */
const RECETA: Record<PlantillaMuestra, (h: number, s: number) => Paleta> = {
  grafico: (h, s) => {
    const tinta = hsl(h, 0.55, 0.11), bloque = hsl(h, Math.min(0.85, Math.max(0.5, s)), 0.24), acento = hsl(h + 200, 0.92, 0.72);
    return { fondo: hsl(h, 0.4, 0.97), tinta, bloque, sobreBloque: hsl(h, 0.7, 0.96), acento, sobreAcento: tinta, suave: hsl(h, 0.38, 0.9), texto: hsl(h, 0.2, 0.34), linea: tinta + "22", cielo: [hsl(h, 0.78, 0.8), hsl(h, 0.66, 0.42), hsl(h + 200, 0.9, 0.8)] };
  },
  sereno: (h, s) => {
    const fondo = hsl(h, 0.14, 0.95), tinta = hsl(h, 0.22, 0.14);
    return { fondo, tinta, bloque: hsl(h, Math.min(0.4, Math.max(0.22, s * 0.6)), 0.36), sobreBloque: fondo, acento: tinta, sobreAcento: fondo, suave: hsl(h, 0.18, 0.89), texto: hsl(h, 0.09, 0.38), linea: tinta + "26", cielo: [hsl(h, 0.32, 0.87), hsl(h, 0.3, 0.66), hsl(44, 0.55, 0.86)] };
  },
  mosaico: (h, s) => {
    const tinta = hsl(h, 0.45, 0.1), bloque = hsl(h, Math.min(0.85, Math.max(0.55, s)), 0.4), acento = hsl(h + 160, 0.85, 0.74);
    return { fondo: hsl(h, 0.3, 0.985), tinta, bloque, sobreBloque: sobre(bloque, "#FFFFFF", tinta), acento, sobreAcento: tinta, suave: hsl(h, 0.28, 0.91), texto: hsl(h, 0.16, 0.36), linea: tinta + "1F", cielo: [hsl(h, 0.8, 0.8), hsl(h, 0.7, 0.5), hsl(h + 160, 0.85, 0.8)] };
  },
  revista: (h, s) => {
    const tinta = hsl(h, 0.12, 0.07), bloque = hsl(h, Math.min(0.9, Math.max(0.65, s)), 0.46);
    return { fondo: hsl(h, 0.08, 0.985), tinta, bloque, sobreBloque: sobre(bloque, "#FFFFFF", tinta), acento: tinta, sobreAcento: hsl(h, 0.08, 0.985), suave: hsl(h, 0.1, 0.93), texto: hsl(h, 0.06, 0.36), linea: tinta, cielo: [hsl(h, 0.85, 0.7), hsl(h, 0.8, 0.46), hsl(h + 30, 0.9, 0.62)] };
  },
  noche: (h, s) => {
    const fondo = hsl(h, 0.3, 0.06), acento = hsl(h, Math.min(0.95, Math.max(0.7, s)), 0.7);
    return { fondo, tinta: hsl(h, 0.35, 0.95), bloque: hsl(h, 0.4, 0.13), sobreBloque: hsl(h, 0.35, 0.95), acento, sobreAcento: fondo, suave: hsl(h, 0.3, 0.1), texto: hsl(h, 0.16, 0.68), linea: "#FFFFFF24", cielo: [hsl(h, 0.9, 0.58), hsl(h, 0.55, 0.12), hsl(h + 70, 0.85, 0.55)] };
  },
};

/** Si un texto no llega a leerse bien sobre su fondo (4,5 a 1), se cambia por blanco o casi negro, el que mejor se lea. */
const legible = (fondo: string, texto: string) => (contraste(fondo, texto) >= 4.5 ? texto : sobre(fondo, "#FFFFFF", "#0B0B0C"));

/** La paleta de una muestra: con el color del negocio si se conoce; si no, la del rubro. */
export function paletaDe(plantilla: PlantillaMuestra, tono: Tono, color?: string): Paleta {
  const propio = color && esColorDeMarca(color) && color.toUpperCase() !== COLOR_RUBRO[tono];
  if (!propio && AFINADAS[plantilla]) return AFINADAS[plantilla]![tono];
  const [h, s] = aHsl(propio ? color! : COLOR_RUBRO[tono]);
  const k = RECETA[plantilla](h, s);
  // Ninguna receta se da por buena sin comprobar: con cualquier color de marca, todo texto tiene que leerse.
  return { ...k, sobreBloque: legible(k.bloque, k.sobreBloque), sobreAcento: legible(k.acento, k.sobreAcento), texto: legible(k.fondo, k.texto), tinta: contraste(k.fondo, k.tinta) >= 7 ? k.tinta : sobre(k.fondo, "#FFFFFF", "#0B0B0C") };
}
