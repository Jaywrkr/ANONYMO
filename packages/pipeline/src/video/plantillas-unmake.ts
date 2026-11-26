// Plantillas de Unmake, versión 2 (sistema/115): el arte muestra el trabajo.
// Lo que hacen los estudios que se ven bien en redes: el trabajo terminado con contexto, el proceso y el detalle;
// la lámina entera es el trabajo, sin marco ni logo encima; la segunda engancha (Instagram la vuelve a mostrar);
// el proceso se muestra (versiones, retícula de construcción) y el texto queda para las pocas piezas de postura o guía.
// Todo se calcula aquí (tamaños y cortes de línea), sin scripts: la vista previa del estudio va en un iframe sin scripts.
import { UNMAKE_LINE } from "./fuentes/unmake-line.ts";
import type { ArteDibujo } from "./artes-html.ts";

export type PlantillaUnmake = "caso" | "antesdespues" | "proceso" | "detalle" | "frase" | "lista" | "dato" | "portada";

/** Lo que va en el arte. Cada plantilla usa sus campos. */
export interface LaminaUnmake {
  titulo: string;
  bajada?: string;
  antetitulo?: string;
  /** Fotos o capturas del trabajo, en orden (URL pública o data:). */
  imagenes?: string[];
  cliente?: string;
  anio?: string;
  /** Qué hicimos, en dos o tres palabras («marca y web»). */
  hicimos?: string;
  numero?: string;
  items?: { t: string; d?: string }[];
  cierre?: string;
}

export interface PiezaUnmake { id: string; plantilla: PlantillaUnmake; lamina: LaminaUnmake; serie: string; nSerie: number }

export const PLANTILLAS_UNMAKE: Record<PlantillaUnmake, { nombre: string; para: string; formato: "post" | "carrusel" | "reel" }> = {
  caso: { nombre: "Caso", para: "Un proyecto en 5 láminas, sin marco: la pieza sobre su color con una línea, un detalle a sangre, la construcción con retícula, la pieza entera y otro detalle. El contexto va en el texto del post.", formato: "carrusel" },
  antesdespues: { nombre: "Antes y después", para: "Lo que había y lo que quedó, una sobre otra.", formato: "post" },
  proceso: { nombre: "Proceso", para: "Primero lo que quedó; después cada versión, de la primera a la final.", formato: "carrusel" },
  detalle: { nombre: "Detalle", para: "Un acercamiento a sangre a una parte del trabajo, sin texto.", formato: "post" },
  frase: { nombre: "Postura", para: "La excepción con texto: una idea del estudio en una frase, con mucho aire.", formato: "post" },
  lista: { nombre: "Guía", para: "Portada, de 3 a 6 puntos y un cierre.", formato: "carrusel" },
  dato: { nombre: "Dato", para: "Una cifra real de un proyecto y qué significa.", formato: "post" },
  portada: { nombre: "Portada de reel", para: "El cuadro que se ve en el perfil.", formato: "reel" },
};

// — Diseño —
const C = { fondo: "#0E0C0C", tinta: "#F4EFE9", suave: "#A39A92", linea: "rgba(244,239,233,.16)", vacio: "#1C1918", aviso: "#FF3B30" };
export const ACENTOS_UNMAKE = ["#F0602A", "#3D5BFF", "#FF3D8B", "#1FCF8F", "#FFB21A"];
const W = 1080, M = 88, CW = W - M * 2;
/** Ancho medio de una letra, en proporción al tamaño (medido con el navegador). */
const RATIO = { titulo: 0.56, texto: 0.48 };

const esc = (t: string | undefined) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dos = (n: number) => String(n).padStart(2, "0");

/** Cuántas líneas ocupa un texto a un tamaño, cortando por palabras. Devuelve Infinity si una palabra no entra. */
export function lineas(texto: string, ancho: number, size: number, ratio: number): number {
  const porLinea = Math.floor(ancho / (size * ratio));
  let n = 0;
  for (const parrafo of texto.split("\n")) {
    let actual = 0;
    n++;
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      if (palabra.length > porLinea) return Infinity;
      if (actual === 0) actual = palabra.length;
      else if (actual + 1 + palabra.length <= porLinea) actual += 1 + palabra.length;
      else { n++; actual = palabra.length; }
    }
  }
  return n;
}

