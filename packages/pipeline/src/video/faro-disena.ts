// Faro diseña una pieza (sistema/123). No rellena plantillas: mira las referencias de «qué es bueno» (imágenes que
// subieron Jay y Luna), mira el material real del proyecto (capturas, tramos, logo) y escribe él mismo el diseño de
// cada lámina en HTML, al tamaño exacto del post. El sistema lo dibuja, otra mirada lo compara con las referencias y,
// si no llega, Faro lo rehace con lo que le dijeron. Jay o Luna aprueban o piden un cambio con una nota.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { pedirEstructura } from "../ia.ts";
import { textoFicha } from "../fichas-agentes.ts";
import { leerCliches } from "../cliches.ts";

export const NOTA_PIEZA = 7;
/** Cuántas veces la rehace solo antes de mostrarla igual, con lo que le falta. */
export const VUELTAS_PIEZA = 2;
export const ANCHO_POST = 1080, ALTO_POST = 1350;
/** Lo que Faro diseña (sistema/127): post o carrusel (4:5), la portada de un reel o una historia (9:16). */
export type FormatoFaro = "post" | "carrusel" | "reel" | "historia";
export const esVertical = (f: FormatoFaro) => f === "reel" || f === "historia";
export const medidasFaro = (f: FormatoFaro) => ({ ancho: 1080, alto: esVertical(f) ? 1920 : ALTO_POST });
/** Lo que se le explica a Faro de cada formato. */
export const TEXTO_FORMATO: Record<FormatoFaro, string> = {
  post: "Post o carrusel de Instagram (tú decides): cada lámina 1080×1350. Carrusel de 2 a 5 láminas.",
  carrusel: "Carrusel de Instagram de 2 a 5 láminas, cada una 1080×1350.",
  reel: "La PORTADA de un reel: UNA sola lámina de 1080×1920. El reel es el video del recorrido de su web, que ya existe; tu lámina es lo que se ve antes de darle play. En la grilla del perfil la portada se ve recortada al centro (1080×1350): lo importante va en esa franja central, nada importante en los 285 px de arriba ni de abajo.",
  historia: "UNA historia de Instagram de 1080×1920. Deja libres los 250 px de arriba y de abajo: ahí van los controles de Instagram.",
};

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
  /** Lo que dijo Nova antes de diseñar (sistema/124): los caminos, el que eligió y por qué. */
  sparring?: Sparring;
  /** El video que acompaña la pieza (un reel): el recorrido de su web, del material (sistema/127). */
  video?: string;
  fecha: string;
}

