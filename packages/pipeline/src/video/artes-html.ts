// El HTML del arte (sistema/114): separado para que la pantalla del planner muestre la vista previa al instante,
// sin servidor ni navegador. artes.ts lo usa para dibujar los JPG.
import type { FormatoPieza, Historia, Lamina, PlantillaArte } from "./contenido.ts";
import { UNMAKE_LINE } from "./fuentes/unmake-line.ts";
import type { DireccionCliente } from "../clientes/direccion.ts";

export interface EstiloArte {
  id: string;
  nombre: string;
  fondo: string;
  tinta: string;
  suave: string;
  /** Los acentos se turnan por serie. */
  acentos: string[];
  /** Fondo invertido para series pares (la regla «todo se invierte» de @jaywrkr). */
  invertir?: boolean;
  titulo: string;
  texto: string;
  /** Peso de los títulos. */
  peso: number;
  /** Títulos en minúsculas (Unmake). */
  minusculas?: boolean;
  /** Arriba a la izquierda. */
  firma: string;
  /** Abajo a la derecha en la última lámina. */
  cierreMarca?: string;
  /** Franja de color arriba (Coresolutions). */
  franja?: boolean;
  /** Luz suave de fondo (Unmake). */
  luz?: boolean;
  /** Cómo le habla a la gente: va a las reglas de Faro. */
  reglas: string;
  /** Letras de Google Fonts que hay que cargar (las de la Dirección del cliente, sistema/117). */
  fuentes?: string[];
}

const FUENTES_GOOGLE = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500;600&family=Geist+Mono:wght@300;400&display=block" rel="stylesheet">';

export const ESTILOS: Record<string, EstiloArte> = {
  unmake: {
    id: "unmake", nombre: "Unmake", fondo: "#0E0C0C", tinta: "#F4EFE9", suave: "#A39A92",
    acentos: ["#F0602A", "#3D5BFF", "#FF3D8B", "#1FCF8F", "#FFB21A"], titulo: "'Unmake Line', 'IBM Plex Mono', monospace", texto: "'IBM Plex Sans', system-ui, sans-serif",
    peso: 400, minusculas: true, firma: "unmake.", cierreMarca: "unmake.", luz: true,
    reglas: "Tutea. Directo y simple, sin tecnicismos ni frases motivacionales. Mostrar, no decir. Títulos del arte en minúsculas. No se habla de IA. Sin precios.",
  },
  coresolutions: {
    id: "coresolutions", nombre: "Coresolutions", fondo: "#FFFFFF", tinta: "#01095C", suave: "#5B6185",
    acentos: ["#2F43D1"], titulo: "'IBM Plex Sans', system-ui, sans-serif", texto: "'IBM Plex Sans', system-ui, sans-serif",
    peso: 600, firma: "CORESOLUTIONS", cierreMarca: "CORESOLUTIONS", franja: true,
    reglas: "Trata de usted. Habla a gerentes y equipos de TI de empresas en Ecuador: claro, concreto, sin alarmismo. Cierra invitando a escribir por mensaje directo o LinkedIn. Nombra marcas (VMware, Veeam, IBM…) solo cuando aportan.",
  },
  jaywrkr: {
    id: "jaywrkr", nombre: "@jaywrkr", fondo: "#000000", tinta: "#FFFFFF", suave: "#8A8A8A",
    acentos: ["#FFFFFF"], invertir: true, titulo: "'Geist Mono', 'IBM Plex Mono', monospace", texto: "'Geist Mono', 'IBM Plex Mono', monospace",
    peso: 400, firma: "@jaywrkr", cierreMarca: "simple.",
    reglas: "Tutea. Una verdad incómoda al día, dicha simple. Frases cortas, sin motivación vacía ni promesas. El texto nunca grita. 70% vacío en el arte.",
  },
};

