// La web que construye el equipo, como archivos de verdad (sistema/42).
// El constructor (Vector) entrega un sitio estático (HTML, CSS y JS, sin compilar) en bloques de código con su
// nombre de archivo. Se guarda por versión en proyectos/<id>/sitio/v<N>/ y el estudio lo muestra funcionando.
import { listarArchivos, rutaArchivo } from "./archivos.ts";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { carpeta } from "./almacen.ts";
import type { Direccion, Marca, Pedido } from "./tipos.ts";

const EXT = /\.(html|css|js|svg|json|txt|webmanifest)$/i;
export const TIPOS_SITIO: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  svg: "image/svg+xml", json: "application/json", txt: "text/plain; charset=utf-8", webmanifest: "application/manifest+json",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

/** Lo que se le pide al constructor para que la web se pueda ver y publicar tal cual. */
export const PEDIDO_SITIO = [
  "# Entrega la web como archivos (se ve funcionando en el estudio y se publica tal cual)",
  "Construye un sitio estático: HTML, CSS y JavaScript sin compilar, sin build ni npm; permite librerías gratuitas por CDN con versión exacta (jsDelivr/cdnjs), solo cuando el concepto las necesite. Debe abrir directo en el navegador.",
  "Estándar visual: composición y tipografía propias, ritmo e imágenes del cliente. Evita hero centrado con botón, tres tarjetas iguales, iconos genéricos y degradados por defecto. Justifica las decisiones con el pedido, las respuestas y referencias del cliente; no inventes testimonios ni premios. Dialoga con esas referencias sin copiarlas.",
  "Movimiento progresivo con GSAP/ScrollTrigger, Lenis, SplitType, Three.js/OGL o Swiper solo si aporta. Usa versiones exactas y licencias gratuitas, nunca latest. Contenido y navegación útiles sin JS o si falla el CDN. Respeta prefers-reduced-motion, foco y teclado. CSS moderno con clamp y container queries cuando convenga. Presupuesto: JS comprimido inicial <= 200 KB, imágenes iniciales <= 500 KB, carga diferida del 3D y fotos fuera de portada; objetivo Lighthouse móvil >= 85, no afirmes haberlo medido sin ejecutarlo.",
  "Cada archivo va en su propio bloque de código y en la línea de apertura pones el lenguaje y su ruta así: ```html archivo:index.html",
  "Archivos mínimos: index.html y estilos.css. Agrega más páginas (servicios.html, contacto.html…) y script.js si el diseño lo pide. Rutas relativas entre ellos (href=\"servicios.html\").",
  "Usa las fuentes de Google Fonts con <link>. Celular primero: tiene que verse perfecto a 390 px y a 1440 px.",
  "Imágenes: las del cliente están en img/<nombre-del-archivo> (usa los nombres exactos de la lista de archivos). Si falta una foto, usa un espacio neutro integrado en la composición y un texto corto que diga qué foto va ahí.",
  "Textos reales del cliente en su idioma, nada de lorem ipsum. Accesible: alt en imágenes, contraste suficiente, botones con texto.",
  "Antes de los archivos, en pocas líneas: qué páginas hay y qué falta para publicar. Después de los archivos, las líneas finales de siempre.",
].join("\n");

/** Ruta segura dentro del sitio (sin «..», sin rutas absolutas). */
export function rutaSegura(r: string): string | undefined {
  const x = normalize(r.trim().replace(/^\.?\/+/, "")).replace(/\\/g, "/");
  if (!x || x.startsWith("..") || x.includes("/../") || x.startsWith("/") || !/^[a-zA-Z0-9._\-/]+$/.test(x)) return;
  return x;
}

