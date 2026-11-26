// Faro diseña una pieza (sistema/123). No rellena plantillas: mira las referencias de «qué es bueno» (imágenes que
// subieron Jay y Luna), mira el material real del proyecto (capturas, tramos, logo) y escribe él mismo el diseño de
// cada lámina en HTML, al tamaño exacto del post. El sistema lo dibuja, otra mirada lo compara con las referencias y,
// si no llega, Faro lo rehace con lo que le dijeron. Jay o Luna aprueban o piden un cambio con una nota.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { pedirEstructura } from "../ia.ts";

export const NOTA_PIEZA = 7;
/** Cuántas veces la rehace solo antes de mostrarla igual, con lo que le falta. */
export const VUELTAS_PIEZA = 2;
export const ANCHO_POST = 1080, ALTO_POST = 1350;

/** Una imagen que Faro ve: con nombre (para usarla en el diseño) y qué es. */
export interface ImagenFaro { archivo: string; que: string; datos: string; tipo: "image/jpeg" | "image/png" }

export interface VersionPieza {
  n: number;
  /** El diseño de cada lámina, tal como lo escribió Faro (con «material:archivo» en las imágenes). */
  html: string[];
  /** Las láminas dibujadas (archivos del arte). */
  laminas: string[];
  texto: string;
  porQue?: string;
  nota?: number;
  motivos?: string[];
  /** Qué tenía que cambiar (lo de la revisión o la nota de Jay/Luna). */
  pedido?: string;
  fecha: string;
}

export interface PiezaFaro {
  id: string;
  cliente: string;
  nombreCliente: string;
  /** El proyecto que muestra: una web de «su trabajo real». */
  proyecto: { url: string; nombre: string };
  formato: "post" | "carrusel";
  estado: "trabajando" | "propuesta" | "aprobada" | "cambio";
  versiones: VersionPieza[];
  /** La nota de Jay o Luna al pedir un cambio. */
  nota?: string;
  por: string;
  creado: string;
  actualizado: string;
}

interface ListaPiezas { actualizado: string; piezas: Record<string, PiezaFaro> }
const REL = "_contenido/lista/piezas-faro.json";
const local = () => join(carpeta(), REL);
export const idPiezaValido = (id: string) => /^f-[a-z0-9-]{4,80}$/.test(id);
/** Donde se guarda el arte de estas piezas (artes.ts: _arte/<mes>/<archivo>). */
export const MES_PIEZAS = "piezas-faro";

async function leer(): Promise<ListaPiezas> {
  let texto: string | undefined;
  if (nubeActiva()) { const b = await leerSuelto(REL); texto = b ? Buffer.from(b).toString("utf8") : undefined; }
  else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  const l = texto ? (JSON.parse(texto) as ListaPiezas) : undefined;
  return { actualizado: l?.actualizado ?? "", piezas: l?.piezas ?? {} };
}
async function guardar(l: ListaPiezas) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), "_contenido", "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

export async function listarPiezasFaro(cliente?: string): Promise<PiezaFaro[]> {
  const l = await leer();
  return Object.values(l.piezas).filter((p) => !cliente || p.cliente === cliente).sort((a, b) => b.creado.localeCompare(a.creado));
}
export async function leerPiezaFaro(id: string) { return (await leer()).piezas[id]; }

/** Cambia una pieza leyendo lo último antes de guardar. */
export async function cambiarPiezaFaro(id: string, f: (p: PiezaFaro) => void): Promise<PiezaFaro> {
  const l = await leer();
  const p = l.piezas[id];
  if (!p) throw new Error("No encontramos esa pieza.");
  f(p);
  p.actualizado = new Date().toISOString();
  await guardar(l);
  return p;
}

export async function crearPiezaFaro(o: { cliente: string; nombreCliente: string; proyecto: { url: string; nombre: string }; por: string }): Promise<PiezaFaro> {
  const ahora = new Date().toISOString();
  const slug = o.proyecto.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "pieza";
  const p: PiezaFaro = { id: `f-${slug}-${Date.now().toString(36)}`, cliente: o.cliente, nombreCliente: o.nombreCliente, proyecto: o.proyecto, formato: "post", estado: "trabajando", versiones: [], por: o.por, creado: ahora, actualizado: ahora };
  const l = await leer();
  l.piezas[p.id] = p;
  await guardar(l);
  return p;
}