export interface PiezaFaro {
  id: string;
  cliente: string;
  nombreCliente: string;
  /** El proyecto que muestra: una web de «su trabajo real». */
  proyecto: { url: string; nombre: string };
  formato: FormatoFaro;
  estado: "trabajando" | "propuesta" | "aprobada" | "cambio";
  /** Si es una publicación del calendario del mes (sistema/127): de qué mes y pieza, y lo que ya estaba pensado. */
  enMes?: { mes: string; pieza: string; fecha: string; serie: string; idea: string; texto: string };
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

export async function crearPiezaFaro(o: { cliente: string; nombreCliente: string; proyecto: { url: string; nombre: string }; por: string; formato?: FormatoFaro; enMes?: PiezaFaro["enMes"] }): Promise<PiezaFaro> {
  const ahora = new Date().toISOString();
  const slug = o.proyecto.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "pieza";
  const p: PiezaFaro = { id: `f-${slug}-${Date.now().toString(36)}`, cliente: o.cliente, nombreCliente: o.nombreCliente, proyecto: o.proyecto, formato: o.formato ?? "post", ...(o.enMes ? { enMes: o.enMes } : {}), estado: "trabajando", versiones: [], por: o.por, creado: ahora, actualizado: ahora };
  const l = await leer();
  l.piezas[p.id] = p;
  await guardar(l);
  return p;
}

export const SISTEMA_DISENO = `Eres Faro, director de arte de Unmake, un estudio creativo. Diseñas UNA publicación de Instagram que muestra un proyecto real del estudio, al nivel de los estudios de primer nivel que ves en las referencias.

Antes de diseñar, mira las referencias con atención: así publican los estudios buenos. Fíjate en qué NO hacen: no ponen la web en una laptop o un celular dibujado sobre un fondo, no ponen rótulos tipo «Nuestro trabajo», no ponen el logo del estudio, no llenan de texto. Muestran el trabajo como una pieza de diseño: un recorte con carácter, la tipografía del proyecto en grande, el logo trabajado como objeto, una composición con tensión y aire.

La pieza va con la MARCA DEL PROYECTO (sus colores, su letra, su logo: vienen en «## La marca del proyecto»), nunca con la de la cuenta que publica. La cuenta solo pone el criterio y la voz.
Al menos una lámina muestra el TRABAJO REAL (una imagen del material: su web, un tramo, su logo), presentado con diseño. Un diagrama o una ilustración inspirada en el proyecto no reemplaza al trabajo.
Cómo se presenta el trabajo real (aquí fallan casi todas las piezas):
- Entero o recortado en un borde limpio. Un tramo o una pantalla completa, más chica que la lámina, con aire alrededor (al menos 80 px por lado) sobre el color del proyecto, ya es una pieza: así lo muestran los estudios.
- Si recortas, el corte cae en un espacio vacío de la web, nunca a media palabra, a medio botón ni a medio panel. Ante la duda, no recortes: muestra el tramo entero.
- Nada de ampliar un detalle hasta que se pixele o se salga del borde.

Con el material del proyecto (capturas de su web, tramos, su logo) compones algo que se sienta editorial y actual, no una captura de pantalla:
- Puedes recortar, escalar, rotar, repetir, enmascarar y combinar el material; usar su tipografía (Google Fonts) y sus colores; escribir 1 a 4 palabras si la composición lo pide (el nombre del proyecto, un dato), nunca frases.
- Una sola idea por lámina. Mucho cuidado con el borde: nada cortado por accidente, el elemento principal respira.
- Si es carrusel (2 a 5 láminas), cada lámina se sostiene sola y juntas cuentan el proyecto.

Técnica (obligatoria):
- Cada lámina es un documento HTML completo del tamaño EXACTO que dice «## Formato» (1080×1350 o 1080×1920): html y body con ese ancho y alto, overflow hidden, margin 0.
- Las imágenes del material se usan con src="material:NOMBRE_EXACTO" (o url('material:NOMBRE_EXACTO') en CSS). Solo los nombres de la lista.
- Fuentes: solo Google Fonts con <link>. Nada de scripts, nada de enlaces externos más que Google Fonts.
- Sin texto pequeño ilegible: nada menor a 28 px.

El texto de la publicación («texto»): 1 a 3 líneas: el nombre del proyecto, qué se hizo y el año. Sin emojis, sin hashtags, sin preguntas. Lo que no sabes (el año, un dato) no va: nunca escribas «[pendiente]» en algo que se publica.
Si ves «## El feed de la cuenta»: esas son las últimas publicaciones. La tuya va al lado: no repitas su idea, su composición ni su color dominante; alterna (si la última es oscura y llena, la tuya puede ser clara y con aire).
Si ves «## Lo que ya corrigieron Jay y Luna»: son reglas. Romper una es un error grave.
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
      porQue: { type: "string", description: "En una frase corta (máximo 200 caracteres): qué idea tiene la pieza y de qué referencia sale." },
    },
    required: ["formato", "laminas", "texto", "porQue"],
  },
};

export const SISTEMA_JUICIO = `Eres el director creativo de Unmake. Juzgas una publicación de Instagram ya dibujada al lado de las referencias de lo que es bueno (imágenes de estudios de primer nivel) y de las piezas que Jay ya aprobó.
La pregunta es una sola: ¿esto podría estar en el feed de esas referencias sin desentonar?
Nota de 0 a 10 con exigencia real: 7 es «se publica sin vergüenza al lado de las referencias»; 9 es «es de las mejores».
Mostrar una pantalla o un tramo de la web entero, limpio, con aire alrededor y en los colores del proyecto está BIEN: así lo hacen los estudios; no lo castigues por ser una captura.
Errores graves (nota máxima 4): los colores de la cuenta que publica en vez de los del proyecto; ninguna lámina muestra el trabajo real; la web metida en un aparato dibujado sobre un fondo; una captura pegada a sangre sin composición ni aire; texto largo o rótulos; el logo o la firma del estudio; algo cortado por accidente o que se sale del borde; letras ilegibles.
Si ves «## El feed de la cuenta», también es error grave repetir la idea o la composición de una publicación reciente.
Si ves «## Lo que ya corrigieron Jay y Luna», romper una de esas reglas es error grave.
«motivos»: hasta 3, concretos y cortos (qué falla y dónde), cada uno empieza con «Error:» (rompe una regla de la marca, del pedido o un cliché de la lista) u «Opinión:» (gusto o estrategia). «cambiar»: si la nota es menor que 7, qué tiene que hacer Faro en la próxima versión, en instrucciones claras.
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

/** El sparring de Nova (sistema/124): antes de diseñar, tres caminos, cuáles son cliché y cuál seguir. */
export interface Sparring { caminos: { nombre: string; idea: string; cliche: boolean }[]; elegido: number; porQue: string; preguntas: string[] }

const HERRAMIENTA_SPARRING = {
  nombre: "sparring",
  descripcion: "Tres caminos distintos para la pieza, cuáles son cliché, las preguntas duras y cuál seguir.",
  esquema: { type: "object", properties: {
    caminos: { type: "array", items: { type: "object", properties: { nombre: { type: "string" }, idea: { type: "string" }, cliche: { type: "boolean" } }, required: ["nombre", "idea", "cliche"] } },
    preguntas: { type: "array", items: { type: "string" } },
    elegido: { type: "integer", description: "El índice (desde 0) del camino a seguir: nunca uno marcado como cliché." },
    porQue: { type: "string" },
  }, required: ["caminos", "elegido", "porQue"] },
};

/** Lo que devolvió el sparring, limpio. Sin caminos válidos no sirve (y Faro diseña sin él). */
export function leerSparring(x: unknown): Sparring | undefined {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const caminos = (Array.isArray(r.caminos) ? r.caminos : []).map((c) => { const o = (c ?? {}) as Record<string, unknown>; return { nombre: String(o.nombre ?? "").trim().slice(0, 80), idea: String(o.idea ?? "").trim().slice(0, 400), cliche: o.cliche === true }; }).filter((c) => c.nombre && c.idea).slice(0, 3);
  if (!caminos.length) return undefined;
  let elegido = Number(r.elegido);
  if (!Number.isInteger(elegido) || elegido < 0 || elegido >= caminos.length || caminos[elegido]!.cliche) elegido = Math.max(0, caminos.findIndex((c) => !c.cliche));
  const preguntas = (Array.isArray(r.preguntas) ? r.preguntas : []).map((p) => String(p ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 3);
  return { caminos, elegido, porQue: corta(String(r.porQue ?? ""), 400), preguntas };
}

/** Nova discute la pieza antes de que Faro la diseñe: ve las referencias y el material, propone caminos y descarta clichés. */
export async function sparringPieza(o: { nombreCliente: string; proyecto: { nombre: string; url: string; nota?: string; fondo?: string; tinta?: string; letra?: string }; direccion: string; referencias: ImagenFaro[]; material: ImagenFaro[] }): Promise<Sparring | undefined> {
  const contenido = [
    ...bloques(o.referencias, "Referencia de lo que es bueno"),
    ...bloques(o.material.slice(0, 3), "Material del proyecto"),
    { type: "text", text: `## La pieza que va a diseñar Faro
Una publicación de Instagram de la cuenta de ${o.nombreCliente} que muestra el proyecto ${o.proyecto.nombre} (${o.proyecto.url}).${o.proyecto.nota ? ` ${o.proyecto.nota}` : ""}

La pieza va con la marca del PROYECTO (sus colores${o.proyecto.fondo ? `: fondo ${o.proyecto.fondo}` : ""}${o.proyecto.tinta ? `, texto ${o.proyecto.tinta}` : ""}${o.proyecto.letra ? `; su letra: ${o.proyecto.letra}` : ""}), nunca con los colores ni la letra de la cuenta que publica. Al menos una lámina muestra el trabajo real (su web, un tramo o su logo), entero o recortado en un borde limpio.

## Criterio y voz de la cuenta que publica (no sus colores)
${o.direccion.slice(0, 2000)}

Propón tres caminos realmente distintos (uno más audaz, uno más simple, uno que invierte la premisa), marca cuáles caen en un cliché, haz las preguntas más duras y elige el camino que Faro debe seguir.` },
  ];
  const r = await pedirEstructura(`Eres Nova, estratega de Unmake, en modo sparring.\n\n${textoFicha("nova", { cliches: await leerCliches() })}\nRespondes con la herramienta «sparring».`, contenido, HERRAMIENTA_SPARRING, 1500, { origen: "nova", tarea: "sparring" });
  return r === undefined ? undefined : leerSparring(r);
}

/** Lo que devolvió Faro, limpio. Sin láminas válidas no sirve. */
export function leerDiseno(x: unknown, pedido: FormatoFaro = "post"): { formato: FormatoFaro; html: string[]; texto: string; porQue: string } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  // Un reel o una historia es una sola lámina vertical; post y carrusel, de 1 a 5.
  const html = (Array.isArray(r.laminas) ? r.laminas : []).map((l) => String((l as { html?: unknown })?.html ?? "")).filter((h) => /<html|<body|<div/i.test(h)).slice(0, esVertical(pedido) ? 1 : 5).map(limpiarHtml);
  if (!html.length) throw new Error("Faro no devolvió el diseño de la pieza.");
  const texto = String(r.texto ?? "").replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").trim().slice(0, 600);
  return { formato: esVertical(pedido) ? pedido : html.length > 1 ? "carrusel" : "post", html, texto, porQue: corta(String(r.porQue ?? ""), 400) };
}

/** Corta en el último punto o espacio, nunca a media palabra. */
export function corta(t: string, max: number): string {
  t = t.trim();
  if (t.length <= max) return t;
  const c = t.slice(0, max);
  const punto = c.lastIndexOf(". ");
  return punto > max * 0.5 ? c.slice(0, punto + 1) : `${c.slice(0, c.lastIndexOf(" "))}…`;
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
  nombreCliente: string; proyecto: { url: string; nombre: string; nota?: string; fondo?: string; tinta?: string; letra?: string; logo?: string }; direccion: string;
  referencias: ImagenFaro[]; aprobadas: ImagenFaro[]; material: ImagenFaro[];
  anterior?: { html: string[]; imagen?: ImagenFaro }; cambiar?: string; sparring?: Sparring;
  /** Sistema/127: el formato, la idea del calendario, el feed de la cuenta y lo que ya corrigieron. */
  formato?: FormatoFaro; enMes?: PiezaFaro["enMes"]; feed?: ImagenFaro[]; aprendido?: string[];
}) {
  const formato = o.formato ?? "post";
  const contenido = [
    ...bloques(o.referencias, "Referencia de lo que es bueno"),
    ...bloques(o.aprobadas, "Pieza que Jay ya aprobó"),
    ...bloques(o.feed ?? [], "El feed de la cuenta (publicación reciente)"),
    ...bloques(o.material, "Material del proyecto (usar con material:NOMBRE)"),
    ...(o.anterior?.imagen ? bloques([o.anterior.imagen], "Tu versión anterior, como quedó dibujada") : []),
    { type: "text", text: [
      `## Formato\n${TEXTO_FORMATO[formato]}`,
      `## Proyecto\n${o.proyecto.nombre} · ${o.proyecto.url}${o.proyecto.nota ? `\n${o.proyecto.nota}` : ""}`,
      o.enMes ? `## La publicación del calendario (sale el ${o.enMes.fecha}, serie «${o.enMes.serie}»)\nIdea: ${o.enMes.idea}\nTexto que ya se pensó (puedes mejorarlo, con las mismas reglas del texto): ${o.enMes.texto.slice(0, 800)}` : "",
      o.feed?.length ? `## El feed de la cuenta\nArriba ves sus ${o.feed.length} publicaciones más recientes. No repitas su idea ni su composición.` : "",
      o.aprendido?.length ? `## Lo que ya corrigieron Jay y Luna (reglas)\n${o.aprendido.slice(0, 10).map((a) => `- ${a}`).join("\n")}` : "",
      `## Para quién publica\nLa cuenta de ${o.nombreCliente}. El proyecto es de un cliente del estudio: la pieza va con la marca del proyecto (sus colores, su letra), nunca con la del estudio.`,
      `## La marca del proyecto (la pieza va con esto)\n${[o.proyecto.fondo ? `Color de fondo de su web: ${o.proyecto.fondo}` : "", o.proyecto.tinta ? `Color de su texto: ${o.proyecto.tinta}` : "", o.proyecto.letra ? `Letra de sus títulos: ${o.proyecto.letra} (si está en Google Fonts, cárgala; si no, la más parecida)` : "", o.proyecto.logo ? `Su logo: material:${o.proyecto.logo}` : "", "Saca los demás colores de las capturas de su web."].filter(Boolean).join("\n")}`,
      o.direccion ? `## Criterio y voz de la cuenta que publica (no sus colores)\n${o.direccion.slice(0, 2500)}` : "",
      o.sparring ? `## El camino que eligió Nova en el sparring (síguelo)\n${o.sparring.caminos[o.sparring.elegido]!.nombre}: ${o.sparring.caminos[o.sparring.elegido]!.idea}\nPor qué: ${o.sparring.porQue}${o.sparring.caminos.some((c) => c.cliche) ? `\nDescartados por cliché: ${o.sparring.caminos.filter((c) => c.cliche).map((c) => c.nombre).join(", ")}` : ""}${o.sparring.preguntas.length ? `\nPreguntas que tu pieza tiene que resistir: ${o.sparring.preguntas.join(" · ")}` : ""}` : "",
      `## Material disponible (nombres exactos)\n${o.material.map((m) => `- ${m.archivo}: ${m.que}`).join("\n")}`,
      o.cambiar ? `## Lo que hay que cambiar de tu versión anterior (obligatorio)\n${o.cambiar}\n\nTu HTML anterior, para que partas de él o lo descartes:\n${(o.anterior?.html ?? []).map((h, i) => `--- lámina ${i + 1} ---\n${h.slice(0, 6000)}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n") },
  ];
  const modelo = process.env.ANTHROPIC_MODEL_DISENO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  const r = await pedirEstructura(`${SISTEMA_DISENO}\n\n${textoFicha("faro", { cliches: await leerCliches() })}`, contenido, HERRAMIENTA_DISENO, 16000, { origen: "faro", tarea: "pieza" }, modelo, 170000);
  if (r === undefined) throw new Error("Falta la clave de Anthropic: sin ella Faro no puede diseñar.");
  return leerDiseno(r, formato);
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
export async function juzgarPieza(o: { laminas: Buffer[]; referencias: ImagenFaro[]; aprobadas: ImagenFaro[]; texto: string; version: number; formato?: FormatoFaro; feed?: ImagenFaro[]; aprendido?: string[] }) {
  const contenido = [
    ...bloques(o.referencias, "Referencia de lo que es bueno"),
    ...bloques(o.aprobadas, "Pieza que Jay ya aprobó"),
    ...bloques(o.feed ?? [], "El feed de la cuenta (publicación reciente)"),
    ...o.laminas.slice(0, 5).flatMap((b, i) => [{ type: "text", text: `La pieza a juzgar, lámina ${i + 1} de ${o.laminas.length}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.toString("base64") } }]),
    { type: "text", text: [`## Formato\n${TEXTO_FORMATO[o.formato ?? "post"]}`, o.feed?.length ? `## El feed de la cuenta\nArriba ves sus ${o.feed.length} publicaciones más recientes.` : "", o.aprendido?.length ? `## Lo que ya corrigieron Jay y Luna (reglas)\n${o.aprendido.slice(0, 10).map((a) => `- ${a}`).join("\n")}` : "", `Versión ${o.version}. Texto de la publicación:\n${o.texto}`].filter(Boolean).join("\n\n") },
  ];
  const r = await pedirEstructura(`${SISTEMA_JUICIO}\n\n${textoFicha("mira", { cliches: await leerCliches() })}`, contenido, HERRAMIENTA_JUICIO, 1500, { origen: "faro", tarea: "vara" });
  if (r === undefined) throw new Error("Falta la clave de Anthropic.");
  return leerJuicio(r);
}