/** El tamaño más grande (entre max y min) con el que el texto entra en la caja. Si no entra ni al mínimo, ok = false. */
export function ajustar(texto: string, ancho: number, alto: number, max: number, min: number, lh = 1.08, ratio = RATIO.titulo): { size: number; ok: boolean; lineas: number } {
  for (let s = max; s >= min; s -= 2) {
    const n = lineas(texto, ancho, s, ratio);
    if (n * s * lh <= alto) return { size: s, ok: true, lineas: n };
  }
  return { size: min, ok: false, lineas: lineas(texto, ancho, min, ratio) };
}

interface Caja { x: number; y: number; w: number; h: number }

class Hoja {
  partes: string[] = [];
  avisos: string[] = [];
  alto: number;
  acento: string;
  constructor(alto: number, acento: string) { this.alto = alto; this.acento = acento; }
  /** Texto en una caja: se achica hasta entrar; si no entra, queda marcado y con aviso. */
  texto(t: string | undefined, c: Caja, o: { max: number; min: number; lh?: number; fuente?: "titulo" | "texto"; color?: string; abajo?: boolean; que?: string }) {
    if (!t) return this;
    const fuente = o.fuente ?? "titulo", lh = o.lh ?? (fuente === "titulo" ? 1.06 : 1.38);
    const a = ajustar(t, c.w, c.h, o.max, o.min, lh, RATIO[fuente]);
    if (!a.ok) this.avisos.push(`${o.que ?? "El texto"} no entra: acórtalo.`);
    const estilo = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;font-size:${a.size}px;line-height:${lh};color:${o.color ?? C.tinta};${o.abajo ? "justify-content:flex-end;" : ""}${a.ok ? "" : `outline:4px solid ${C.aviso};outline-offset:8px;`}`;
    this.partes.push(`<div class="${fuente === "titulo" ? "t" : "x"}" data-caja style="${estilo}">${esc(t).replace(/\n/g, "<br>")}</div>`);
    return this;
  }
  /** Una foto del trabajo recortada en su caja. zoom > 1 acerca hacia el punto «foco». */
  img(src: string | undefined, c: Caja, foco = "50% 50%", zoom = 1) {
    if (!src) {
      this.avisos.push("Falta una imagen del trabajo.");
      this.partes.push(`<div class="img falta" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"><span>falta la imagen</span></div>`);
      return this;
    }
    this.partes.push(`<div class="img" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px"><img src="${esc(src)}" alt="" style="object-position:${foco};transform:scale(${zoom});transform-origin:${foco}"></div>`);
    return this;
  }
  /** Una etiqueta chica (en minúsculas, sin mayúsculas sostenidas). */
  rotulo(t: string, x: number, y: number, color = C.suave, size = 24, derecha = false) {
    this.partes.push(`<div class="r" style="${derecha ? `right:${W - x}px` : `left:${x}px`};top:${y}px;font-size:${size}px;color:${color}">${esc(t)}</div>`);
    return this;
  }
  raw(html: string) { this.partes.push(html); return this; }
}

/** La firma, chica, solo en las piezas de texto: en las de trabajo, el trabajo es la marca. */
function firma(h: Hoja) {
  h.raw(`<div class="firma" style="left:${M}px;top:${h.alto - M - 30}px">unmake.</div>`);
}