export const SISTEMA_DISENO = `Eres Faro, director de arte de Unmake, un estudio creativo. Diseñas UNA publicación de Instagram que muestra un proyecto real del estudio, al nivel de los estudios de primer nivel que ves en las referencias.

Antes de diseñar, mira las referencias con atención: así publican los estudios buenos. Fíjate en qué NO hacen: no ponen la web en una laptop o un celular dibujado sobre un fondo, no ponen rótulos tipo «Nuestro trabajo», no ponen el logo del estudio, no llenan de texto. Muestran el trabajo como una pieza de diseño: un recorte con carácter, la tipografía del proyecto en grande, el logo trabajado como objeto, una composición con tensión y aire.

Con el material del proyecto (capturas de su web, tramos, su logo) compones algo que se sienta editorial y actual, no una captura de pantalla:
- Puedes recortar, escalar, rotar, repetir, enmascarar y combinar el material; usar su tipografía (Google Fonts) y sus colores; escribir 1 a 4 palabras si la composición lo pide (el nombre del proyecto, un dato), nunca frases.
- Una sola idea por lámina. Mucho cuidado con el borde: nada cortado por accidente, el elemento principal respira.
- Si es carrusel (2 a 5 láminas), cada lámina se sostiene sola y juntas cuentan el proyecto.

Técnica (obligatoria):
- Cada lámina es un documento HTML completo de exactamente ${ANCHO_POST}×${ALTO_POST} px: html y body con ese ancho y alto, overflow hidden, margin 0.
- Las imágenes del material se usan con src="material:NOMBRE_EXACTO" (o url('material:NOMBRE_EXACTO') en CSS). Solo los nombres de la lista.
- Fuentes: solo Google Fonts con <link>. Nada de scripts, nada de enlaces externos más que Google Fonts.
- Sin texto pequeño ilegible: nada menor a 28 px.

El texto de la publicación («texto»): 1 a 3 líneas: el nombre del proyecto, qué se hizo y el año. Sin emojis, sin hashtags, sin preguntas.
Respondes siempre con la herramienta «disenar_pieza».`;

const HERRAMIENTA_DISENO = {
  nombre: "disenar_pieza",
  descripcion: "La publicación diseñada: el formato, el HTML de cada lámina, el texto y por qué.",
  esquema: {
    type: "object",
    properties: {
      formato: { type: "string", enum: ["post", "carrusel"] },
      laminas: { type: "array", items: { type: "object", properties: { html: { type: "string" } }, required: ["html"] } },
      texto: { type: "string" },
      porQue: { type: "string", description: "En una frase: qué idea tiene la pieza y de qué referencia sale." },
    },
    required: ["formato", "laminas", "texto", "porQue"],
  },
};

export const SISTEMA_JUICIO = `Eres el director creativo de Unmake. Juzgas una publicación de Instagram ya dibujada al lado de las referencias de lo que es bueno (imágenes de estudios de primer nivel) y de las piezas que Jay ya aprobó.
La pregunta es una sola: ¿esto podría estar en el feed de esas referencias sin desentonar?
Nota de 0 a 10 con exigencia real: 7 es «se publica sin vergüenza al lado de las referencias»; 9 es «es de las mejores».
Errores graves (nota máxima 4): la web metida en un aparato dibujado sobre un fondo; una captura de pantalla sin intervenir; texto largo o rótulos; el logo o la firma del estudio; algo cortado por accidente o que se sale del borde; letras ilegibles.
«motivos»: hasta 3, concretos y cortos (qué falla y dónde). «cambiar»: si la nota es menor que 7, qué tiene que hacer Faro en la próxima versión, en instrucciones claras.
Respondes siempre con la herramienta «juzgar_pieza».`;

const HERRAMIENTA_JUICIO = {
  nombre: "juzgar_pieza",
  descripcion: "La nota de la pieza frente a las referencias, los motivos y qué cambiar.",
  esquema: { type: "object", properties: { nota: { type: "number" }, motivos: { type: "array", items: { type: "string" } }, cambiar: { type: "string" } }, required: ["nota", "motivos"] },
};

const bloques = (imgs: ImagenFaro[], titulo: string) => imgs.flatMap((m) => [
  { type: "text", text: `${titulo} · ${m.archivo} · ${m.que}` },
  { type: "image", source: { type: "base64", media_type: m.tipo, data: m.datos } },
]);

/** Lo que devolvió Faro, limpio. Sin láminas válidas no sirve. */
export function leerDiseno(x: unknown): { formato: "post" | "carrusel"; html: string[]; texto: string; porQue: string } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const html = (Array.isArray(r.laminas) ? r.laminas : []).map((l) => String((l as { html?: unknown })?.html ?? "")).filter((h) => /<html|<body|<div/i.test(h)).slice(0, 5).map(limpiarHtml);
  if (!html.length) throw new Error("Faro no devolvió el diseño de la pieza.");
  const texto = String(r.texto ?? "").replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").trim().slice(0, 600);
  return { formato: html.length > 1 ? "carrusel" : "post", html, texto, porQue: String(r.porQue ?? "").trim().slice(0, 300) };
}