/** Saca los archivos de los bloques ```lang archivo:ruta de la entrega. */
export function leerArchivosSitio(texto: string): Record<string, string> {
  const archivos: Record<string, string> = {};
  const re = /```[a-zA-Z]*[ \t]+archivo:([^\s`]+)[^\n]*\n([\s\S]*?)\n?```/g;
  for (const m of texto.matchAll(re)) {
    const ruta = rutaSegura(m[1]);
    if (ruta && EXT.test(ruta)) archivos[ruta] = m[2];
  }
  return archivos;
}

/** La entrega legible: los bloques de archivos se cambian por la lista (los archivos se ven en la vista previa). */
export function sinArchivos(texto: string): string {
  return texto.replace(/```[a-zA-Z]*[ \t]+archivo:([^\s`]+)[^\n]*\n([\s\S]*?)\n?```/g, (_, r: string, c: string) => `- \`${r}\` · ${c.split("\n").length} líneas`);
}

const dirSitio = (id: string, v?: number) => join(carpeta(), id, "sitio", ...(v ? [`v${v}`] : []));

export function guardarSitio(id: string, version: number, archivos: Record<string, string>) {
  // Las fotos usadas quedan congeladas junto al código de esta versión.
  const contenido = Object.values(archivos).join("\n");
  for (const a of listarArchivos(id)) {
    if (!/^image\//.test(a.tipo) || !contenido.includes(`img/${a.nombre}`)) continue;
    const origen = rutaArchivo(id,a.nombre);
    if (!origen) continue;
    const destino = join(dirSitio(id,version),"img",a.nombre);
    mkdirSync(dirname(destino),{recursive:true});
    writeFileSync(destino,readFileSync(origen));
  }
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const r = rutaSegura(ruta);
    if (!r) continue;
    const destino = join(dirSitio(id, version), r);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  }
}

/** Imágenes de las direcciones, congeladas por versión igual que las de la web. */
export function guardarImagenesDirecciones(id:string, version:number, html:string) {
  for(const a of listarArchivos(id)) {
    if(!/^image\//.test(a.tipo)||!html.includes(`img/${a.nombre}`))continue;
    const origen=rutaArchivo(id,a.nombre);if(!origen)continue;
    const destino=join(carpeta(),id,"bocetos",`v${version}`,"img",a.nombre);
    mkdirSync(dirname(destino),{recursive:true});writeFileSync(destino,readFileSync(origen));
  }
}
export function imagenesDirecciones(id:string,version:number):{ruta:string;bytes:Buffer}[] {
  const dir=join(carpeta(),id,"bocetos",`v${version}`,"img");
  if(!existsSync(dir))return [];
  return readdirSync(dir).sort().map(nombre=>({ruta:`img/${nombre}`,bytes:readFileSync(join(dir,nombre))}));
}
export function leerImagenDireccion(id:string,version:number,ruta:string):Buffer|undefined {
  const r=rutaSegura(ruta);if(!r||!r.startsWith("img/")||!/^img\/[^/]+\.(png|jpe?g|webp|gif|svg)$/i.test(r))return;
  const archivo=join(carpeta(),id,"bocetos",`v${version}`,r);
  return existsSync(archivo)?readFileSync(archivo):undefined;
}

/** Versiones del sitio guardadas, de la más nueva a la más vieja. */
export function versionesSitio(id: string): number[] {
  const d = dirSitio(id);
  if (!existsSync(d)) return [];
  return readdirSync(d).map((x) => Number(x.match(/^v(\d+)$/)?.[1])).filter((n) => n > 0).sort((a, b) => b - a);
}

function todos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    return statSync(r).isDirectory() ? todos(r) : [r];
  });
}

/** Archivos de una versión del sitio. */
export function archivosSitio(id: string, version: number): { ruta: string; bytes: number }[] {
  const d = dirSitio(id, version);
  if (!existsSync(d)) return [];
  return todos(d).map((r) => ({ ruta: relative(d, r).split("\\").join("/"), bytes: statSync(r).size })).sort((a, b) => (a.ruta === "index.html" ? -1 : b.ruta === "index.html" ? 1 : a.ruta.localeCompare(b.ruta)));
}