function documento(h: Hoja, ancho: number, alto: number) {
  return `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=block" rel="stylesheet"><style>
@font-face{font-family:'Unmake Line';src:url(${UNMAKE_LINE}) format('woff2')}
*{box-sizing:border-box;margin:0}html,body{width:${ancho}px;height:${alto}px;overflow:hidden}
body{background:${C.fondo};color:${C.tinta};font-family:'IBM Plex Sans',system-ui,sans-serif;position:relative;-webkit-font-smoothing:antialiased}
body>div{position:absolute}
.t,.x{display:flex;flex-direction:column;overflow:hidden}
.t{font-family:'Unmake Line','IBM Plex Mono',monospace;font-weight:400;text-transform:lowercase;letter-spacing:-.01em}
.x{font-weight:400}
.r{line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap}
.firma{font:400 34px/1 'Unmake Line',monospace;color:${C.tinta}}
.serie{font-size:22px;line-height:1;color:${C.suave};display:flex;align-items:center;gap:12px}.serie i{display:block;width:12px;height:12px}
.img{overflow:hidden;background:${C.vacio}}.img img{width:100%;height:100%;object-fit:cover;display:block}
.img.falta{border:2px dashed ${C.aviso};display:flex;align-items:center;justify-content:center}.img.falta span{font-size:24px;color:${C.aviso}}
</style></head><body>${h.partes.join("")}</body></html>`;
}

const acentoDe = (n: number) => ACENTOS_UNMAKE[(Math.max(1, n) - 1) % ACENTOS_UNMAKE.length]!;