/** Sin scripts ni recursos de afuera (salvo Google Fonts): la pieza se dibuja con lo que Faro escribió y el material. */
export function limpiarHtml(h: string): string {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/<link\b(?![^>]*fonts\.(googleapis|gstatic)\.com)[^>]*>/gi, "")
    .replace(/(src|href)\s*=\s*"(?!material:|https:\/\/fonts\.(googleapis|gstatic)\.com|data:|#)[^"]*"/gi, '$1=""')
    .slice(0, 60000);
}

/** Pone las imágenes del material en lugar de «material:nombre». Lo que no exista queda vacío. */
export function conMaterial(html: string, imgs: Record<string, string>): string {
  return html.replace(/material:([a-z0-9][a-z0-9._-]{2,90})/gi, (_t, n: string) => imgs[n] ?? "");
}

/** Faro diseña la pieza (o la rehace con lo que hay que cambiar). */
export async function disenarPieza(o: {
  nombreCliente: string; proyecto: { url: string; nombre: string; nota?: string }; direccion: string;
  referencias: ImagenFaro[]; aprobadas: ImagenFaro[]; material: ImagenFaro[];
  anterior?: { html: string[]; imagen?: ImagenFaro }; cambiar?: string;
}) {
  const contenido = [
    ...bloques(o.referencias, "Referencia de lo que es bueno"),
    ...bloques(o.aprobadas, "Pieza que Jay ya aprobó"),
    ...bloques(o.material, "Material del proyecto (usar con material:NOMBRE)"),
    ...(o.anterior?.imagen ? bloques([o.anterior.imagen], "Tu versión anterior, como quedó dibujada") : []),
    { type: "text", text: [
      `## Proyecto\n${o.proyecto.nombre} · ${o.proyecto.url}${o.proyecto.nota ? `\n${o.proyecto.nota}` : ""}`,
      `## Para quién publica\nLa cuenta de ${o.nombreCliente}. El proyecto es de un cliente del estudio: la pieza va con la marca del proyecto (sus colores, su letra), nunca con la del estudio.`,
      o.direccion ? `## Dirección del estudio\n${o.direccion.slice(0, 2500)}` : "",
      `## Material disponible (nombres exactos)\n${o.material.map((m) => `- ${m.archivo}: ${m.que}`).join("\n")}`,
      o.cambiar ? `## Lo que hay que cambiar de tu versión anterior (obligatorio)\n${o.cambiar}\n\nTu HTML anterior, para que partas de él o lo descartes:\n${(o.anterior?.html ?? []).map((h, i) => `--- lámina ${i + 1} ---\n${h.slice(0, 6000)}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n") },
  ];
  const modelo = process.env.ANTHROPIC_MODEL_DISENO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  const r = await pedirEstructura(SISTEMA_DISENO, contenido, HERRAMIENTA_DISENO, 16000, { origen: "faro", tarea: "pieza" }, modelo, 170000);
  if (r === undefined) throw new Error("Falta la clave de Anthropic: sin ella Faro no puede diseñar.");
  return leerDiseno(r);
}

/** Lo que devolvió el juicio, limpio. */
export function leerJuicio(x: unknown): { nota: number; motivos: string[]; cambiar: string } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const nota = Number(r.nota);
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) throw new Error("La revisión no devolvió una nota.");
  const motivos = (Array.isArray(r.motivos) ? r.motivos : []).map((m) => String(m ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 3);
  return { nota: Math.round(nota * 10) / 10, motivos, cambiar: String(r.cambiar ?? "").trim().slice(0, 1200) };
}

/** Mira la pieza dibujada al lado de las referencias y de lo ya aprobado. */
export async function juzgarPieza(o: { laminas: Buffer[]; referencias: ImagenFaro[]; aprobadas: ImagenFaro[]; texto: string; version: number }) {
  const contenido = [
    ...bloques(o.referencias, "Referencia de lo que es bueno"),
    ...bloques(o.aprobadas, "Pieza que Jay ya aprobó"),
    ...o.laminas.slice(0, 5).flatMap((b, i) => [{ type: "text", text: `La pieza a juzgar, lámina ${i + 1} de ${o.laminas.length}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.toString("base64") } }]),
    { type: "text", text: `Versión ${o.version}. Texto de la publicación:\n${o.texto}` },
  ];
  const r = await pedirEstructura(SISTEMA_JUICIO, contenido, HERRAMIENTA_JUICIO, 1500, { origen: "faro", tarea: "vara" });
  if (r === undefined) throw new Error("Falta la clave de Anthropic.");
  return leerJuicio(r);
}