const saturado = (h: string) => { const n = parseInt(h.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255 >= 0.12; };
const luzDe = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

/** El estilo que sale de la Dirección del cliente (sistema/117): sus colores y sus letras mandan sobre lo de siempre. */
export function estiloDeDireccion(d: DireccionCliente | undefined, base: EstiloArte): EstiloArte {
  if (!d || (!d.colores.length && !d.letras.length)) return base;
  const neutros = d.colores.filter((c) => !saturado(c.hex)), acentos = d.colores.filter((c) => saturado(c.hex)).map((c) => c.hex);
  const fondo = d.colores.find((c) => /fondo/i.test(c.nombre ?? ""))?.hex ?? neutros.find((c) => luzDe(c.hex) > 0.85)?.hex ?? (d.colores.length ? base.fondo : base.fondo);
  const tinta = d.colores.find((c) => /tinta|texto/i.test(c.nombre ?? ""))?.hex ?? neutros.find((c) => luzDe(c.hex) < 0.3)?.hex ?? base.tinta;
  const [t, x] = [d.letras.find((l) => l.uso === "títulos") ?? d.letras[0], d.letras.find((l) => l.uso === "texto") ?? d.letras[1] ?? d.letras[0]];
  const familia = (f: string | undefined, resto: string) => (f ? `'${f.replace(/'/g, "")}', ${resto}` : resto);
  return {
    ...base,
    fondo, tinta,
    acentos: acentos.length ? acentos : base.acentos,
    titulo: t ? familia(t.familia, base.titulo) : base.titulo,
    texto: x ? familia(x.familia, base.texto) : base.texto,
    fuentes: [...new Set([t?.familia, x?.familia].filter(Boolean) as string[])],
    reglas: `${base.reglas} Sigue la Dirección del cliente: sus colores, sus letras y lo que sí y lo que no.`,
  };
}

/** El estilo de un cliente: Unmake, Coresolutions y @jaywrkr tienen el suyo; los demás salen del color de su ficha. Si tiene Dirección, manda ella. */
export function estiloPara(cliente: string, nombre = "", color = "", direccion?: DireccionCliente): EstiloArte {
  return estiloDeDireccion(direccion, estiloBase(cliente, nombre, color));
}
function estiloBase(cliente: string, nombre: string, color: string): EstiloArte {
  const id = `${cliente} ${nombre}`.toLowerCase();
  if (/^(unmake|anonymo)\b/.test(cliente) || /\bunmake\b/.test(id)) return ESTILOS.unmake!;
  if (/coresolutions|core-solutions/.test(id)) return ESTILOS.coresolutions!;
  if (/jaywrkr/.test(id)) return ESTILOS.jaywrkr!;
  const hex = color.match(/#[0-9a-f]{6}\b/i)?.[0];
  return {
    id: "ficha", nombre, fondo: "#FAF8F4", tinta: "#16130F", suave: "#6E675F", acentos: [hex ?? "#16130F"],
    titulo: "'IBM Plex Sans', system-ui, sans-serif", texto: "'IBM Plex Sans', system-ui, sans-serif", peso: 500, firma: nombre, cierreMarca: nombre,
    reglas: "Usa el tono de su ficha.",
  };
}

const esc = (t: string | undefined) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dos = (n: number) => String(n).padStart(2, "0");
/** Un tamaño que entra: cuanto más largo el texto, más chico, con un piso. */
const tam = (t: string | undefined, base: number, piso: number, largo = 28) => Math.round(Math.max(piso, Math.min(base, base * Math.sqrt(largo / Math.max(1, (t ?? "").length)))));

export interface ArteDibujo { nombre: string; ancho: number; alto: number; html: string }
export interface PiezaArte { id: string; formato: FormatoPieza; plantilla: PlantillaArte; lamina: Lamina; serie: string; nSerie: number; historias?: Historia[]; /** De dónde sale cada captura (archivo → dirección o data:). Sin esto, /material/<archivo>. */ imagenes?: Record<string, string> }

function marco(e: EstiloArte, ancho: number, alto: number, cuerpo: string, o: { serie: string; nSerie: number; pagina?: string; acento: string; invertido: boolean; ultima?: boolean }) {
  const fondo = o.invertido ? e.tinta : e.fondo, tinta = o.invertido ? e.fondo : e.tinta, suave = e.suave;
  // En una lámina invertida, un acento del color de la tinta original desaparecería: pasa a ser la tinta nueva.
  if (o.invertido && o.acento.toLowerCase() === e.tinta.toLowerCase()) o = { ...o, acento: tinta };
  const luz = e.luz ? `radial-gradient(70% 55% at 30% 70%, ${o.acento}55, transparent 70%), radial-gradient(45% 40% at 90% 5%, ${o.acento}33, transparent 70%),` : "";
  const franja = e.franja ? `<div style="position:absolute;left:0;right:0;top:0;height:${Math.round(alto * 0.16)}px;background:${e.tinta};background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:36px 36px"></div>` : "";
  const cabeza = e.franja
    ? `<div class="cab" style="color:#fff"><span class="mono">▣ ${esc(o.serie.toUpperCase())} · ${dos(o.nSerie)}</span><span style="font-weight:600;letter-spacing:.04em">${esc(e.firma)}</span></div>`
    : `<div class="cab"><span>${esc(e.firma)}</span><span>${esc(e.minusculas ? o.serie.toLowerCase() : o.serie.toUpperCase())} · Nº ${dos(o.nSerie)}</span></div>`;
  const propias = e.fuentes?.length ? `<link href="https://fonts.googleapis.com/css2?${e.fuentes.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&")}&display=block" rel="stylesheet">` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${FUENTES_GOOGLE}${propias}<style>
@font-face{font-family:'Unmake Line';src:url(${UNMAKE_LINE}) format('woff2')}
*{box-sizing:border-box;margin:0}html,body{width:${ancho}px;height:${alto}px;overflow:hidden}
body{background:${luz}${fondo};color:${tinta};font-family:${e.texto};position:relative;-webkit-font-smoothing:antialiased}
.pad{position:absolute;inset:0;padding:${Math.round(ancho * 0.085)}px;display:flex;flex-direction:column}
.cab,.pie{display:flex;justify-content:space-between;align-items:center;font:400 26px/1.2 'IBM Plex Mono','Geist Mono',monospace;letter-spacing:.02em;color:${e.franja ? tinta : suave};position:relative;z-index:2}
.mono{font-family:'IBM Plex Mono','Geist Mono',monospace}
.cuerpo{flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px;position:relative;z-index:2}
.t{font-family:${e.titulo};font-weight:${e.peso};line-height:1.12;letter-spacing:${e.peso > 500 ? "-0.01em" : "0"}${e.minusculas ? ";text-transform:lowercase" : ""}}
.ante{font:400 26px/1.3 'IBM Plex Mono','Geist Mono',monospace;letter-spacing:.06em;color:${o.acento === tinta ? suave : o.acento};text-transform:uppercase}
.baj{font-size:34px;line-height:1.45;color:${suave};max-width:88%}
.ac{color:${o.acento}}s{text-decoration-thickness:3px;color:${suave}}
</style></head><body>${franja}<div class="pad">${cabeza}<div class="cuerpo">${cuerpo}</div><div class="pie"><span>${o.pagina ?? ""}</span><span>${o.ultima ? esc(e.cierreMarca ?? "") : ""}</span></div></div></body></html>`;
}

/** Las láminas de una pieza (y su portada si es reel), en HTML listo para dibujar. */
export function laminasHTML(e: EstiloArte, p: PiezaArte): ArteDibujo[] {
  const L = p.lamina, W = 1080, H = 1350;
  const acento = e.acentos[(p.nSerie - 1 + e.acentos.length * 10) % e.acentos.length] ?? e.tinta;
  const invertido = !!e.invertir && p.nSerie % 2 === 0;
  const base = { serie: p.serie, nSerie: p.nSerie, acento, invertido };
  const ante = L.antetitulo ? `<p class="ante">${esc(L.antetitulo)}</p>` : "";
  const baj = (t?: string) => (t ? `<p class="baj">${esc(t)}</p>` : "");
  const lamina = (n: number, total: number, cuerpo: string) => ({ nombre: `${p.id}-${dos(n)}`, ancho: W, alto: H, html: marco(e, W, H, cuerpo, { ...base, pagina: total > 1 ? `${dos(n)} / ${dos(total)}${n === 1 ? "  ·  desliza →" : ""}` : "", ultima: n === total }) });
  const h1 = (t: string, b = 92, piso = 54) => `<h1 class="t" style="font-size:${tam(t, b, piso)}px">${esc(t)}</h1>`;

  if (p.formato === "reel" || p.plantilla === "portada") {
    const cuerpo = `${ante}${h1(L.titulo, 104, 60)}${baj(L.bajada)}`;
    return [{ nombre: `${p.id}-portada`, ancho: 1080, alto: 1920, html: marco(e, 1080, 1920, cuerpo, { ...base, ultima: true }) }];
  }
  if (p.plantilla === "trabajo" && L.imagen) {
    // El trabajo real con aire alrededor (sistema/118): la captura arriba, una línea abajo. En carrusel, después la del celular.
    const src = (archivo: string) => esc(p.imagenes?.[archivo] ?? `/material/${archivo}`);
    const celular = L.imagen.replace(/-1440\.jpg$/, "-390.jpg");
    const marcoImg = (archivo: string, movil: boolean) => movil
      ? `<div style="align-self:center;width:46%;aspect-ratio:9/16;overflow:hidden;border-radius:28px;box-shadow:0 0 0 2px ${e.suave}55"><img src="${src(archivo)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block"></div>`
      : `<div style="width:100%;aspect-ratio:16/11;overflow:hidden;border-radius:10px;box-shadow:0 0 0 1px ${e.suave}55"><img src="${src(archivo)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block"></div>`;
    const linea = `<p class="t" style="font-size:${tam(L.titulo, 46, 32)}px;max-width:90%">${esc(L.titulo)}</p>`;
    if (p.formato === "carrusel" && celular !== L.imagen) return [lamina(1, 2, `${marcoImg(L.imagen, false)}${linea}`), lamina(2, 2, `${marcoImg(celular, true)}${baj(L.bajada ?? "En el celular.")}`)];
    return [lamina(1, 1, `${marcoImg(L.imagen, false)}${linea}`)];
  }
  if (p.plantilla === "tachado") {
    const c = `<div style="display:flex;flex-wrap:wrap;gap:28px 40px;align-items:baseline;justify-content:center;text-align:center"><span class="t" style="font-size:${tam(L.tachado, 80, 48, 10)}px"><s>${esc(L.tachado)}</s></span><span class="t" style="font-size:${tam(L.titulo, 80, 48, 10)}px">${esc(L.titulo)}</span></div>`;
    return [lamina(1, 1, c)];
  }
  if (p.plantilla === "dato") {
    return [lamina(1, 1, `${ante}<p class="t ac" style="font-size:${tam(L.numero, 260, 140, 4)}px;line-height:1">${esc(L.numero)}</p>${h1(L.titulo, 64, 44)}${baj(L.bajada)}`)];
  }
  const items = (L.items ?? []).slice(0, 7);
  if ((p.plantilla === "lista" || p.plantilla === "pregunta") && items.length) {
    const total = items.length + 2;
    return [
      lamina(1, total, `${ante}${h1(L.titulo, 96, 58)}${baj(L.bajada)}`),
      ...items.map((it, i) => lamina(i + 2, total, `<p class="t ac" style="font-size:120px;line-height:1">${dos(i + 1)}</p>${h1(it.t, 66, 44)}${baj(it.d)}`)),
      lamina(total, total, `${h1(L.cierre || L.titulo, 80, 48)}${baj(L.cierre ? L.bajada : undefined)}`),
    ];
  }
  if (p.plantilla === "mito") {
    const real = items[0]?.d ?? L.bajada ?? "";
    return [
      lamina(1, 3, `<p class="ante">${e.minusculas ? "mito" : "MITO"}</p>${h1(L.titulo, 88, 52)}`),
      lamina(2, 3, `<p class="ante">${e.minusculas ? "en realidad" : "EN REALIDAD"}</p>${h1(real, 72, 44)}`),
      lamina(3, 3, `${h1(L.cierre || "Guárdalo para la próxima vez.", 72, 44)}`),
    ];
  }
  // «frase», o cualquier pieza sin plantilla clara: una sola lámina.
  return [lamina(1, 1, `${ante}${h1(L.titulo, 104, 56)}${baj(L.bajada)}`)];
}

/** Las historias: la primera muestra el post para compartirlo; la del sticker deja el lugar marcado. */
export function historiasHTML(e: EstiloArte, p: PiezaArte, portada?: string): ArteDibujo[] {
  const W = 1080, H = 1920, acento = e.acentos[(p.nSerie - 1) % e.acentos.length] ?? e.tinta;
  const base = { serie: p.serie, nSerie: p.nSerie, acento, invertido: !!e.invertir && p.nSerie % 2 === 0, ultima: true };
  const out: ArteDibujo[] = [];
  const h = p.historias ?? [];
  if (portada) out.push({ nombre: `${p.id}-historia-1`, ancho: W, alto: H, html: marco(e, W, H, `<img src="${portada}" style="width:78%;align-self:center;box-shadow:0 30px 80px rgba(0,0,0,.35)"><p class="t" style="font-size:${tam(h[0]?.texto, 52, 36)}px;text-align:center">${esc(h[0]?.texto ?? "")}</p>`, base) });
  const conSticker = h.find((x) => x.sticker);
  if (conSticker) {
    const opciones = conSticker.opciones?.length ? `<p class="mono" style="font-size:28px;color:${e.suave}">${esc(conSticker.opciones.join("  ·  "))}</p>` : "";
    out.push({ nombre: `${p.id}-historia-sticker`, ancho: W, alto: H, html: marco(e, W, H, `<p class="t" style="font-size:${tam(conSticker.texto, 64, 40)}px;text-align:center">${esc(conSticker.texto)}</p><div style="align-self:center;width:72%;height:300px;border:3px dashed ${e.suave};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px"><p class="mono" style="font-size:26px;color:${e.suave}">aquí va el sticker de ${esc(conSticker.sticker)}</p>${opciones}</div>`, base) });
  }
  return out;
}