/** Las láminas de una pieza de Unmake, listas para dibujar. Cada una trae sus avisos (texto que no entra, imagen que falta). */
export function laminasUnmake(p: PiezaUnmake): (ArteDibujo & { avisos: string[] })[] {
  const L = p.lamina, acento = acentoDe(p.nSerie), img = L.imagenes ?? [];
  const H = p.plantilla === "portada" ? 1920 : 1350;
  const hojas: Hoja[] = [];
  const nueva = (fondo = C.fondo) => { const h = new Hoja(H, acento); if (fondo !== C.fondo) h.raw(`<div style="inset:0;background:${fondo}"></div>`); hojas.push(h); return h; };
  /** El trabajo a sangre: ocupa la lámina entera. */
  const lleno = (h: Hoja, src: string | undefined, foco = "50% 50%", zoom = 1) => h.img(src, { x: 0, y: 0, w: W, h: H }, foco, zoom);
  /** Una captura sobre un campo de color, con aire alrededor (las capturas de web no se recortan). */
  const campo = (h: Hoja, src: string | undefined, alto = Math.round(CW / 2)) => h.img(src, { x: M, y: Math.round((H - alto) / 2), w: CW, h: alto });
  /** La retícula de construcción encima: doce columnas y líneas cada 90 px. */
  const reticula = (h: Hoja, color = "rgba(255,255,255,.55)") => h.raw(`<div style="inset:0;mix-blend-mode:difference;background-image:linear-gradient(90deg,${color} 1px,transparent 1px),linear-gradient(${color} 1px,transparent 1px);background-size:${W / 12}px 90px"></div>`);
  /** Una etiqueta chica sobre el trabajo, en una caja del color del fondo. */
  const chip = (h: Hoja, t: string, x: number, y: number, fondo = C.fondo, color = C.tinta) => h.raw(`<div class="r" style="left:${x}px;top:${y}px;font-size:24px;color:${color};background:${fondo};padding:10px 14px">${esc(t)}</div>`);

  switch (p.plantilla) {
    case "caso": {
      // 1. El trabajo sobre el color de la serie, con una sola línea. El resto del contexto va en el texto del post.
      let h = nueva(acento);
      campo(h, img[0]);
      h.texto(L.titulo, { x: M, y: H - M - 150, w: CW * 0.8, h: 150 }, { max: 44, min: 30, color: C.fondo, abajo: true, que: "El título" });
      // 2. Un acercamiento a sangre: engancha (Instagram vuelve a mostrar la segunda lámina).
      h = nueva(); lleno(h, img[1] ?? img[0], "30% 35%", img[1] ? 1 : 2);
      // 3. La construcción: el trabajo con la retícula encima.
      h = nueva(); lleno(h, img[2] ?? img[0], "55% 40%", img[2] ? 1 : 1.6); reticula(h);
      // 4. La pieza entera, con aire.
      h = nueva(); campo(h, img[3] ?? img[0]);
      // 5. Otro detalle, para cerrar.
      h = nueva(); lleno(h, img[4] ?? img[0], "80% 70%", img[4] ? 1 : 2.4);
      break;
    }
    case "antesdespues": {
      const h = nueva();
      const ah = Math.round((H - M * 2 - 24) / 2);
      h.img(img[0], { x: M, y: M, w: CW, h: ah });
      chip(h, "antes", M + 24, M + 24);
      h.img(img[1], { x: M, y: M + ah + 24, w: CW, h: ah });
      chip(h, "después", M + 24, M + ah + 48, acento, C.fondo);
      break;
    }
    case "proceso": {
      // Primero lo que quedó; después cada versión, en orden, sobre el mismo campo.
      const vs = img.length ? img : [undefined];
      let h = nueva(acento); campo(h, vs[vs.length - 1]);
      vs.forEach((src, i) => {
        h = nueva(C.vacio);
        campo(h, src);
        chip(h, i === vs.length - 1 ? "final" : `v${i + 1}`, M, M, i === vs.length - 1 ? acento : C.fondo, i === vs.length - 1 ? C.fondo : C.tinta);
        h.texto(L.items?.[i]?.t, { x: M, y: H - M - 100, w: CW * 0.7, h: 100 }, { max: 30, min: 22, fuente: "texto", lh: 1.35, color: C.suave, abajo: true, que: `La nota de la versión ${i + 1}` });
      });
      break;
    }
    case "detalle": {
      const h = nueva();
      lleno(h, img[0], L.antetitulo ?? "50% 50%", 1.7);
      break;
    }
    case "frase": {
      // La excepción: una pieza de texto. Mucho aire arriba; la frase abajo a la izquierda.
      const h = nueva();
      if (L.antetitulo) h.rotulo(L.antetitulo.toLowerCase(), M, 560, acento, 26);
      h.texto(L.titulo, { x: M, y: 620, w: CW * 0.86, h: 440 }, { max: 104, min: 60, que: "La frase" });
      h.texto(L.bajada, { x: M, y: 1080, w: CW * 0.7, h: 90 }, { max: 30, min: 24, fuente: "texto", lh: 1.35, color: C.suave, que: "La bajada" });
      firma(h);
      break;
    }
    case "lista": {
      const items = (L.items ?? []).slice(0, 6);
      let h = nueva();
      h.rotulo(`${items.length} puntos`, M, 520, acento, 26);
      h.texto(L.titulo, { x: M, y: 580, w: CW, h: 420 }, { max: 100, min: 58, que: "El título" });
      h.texto(L.bajada, { x: M, y: 1030, w: CW * 0.75, h: 90 }, { max: 30, min: 24, fuente: "texto", lh: 1.35, color: C.suave, que: "La bajada" });
      firma(h);
      items.forEach((it, i) => {
        h = nueva();
        h.texto(dos(i + 1), { x: M, y: M, w: 300, h: 170 }, { max: 140, min: 140, lh: 1.15, color: acento });
        h.texto(it.t, { x: M, y: 500, w: CW * 0.9, h: 360 }, { max: 120, min: 56, que: `El punto ${i + 1}` });
        h.texto(it.d, { x: M, y: 880, w: CW * 0.8, h: 220 }, { max: 34, min: 26, fuente: "texto", lh: 1.4, color: C.suave, que: `La explicación del punto ${i + 1}` });
      });
      h = nueva();
      h.texto(L.cierre ?? "guárdalo.", { x: M, y: 560, w: CW * 0.85, h: 360 }, { max: 88, min: 52, que: "El cierre" });
      firma(h);
      break;
    }
    case "dato": {
      const h = nueva();
      h.texto(L.numero, { x: M, y: 360, w: CW, h: 330 }, { max: 280, min: 150, lh: 1.25, color: acento, que: "La cifra" });
      h.texto(L.titulo, { x: M, y: 760, w: CW * 0.8, h: 230 }, { max: 64, min: 40, que: "El título" });
      h.texto(L.bajada, { x: M, y: 1020, w: CW * 0.7, h: 110 }, { max: 30, min: 24, fuente: "texto", lh: 1.35, color: C.suave, que: "La bajada" });
      firma(h);
      break;
    }
    case "portada": {
      // En el perfil se ve el centro 4:5; arriba y abajo los tapa Instagram. El trabajo y la línea van al centro.
      const h = nueva(acento);
      h.img(img[0], { x: M, y: 520, w: CW, h: Math.round(CW / 2) });
      h.texto(L.titulo, { x: M, y: 1040, w: CW * 0.85, h: 200 }, { max: 64, min: 40, color: C.fondo, que: "El título" });
      break;
    }
  }
  return hojas.map((x, i) => ({ nombre: `${p.id}-${hojas.length > 1 ? dos(i + 1) : p.plantilla === "portada" ? "portada" : "01"}`, ancho: W, alto: H, html: documento(x, W, H), avisos: x.avisos }));
}

