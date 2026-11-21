// «Mi web» (sistema/98): lo que el cliente puede cambiar de su web, sin tocar el código. Sin disco ni red: corre
// igual en el servidor y en el navegador. Cada texto se reconoce por su etiqueta y por lo que decía originalmente,
// así que el cambio sigue encajando aunque la página se reordene; si el equipo cambia ese texto, el cambio se avisa.

export type TipoEditable = "titulo" | "texto" | "lista" | "boton";
export interface Editable { clave: string; tipo: TipoEditable; texto: string; largo: boolean }
export interface FotoEditable { src: string; alt: string }

const TIPO: Record<string, TipoEditable> = { h1: "titulo", h2: "titulo", h3: "titulo", h4: "titulo", p: "texto", blockquote: "texto", figcaption: "texto", dd: "texto", dt: "texto", td: "texto", th: "texto", li: "lista", a: "boton", button: "boton" };
const ETIQUETAS = Object.keys(TIPO).join("|");
// Adentro solo se permite texto con formato simple: si hay otra etiqueta (un ícono, una imagen, un bloque), no se toca.
const INTERIOR_SIMPLE = /^(?:[^<]|<\/?(?:br|strong|em|b|i|span)\b[^>]*>)*$/i;

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
const decodificar = (s: string) => s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+|#39);/gi, (m, e: string) => ENTIDADES[e.toLowerCase()] ?? (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : m));
const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** El texto visible de un interior simple: los <br> son saltos de línea. */
export function textoEditable(interior: string) {
  return decodificar(interior.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t\r\f\v]+/g, " ").replace(/ *\n */g, "\n").trim();
}

/** Huella corta y estable (FNV-1a), igual en el servidor y en el navegador. */
export function huella(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/** Tramos de <script>, <style>, <svg>, <noscript> y comentarios: ahí nunca se toca nada. */
function prohibidos(html: string): [number, number][] {
  const r: [number, number][] = [];
  for (const m of html.matchAll(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi)) r.push([m.index!, m.index! + m[0].length]);
  return r;
}

interface Hallado extends Editable { inicio: number; fin: number; abre: string; cierra: string }

function hallar(html: string): Hallado[] {
  const fuera = prohibidos(html);
  const vistos = new Map<string, number>();
  const res: Hallado[] = [];
  const re = new RegExp(`(<(${ETIQUETAS})\\b[^>]*>)([\\s\\S]*?)(</\\2\\s*>)`, "gi");
  for (const m of html.matchAll(re)) {
    const i = m.index!;
    if (fuera.some(([a, b]) => i >= a && i < b)) continue;
    const [, abre, etiqueta, interior, cierra] = m as unknown as [string, string, string, string, string];
    if (!INTERIOR_SIMPLE.test(interior) || /\bdata-no-editar\b/i.test(abre)) continue;
    const texto = textoEditable(interior);
    if (texto.length < 2 || !/[\p{L}\p{N}]/u.test(texto)) continue;
    const base = `${etiqueta.toLowerCase()}-${huella(texto)}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    const tipo = TIPO[etiqueta.toLowerCase()]!;
    res.push({ clave: n > 1 ? `${base}-${n}` : base, tipo, texto, largo: tipo === "texto" || texto.length > 70, inicio: i + abre.length, fin: i + abre.length + interior.length, abre, cierra });
  }
  return res;
}

/** Lo que el cliente puede cambiar en una página, en el orden en que aparece. */
export const editablesDe = (html: string): Editable[] => hallar(html).map(({ clave, tipo, texto, largo }) => ({ clave, tipo, texto, largo }));

/** Las fotos de la página que salen de img/ (las del cliente), sin repetir. */
export function fotosDe(html: string): FotoEditable[] {
  const fuera = prohibidos(html);
  const vistas = new Set<string>();
  const res: FotoEditable[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (fuera.some(([a, b]) => m.index! >= a && m.index! < b)) continue;
    const src = m[0].match(/\bsrc\s*=\s*["']((?:\.\/)?img\/[^"']+)["']/i)?.[1]?.replace(/^\.\//, "");
    if (!src || vistas.has(src)) continue;
    vistas.add(src);
    res.push({ src, alt: decodificar(m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "") });
  }
  return res;
}

export interface CambiosPagina { textos?: Record<string, string>; fotos?: Record<string, { nuevo: string; alt?: string }> }

/** La página con los cambios del cliente. Devuelve también las claves que ya no encontró (el equipo cambió ese texto). */
export function aplicarCambios(html: string, c: CambiosPagina): { html: string; sinEncajar: string[] } {
  let salida = html;
  const textos = c.textos ?? {};
  const hallados = hallar(html);
  const sinEncajar = Object.keys(textos).filter((k) => !hallados.some((h) => h.clave === k));
  // De atrás hacia adelante, para que las posiciones no se muevan.
  for (const h of [...hallados].reverse()) {
    const nuevo = textos[h.clave];
    if (nuevo === undefined) continue;
    salida = salida.slice(0, h.inicio) + escapar(nuevo.trim()).replace(/\n/g, "<br>") + salida.slice(h.fin);
  }
  for (const [src, f] of Object.entries(c.fotos ?? {})) {
    salida = salida.replace(/<img\b[^>]*>/gi, (tag) => {
      const s = tag.match(/\bsrc\s*=\s*["']((?:\.\/)?img\/[^"']+)["']/i)?.[1]?.replace(/^\.\//, "");
      if (s !== src) return tag;
      let t = tag.replace(/(\bsrc\s*=\s*["'])[^"']*(["'])/i, `$1img/${f.nuevo}$2`).replace(/\s(?:srcset|sizes)\s*=\s*["'][^"']*["']/gi, "");
      if (f.alt !== undefined) t = /\balt\s*=/.test(t) ? t.replace(/(\balt\s*=\s*["'])[^"']*(["'])/i, `$1${escapar(f.alt).replace(/"/g, "&quot;")}$2`) : t.replace(/<img\b/i, `<img alt="${escapar(f.alt).replace(/"/g, "&quot;")}"`);
      return t;
    });
  }
  return { html: salida, sinEncajar };
}

// — El asistente de la web: responde con las preguntas y respuestas que escribe el cliente, sin IA —

export interface PreguntaAsistente { pregunta: string; respuesta: string }

const VACIAS = new Set("a al algo como con cual cuales cuando de del donde el ella en es esta este hay la las lo los me mi mis o para pero por que quien se si sin su sus te tu tus un una uno y ya yo usted ustedes tienen tiene hacen hace puedo puede quiero".split(" "));
/** Palabras con significado, sin tildes ni plurales simples. */
export function palabras(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !VACIAS.has(w)).map((w) => (w.length > 4 ? w.replace(/(es|s)$/, "") : w));
}

/** La mejor respuesta para lo que escribió el visitante, o nada si ninguna se parece lo suficiente. */
export function responderAsistente(preguntas: PreguntaAsistente[], texto: string): PreguntaAsistente | undefined {
  const q = new Set(palabras(texto));
  if (!q.size) return;
  let mejor: PreguntaAsistente | undefined, puntos = 0;
  for (const p of preguntas) {
    const w = new Set(palabras(p.pregunta));
    const comunes = [...q].filter((x) => w.has(x)).length;
    const s = comunes / Math.max(1, Math.min(q.size, w.size));
    if (comunes && s > puntos) { puntos = s; mejor = p; }
  }
  return puntos >= 0.5 ? mejor : undefined;
}