/** Ruta en disco de un archivo del sitio, validada. */
export function rutaSitio(id: string, version: number, ruta: string): string | undefined {
  const r = rutaSegura(ruta);
  if (!r) return;
  const p = join(dirSitio(id, version), r);
  return existsSync(p) && statSync(p).isFile() ? p : undefined;
}

export const leerArchivoSitio = (id: string, version: number, ruta: string) => {
  const p = rutaSitio(id, version, ruta);
  return p ? readFileSync(p) : undefined;
};

/** Un sitio de ejemplo para el motor simulado: dos páginas con la dirección elegida o la marca. */
export function sitioSimulado(pedido: Pedido, d?: Direccion, marca?: Marca): Record<string, string> {
  const colores = (d?.colores ?? marca?.colores ?? [{ nombre: "Tinta", hex: "#1a1816" }, { nombre: "Hueso", hex: "#f4f1eb" }]).map((c) => c.hex);
  const [principal, fondo] = [colores[0], colores.find((c, i) => i > 0) ?? "#f4f1eb"];
  const tit = d?.tipografias.titulos ?? "Fraunces";
  const txt = d?.tipografias.texto ?? "Inter";
  const fuentes = `https://fonts.googleapis.com/css2?family=${tit.replace(/ /g, "+")}:wght@400;700&family=${txt.replace(/ /g, "+")}:wght@400;600&display=swap`;
  const cab = (titulo: string) => `<!doctype html>\n<html lang="${pedido.idioma ?? "es"}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${titulo} · ${pedido.cliente}</title>\n<link rel="stylesheet" href="${fuentes}">\n<link rel="stylesheet" href="estilos.css">\n</head>\n<body>\n<header class="nav"><a class="logo" href="index.html">${pedido.cliente}</a><nav><a href="index.html">Inicio</a><a href="servicios.html">Servicios</a></nav></header>`;
  const pie = `<footer>© ${new Date().getFullYear()} ${pedido.cliente}</footer>\n<script src="script.js"></script>\n</body>\n</html>\n`;
  return {
    "index.html": `${cab("Inicio")}\n<main>\n<section class="hero"><h1>${d?.portada.titular ?? pedido.cliente}</h1><p>${d?.portada.bajada ?? "Sitio de prueba armado sin IA."}</p><a class="boton" href="servicios.html">${d?.portada.boton ?? "Ver servicios"}</a></section>\n<section class="grid">${(d?.seccion.items ?? [{ titulo: "Uno", texto: "Primero." }, { titulo: "Dos", texto: "Después." }, { titulo: "Tres", texto: "Siempre." }]).map((i) => `<article><h2>${i.titulo}</h2><p>${i.texto}</p></article>`).join("")}</section>\n</main>\n${pie}`,
    "servicios.html": `${cab("Servicios")}\n<main><section class="hero"><h1>Servicios</h1><p>Lo que hacemos, en claro.</p></section></main>\n${pie}`,
    "estilos.css": `:root{--principal:${principal};--fondo:${fondo}}\n*{box-sizing:border-box}body{margin:0;font-family:"${txt}",system-ui,sans-serif;background:var(--fondo);color:#1a1816}\n.nav{display:flex;justify-content:space-between;align-items:center;padding:20px 6vw}.nav a{color:inherit;text-decoration:none;margin-left:18px}.logo{font-family:"${tit}",serif;font-size:22px;margin:0!important}\n.hero{padding:12vh 6vw 8vh}.hero h1{font-family:"${tit}",serif;font-size:clamp(40px,8vw,96px);line-height:.95;margin:0;max-width:14ch}.hero p{font-size:18px;max-width:46ch;opacity:.8}\n.boton{display:inline-block;margin-top:12px;background:var(--principal);color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;padding:0 6vw 10vh}.grid article{border-top:1px solid #0002;padding-top:12px}\nfooter{padding:32px 6vw;opacity:.6;font-size:14px}\n`,
    "script.js": `document.querySelectorAll(".grid article").forEach((a, i) => { a.style.transition = "opacity .6s " + i * 0.1 + "s"; });\n`,
  };
}