/** Ejemplos para la galería: proyectos reales del estudio, con sus capturas. */
export function ejemplosUnmake(base = ""): PiezaUnmake[] {
  const t = (n: string) => `${base}/trabajo/${n}.webp`;
  return [
    { id: "caso", plantilla: "caso", serie: "Casos", nSerie: 1, lamina: {
      titulo: "terreno: una convención que se siente desde la entrada", cliente: "Terreno", anio: "2024", hicimos: "marca y web", imagenes: [t("terreno")],
      bajada: "había que vender entradas a un evento que nadie conocía todavía.",
      items: [{ t: "Buscamos el tono en la calle" }, { t: "Una letra que grita sin gritar" }, { t: "Un rojo que se reconoce de lejos" }, { t: "Una web con un solo botón" }],
      numero: "1", cierre: "botón: comprar la entrada. nada más en la portada.",
    } },
    { id: "antes", plantilla: "antesdespues", serie: "Antes y después", nSerie: 2, lamina: { titulo: "de una lista larga a una sola idea por pantalla.", cliente: "Ankla", imagenes: [t("jayfit"), t("ankla")] } },
    { id: "proceso", plantilla: "proceso", serie: "Proceso", nSerie: 3, lamina: { titulo: "de la idea a la app que se usa todos los días", imagenes: [t("armador"), t("terreno"), t("ankla")], items: [{ t: "la primera prueba: todo en una pantalla." }, { t: "separamos lo que se hace a diario." }, { t: "quedó lo esencial y nada más." }] } },
    { id: "detalle", plantilla: "detalle", serie: "Detalles", nSerie: 4, lamina: { titulo: "cada número tiene su lugar y su peso.", cliente: "Minervo", antetitulo: "82% 50%", imagenes: [t("minervo")] } },
    { id: "frase", plantilla: "frase", serie: "Postura", nSerie: 5, lamina: { antetitulo: "lo que creemos", titulo: "si hay que explicarlo, todavía no está listo.", bajada: "por eso probamos con gente real antes de entregar." } },
    { id: "lista", plantilla: "lista", serie: "Guías", nSerie: 1, lamina: { titulo: "4 cosas que tu web tiene que decir arriba", bajada: "antes de que alguien baje.", items: [{ t: "qué haces", d: "en una frase que entienda cualquiera." }, { t: "para quién", d: "si es para todos, no es para nadie." }, { t: "cómo se ve", d: "una imagen real de tu trabajo, no una foto de banco." }, { t: "qué hago ahora", d: "un solo botón, claro." }], cierre: "guárdalo para cuando revises tu web." } },
    { id: "dato", plantilla: "dato", serie: "Datos", nSerie: 2, lamina: { numero: "12", titulo: "semanas de lanzamiento a lanzamiento, sin correr.", bajada: "el plan se cumplió porque cada paso tenía un dueño.", cliente: "Jayfit" } },
    { id: "portada", plantilla: "portada", serie: "Casos", nSerie: 1, lamina: { titulo: "así armamos la marca de ankla", cliente: "Ankla", imagenes: [t("ankla")] } },
  ];
}
