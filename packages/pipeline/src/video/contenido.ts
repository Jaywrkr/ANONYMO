// El mes de contenido (sistema/96): Faro arma el calendario de un cliente con lo que se sabe de él.
// Las fechas las pone el sistema según cada cuánto publica; Faro llena cada fecha con su serie, formato, idea, texto
// y qué se ve. Jay o Luna aprueban pieza por pieza, piden cambios o la corrigen a mano, y los reels pasan a guion.
// Vive en `_contenido/lista/meses.json` (nube privada o proyectos/). Nunca se publica nada solo.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { pedirEstructura } from "../ia.ts";
import { estiloPara } from "./artes.ts";

export type FormatoPieza = "reel" | "carrusel" | "post" | "historia";
export const FORMATOS: Record<FormatoPieza, string> = { reel: "Reel", carrusel: "Carrusel", post: "Post", historia: "Historia" };
export type EstadoPieza = "propuesta" | "aprobada" | "cambio";
export const ESTADOS_PIEZA: Record<EstadoPieza, string> = { propuesta: "Por revisar", aprobada: "Aprobada", cambio: "Pidieron un cambio" };

/** Cada serie usa siempre la misma plantilla de arte, para que se reconozca de lejos (sistema/107). */
export type PlantillaArte = "frase" | "tachado" | "lista" | "dato" | "mito" | "pregunta" | "portada";
export const PLANTILLAS_ARTE: Record<PlantillaArte, { nombre: string; para: string; formatos: FormatoPieza[] }> = {
  frase: { nombre: "Frase", para: "Una idea en una frase grande, con mucho aire.", formatos: ["post"] },
  tachado: { nombre: "Tachado", para: "Una palabra tachada y la que la reemplaza («Excusa → Decisión.»).", formatos: ["post"] },
  lista: { nombre: "Lista", para: "Portada, de 3 a 7 puntos (uno por lámina) y un cierre. Para enseñar o revisar algo.", formatos: ["carrusel"] },
  dato: { nombre: "Dato", para: "Un número real grande y qué significa. Solo con cifras que se saben.", formatos: ["post", "carrusel"] },
  mito: { nombre: "Mito", para: "Lo que se cree y lo que es en realidad, en tres láminas.", formatos: ["carrusel"] },
  pregunta: { nombre: "Pregunta", para: "Una pregunta que hacen los clientes y la respuesta en pasos.", formatos: ["carrusel"] },
  portada: { nombre: "Portada de reel", para: "La portada del reel: el título que se ve en el perfil.", formatos: ["reel"] },
};
export const esPlantillaArte = (x: unknown): x is PlantillaArte => typeof x === "string" && x in PLANTILLAS_ARTE;

/** Lo que va escrito en el arte. Cada plantilla usa sus campos. */
export interface Lamina {
  antetitulo?: string;
  titulo: string;
  bajada?: string;
  /** PlantillaArte «tachado»: lo que se tacha. */
  tachado?: string;
  /** PlantillaArte «dato»: la cifra. */
  numero?: string;
  /** «lista», «pregunta» y «mito»: una lámina por punto. */
  items?: { t: string; d?: string }[];
  cierre?: string;
}
export type Sticker = "encuesta" | "pregunta" | "quiz" | "deslizador";
/** Una historia del día: qué se sube y, si lleva, qué sticker y con qué opciones. */
export interface Historia { texto: string; sticker?: Sticker; opciones?: string[] }
/** La otra opción de la misma fecha (B): misma serie, otra idea. */
export interface OpcionPieza { idea: string; texto: string; visual: string; lamina?: Lamina; artes?: string[] }

export interface Pieza {
  id: string;
  /** AAAA-MM-DD */
  fecha: string;
  serie: string;
  formato: FormatoPieza;
  /** De qué trata, en una frase. */
  idea: string;
  /** El texto que acompaña la publicación. */
  texto: string;
  /** Qué se ve: la imagen, las láminas o las tomas. */
  visual: string;
  estado: EstadoPieza;
  nota?: string;
  /** El guion de Faro, si es un reel y ya se escribió. */
  guion?: string;
  // — Desde sistema/107: lo que tenían los planificadores de @jaywrkr y Coresolutions —
  /** A qué hora se publica (Cuenca), «18:00». */
  hora?: string;
  plantilla?: PlantillaArte;
  /** El arte de la opción elegida (A). */
  lamina?: Lamina;
  /** La otra opción. «Elegir B» las intercambia. */
  b?: OpcionPieza;
  /** Las historias del día, en orden. */
  historias?: Historia[];
  /** Para los reels: cómo sube a YouTube Shorts. */
  youtube?: { titulo: string; descripcion: string };
  /** Los archivos del arte ya dibujado (en _arte/<mes>/). */
  artes?: string[];
  /** Lo que la revisión automática encontró (sistema/107): se ve en la pieza antes de aprobar. */
  avisos?: string[];
}

export interface PasoMes { cuando: string; quien: string; que: string }

export interface MesContenido {
  id: string;
  /** La ficha del cliente. */
  cliente: string;
  nombre: string;
  /** AAAA-MM */
  mes: string;
  canales: string;
  frecuencia: string;
  pedido?: string;
  series: { nombre: string; para: string; plantilla?: PlantillaArte }[];
  piezas: Pieza[];
  /** El estilo del arte (sistema/107): unmake, coresolutions, jaywrkr o el de su ficha. */
  estilo?: string;
  historia: PasoMes[];
  creado: string;
  actualizado: string;
}

interface ListaMeses { actualizado: string; meses: Record<string, MesContenido> }

const REL = "_contenido/lista/meses.json";
const local = () => join(carpeta(), REL);
export const idMesValido = (id: string) => /^c-[a-z0-9][a-z0-9-]{0,60}-\d{4}-\d{2}$/.test(id);
export const idMes = (cliente: string, mes: string) => `c-${cliente}-${mes}`;

async function leer(): Promise<ListaMeses> {
  let texto: string | undefined;
  if (nubeActiva()) { const b = await leerSuelto(REL); texto = b ? Buffer.from(b).toString("utf8") : undefined; }
  else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  const l = texto ? (JSON.parse(texto) as ListaMeses) : undefined;
  return { actualizado: l?.actualizado ?? "", meses: l?.meses ?? {} };
}

async function guardar(l: ListaMeses) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), "_contenido", "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

export async function listarMeses(): Promise<MesContenido[]> {
  return Object.values((await leer()).meses).sort((a, b) => b.mes.localeCompare(a.mes) || b.actualizado.localeCompare(a.actualizado));
}
export async function leerMesContenido(id: string) {
  return idMesValido(id) ? (await leer()).meses[id] : undefined;
}

// — Fechas: las pone el sistema, no la IA —

const NUMEROS: Record<string, number> = { una: 1, un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7 };
/** Cuántas veces por semana, de lo que dice la ficha («3 veces por semana», «todos los días», «dos a la semana»). Sin dato, 3. */
export function vecesPorSemana(frecuencia: string | undefined): number {
  const t = (frecuencia ?? "").toLowerCase();
  if (/diari|todos los d[ií]as|cada d[ií]a/.test(t)) return 7;
  const n = Number(t.match(/\d+/)?.[0] ?? NUMEROS[Object.keys(NUMEROS).find((k) => new RegExp(`\\b${k}\\b`).test(t)) ?? ""] ?? NaN);
  if (!Number.isFinite(n) || n <= 0) return 3;
  if (/mes/.test(t)) return Math.max(1, Math.min(7, Math.round(n / 4)));
  return Math.max(1, Math.min(7, n));
}

/** Los días de la semana en que se publica (0 = lunes), repartidos para no amontonar. */
export const DIAS_PUBLICACION: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${a}`; };

/** Las fechas del mes en que se publica. */
export function fechasDelMes(mes: string, frecuencia: string | undefined): string[] {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const dias = DIAS_PUBLICACION[vecesPorSemana(frecuencia)]!;
  const out: string[] = [];
  for (let d = 1; d <= new Date(Date.UTC(a, m, 0)).getUTCDate(); d++) {
    const dia = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
    if (dias.includes(dia)) out.push(`${mes}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

const hoyCuenca = (ahora: Date) => new Date(ahora.toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
/** El mes que se planifica si no se dice otro: el siguiente. */
export function mesPorDefecto(ahora = new Date()): string {
  const h = hoyCuenca(ahora);
  const s = new Date(h.getFullYear(), h.getMonth() + 1, 1);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`;
}
/** El mes nombrado en un texto («diciembre», «enero 2027»): el próximo que venga. */
export function mesDeTexto(texto: string, ahora = new Date()): string | undefined {
  const t = texto.toLowerCase();
  const i = MESES.findIndex((m) => t.includes(m));
  if (i < 0) return undefined;
  const h = hoyCuenca(ahora);
  const anio = Number(t.match(/20\d{2}/)?.[0]) || (i < h.getMonth() ? h.getFullYear() + 1 : h.getFullYear());
  return `${anio}-${String(i + 1).padStart(2, "0")}`;
}

// — Faro arma el mes —
// Sistema/107: Faro trabaja como los planificadores de @jaywrkr y Coresolutions. Primero el calendario (series con su
// plantilla, hora e ideas A y B por fecha); después, en tandas en paralelo, cada pieza completa: el texto de A y B, lo que
// va escrito en el arte, las historias con su sticker y, en reels, cómo sube a YouTube.

export const SISTEMA_MES = `Faro arma el mes de contenido de un cliente de Unmake. Piensa en series: pocos temas que se repiten y se reconocen de lejos.
Respondes siempre con la herramienta «armar_calendario». Todavía no escribes las piezas: solo el calendario.

Reglas:
- Usa solo lo que se sabe del cliente. No inventes precios, promociones, premios, nombres, cifras ni datos de su negocio.
- De 3 a 5 series. Cada serie tiene UNA plantilla de arte fija para que se reconozca: ${Object.entries(PLANTILLAS_ARTE).filter(([k]) => k !== "portada").map(([k, v]) => `«${k}» (${v.para})`).join("; ")}. Los reels usan la portada, sea cual sea su serie.
- Una fecha por cada una de la lista, en el mismo orden. «n» es el número de la fecha. Las series se alternan.
- Formatos: carrusel para enseñar en pasos, post para una idea o frase, reel para lo que se muestra en movimiento o habla una persona. Al menos un reel por semana si publica en Instagram.
- «hora»: la mejor hora para su público, en Cuenca (por ejemplo 08:30 para empresas en días laborables, 18:00 o 19:00 para personas).
- «ideaA» y «ideaB»: dos ideas distintas para la misma fecha y serie, en una frase cada una. A es la recomendada.
- Español de Ecuador, directo, sin palabras rebuscadas.`;

export const SISTEMA_PIEZAS = `Faro escribe las piezas del mes de contenido de un cliente de Unmake: todo lo que hace falta para publicar sin pensar.
Respondes siempre con la herramienta «escribir_piezas», con una pieza por cada fecha que te pasan.

Para cada pieza escribe las dos opciones (A y B), con la misma serie y plantilla:
- «texto»: lo que acompaña la publicación. La primera línea se entiende sola y engancha. De 2 a 6 líneas cortas. Termina con una pregunta concreta o una acción simple (guardarlo, mandárselo a alguien, escribir por mensaje). Sin emojis, sin hashtags, sin frases de motivación vacías, sin sonar a anuncio.
- «lamina»: lo que va escrito en el arte, según la plantilla:
  · frase: titulo (máximo 70 caracteres), antetitulo y bajada opcionales.
  · tachado: tachado (una palabra o frase corta que se descarta) y titulo (la que la reemplaza, con punto final).
  · lista: antetitulo (TEMA · SUBTEMA), titulo (la promesa, con el número de puntos), bajada, items (3 a 7: t = el punto en una línea, d = por qué, en una o dos frases) y cierre (qué hacer).
  · dato: numero (solo una cifra que esté en lo que se sabe), titulo y bajada.
  · mito: titulo (el mito, como lo dice la gente), items con un solo elemento cuyo d es la realidad, y cierre.
  · pregunta: titulo (la pregunta como la hace el cliente), items (los pasos de la respuesta) y cierre.
  · portada (reels): titulo corto para la portada.
- «visual»: solo si hace falta una foto o video real: qué se graba o fotografía. Si el arte basta, escribe «Solo el arte».
- «historias» (de la opción A): 2 o 3, en orden. La 1 comparte el post con una línea. La 2 lleva un sticker (encuesta con 2 opciones, pregunta, quiz o deslizador) conectado con el post. La 3, si va, es el proceso o la respuesta a las 24 horas.
- «youtube» solo en reels: titulo (con #shorts, máximo 90 caracteres) y descripcion (2 a 4 líneas).

Usa solo lo que se sabe del cliente. No inventes precios, cifras, premios ni nombres. Sigue sus reglas de marca al pie de la letra.

Así se ve una pieza bien hecha (es la forma, no copies el tema):
1) Serie «tachado», post, estilo @jaywrkr. lamina: { tachado: "Excusa", titulo: "Decisión." }. texto: "Una palabra cambia el plan entero.\n¿Cuál tachas hoy?". historias: ["Comparte el post y escribe solo: «¿cuál tachas tú?»", sticker pregunta: "¿Qué palabra pondrías tú?"].
2) Serie «checklist» (plantilla lista), carrusel, estilo Coresolutions. lamina: { antetitulo: "VMWARE · RENOVACIÓN", titulo: "5 preguntas antes de renovar su licencia VMware", bajada: "Revíselas con su equipo antes de firmar.", items: [{ t: "¿Cuántos núcleos licencia, y cuántos usa?", d: "VMware se licencia por núcleo físico. Cuente los núcleos de cada host antes de cotizar." }, …], cierre: "Guárdelo para su próxima renovación." }. texto: "5 preguntas antes de renovar su licencia VMware.\n\n1. …\n\nGuárdelo y compártalo con su equipo de TI.". historias: ["5 preguntas antes de firmar.", sticker encuesta: "¿Cuándo vence su licencia VMware?" (Este año / En 2027)].`;
const HERRAMIENTA_MES = {
  nombre: "armar_mes",
  descripcion: "El mes de contenido: las series y una pieza por fecha.",
  esquema: {
    type: "object",
    properties: {
      series: { type: "array", items: { type: "object", properties: { nombre: { type: "string" }, para: { type: "string", description: "Para qué sirve esta serie" } }, required: ["nombre", "para"] } },
      piezas: {
        type: "array",
        items: {
          type: "object",
          properties: { n: { type: "integer" }, serie: { type: "string" }, formato: { type: "string", enum: ["reel", "carrusel", "post", "historia"] }, idea: { type: "string" }, texto: { type: "string" }, visual: { type: "string" } },
          required: ["n", "serie", "formato", "idea", "texto", "visual"],
        },
      },
    },
    required: ["series", "piezas"],
  },
};

const HERRAMIENTA_CALENDARIO = {
  nombre: "armar_calendario",
  descripcion: "Las series del mes con su plantilla y, por fecha, la serie, el formato, la hora y dos ideas.",
  esquema: {
    type: "object",
    properties: {
      series: { type: "array", items: { type: "object", properties: { nombre: { type: "string" }, para: { type: "string" }, plantilla: { type: "string", enum: Object.keys(PLANTILLAS_ARTE).filter((k) => k !== "portada") } }, required: ["nombre", "para", "plantilla"] } },
      fechas: { type: "array", items: { type: "object", properties: { n: { type: "integer" }, serie: { type: "string" }, formato: { type: "string", enum: ["reel", "carrusel", "post"] }, hora: { type: "string" }, ideaA: { type: "string" }, ideaB: { type: "string" } }, required: ["n", "serie", "formato", "hora", "ideaA", "ideaB"] } },
    },
    required: ["series", "fechas"],
  },
};
const ESQUEMA_LAMINA = { type: "object", properties: { antetitulo: { type: "string" }, titulo: { type: "string" }, bajada: { type: "string" }, tachado: { type: "string" }, numero: { type: "string" }, items: { type: "array", items: { type: "object", properties: { t: { type: "string" }, d: { type: "string" } }, required: ["t"] } }, cierre: { type: "string" } }, required: ["titulo"] };
const ESQUEMA_OPCION = { type: "object", properties: { texto: { type: "string" }, visual: { type: "string" }, lamina: ESQUEMA_LAMINA }, required: ["texto", "lamina"] };
const HERRAMIENTA_PIEZAS = {
  nombre: "escribir_piezas",
  descripcion: "Cada pieza completa: las opciones A y B, sus historias y, en reels, YouTube.",
  esquema: {
    type: "object",
    properties: {
      piezas: { type: "array", items: { type: "object", properties: {
        n: { type: "integer" }, A: ESQUEMA_OPCION, B: ESQUEMA_OPCION,
        historias: { type: "array", items: { type: "object", properties: { texto: { type: "string" }, sticker: { type: "string", enum: ["encuesta", "pregunta", "quiz", "deslizador"] }, opciones: { type: "array", items: { type: "string" } } }, required: ["texto"] } },
        youtube: { type: "object", properties: { titulo: { type: "string" }, descripcion: { type: "string" } } },
      }, required: ["n", "A", "historias"] } },
    },
    required: ["piezas"],
  },
};
const corto = (x: unknown, n: number) => String(x ?? "").trim().slice(0, n);


/** Sin emojis: los planificadores nunca los usaron y en el arte se ven mal. */
const sinEmojis = (t: string) => t.replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim();
const limpio = (x: unknown, n: number) => sinEmojis(corto(x, n * 2)).slice(0, n);

/** Lo escrito en el arte, con los límites de cada campo. Sin título no hay arte. */
export function leerLamina(x: unknown): Lamina | undefined {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const titulo = limpio(r.titulo, 120);
  if (!titulo) return undefined;
  const l: Lamina = { titulo };
  for (const [k, n] of [["antetitulo", 60], ["bajada", 220], ["tachado", 60], ["numero", 16], ["cierre", 160]] as const) { const v = limpio(r[k], n); if (v) l[k] = v; }
  const items = (Array.isArray(r.items) ? r.items : []).map((i) => ({ t: limpio((i as { t?: unknown })?.t, 110), d: limpio((i as { d?: unknown })?.d, 260) || undefined })).filter((i) => i.t).slice(0, 7);
  if (items.length) l.items = items;
  return l;
}
function leerHistorias(x: unknown): Historia[] {
  return (Array.isArray(x) ? x : []).slice(0, 3).map((h) => {
    const r = (h ?? {}) as Record<string, unknown>;
    const sticker = (["encuesta", "pregunta", "quiz", "deslizador"] as const).find((v) => v === r.sticker);
    const opciones = Array.isArray(r.opciones) ? r.opciones.map((o) => limpio(o, 40)).filter(Boolean).slice(0, 4) : [];
    return { texto: limpio(r.texto, 300), ...(sticker ? { sticker } : {}), ...(opciones.length ? { opciones } : {}) };
  }).filter((h) => h.texto);
}


/** La revisión automática de una pieza contra las reglas de los planificadores (sistema/107). */
export function revisarPieza(p: Pick<Pieza, "texto" | "formato" | "plantilla" | "lamina" | "historias" | "youtube">, saber = "", reglas = ""): string[] {
  const avisos: string[] = [];
  const ultima = p.texto.trim().split("\n").filter(Boolean).pop() ?? "";
  if (!/\?\s*$/.test(ultima) && !/\b(guárda|guarda|mánda|manda|envía|envia|escríbe|escribe|comenta|comparte|compárte|agenda|visita|revisa|pregúnta|pregunta)/i.test(ultima)) avisos.push("El texto no termina con una pregunta ni con una acción.");
  if ((p.historias?.length ?? 0) < 2) avisos.push("Le faltan historias: van 2 o 3.");
  else if (!p.historias!.some((h) => h.sticker)) avisos.push("Ninguna historia lleva sticker.");
  const l = p.lamina;
  if (l) {
    if (l.titulo.length > 70 && p.plantilla !== "lista" && p.plantilla !== "pregunta") avisos.push("El título del arte es largo: en el arte se va a ver chico.");
    if ((p.plantilla === "lista" || p.plantilla === "pregunta") && (l.items?.length ?? 0) < 3) avisos.push("La lista tiene menos de 3 puntos.");
    if (p.plantilla === "tachado" && !l.tachado) avisos.push("Al tachado le falta la palabra que se tacha.");
    if (p.plantilla === "dato") {
      const cifra = (l.numero ?? "").replace(/[^0-9.,]/g, "");
      if (!cifra) avisos.push("Al dato le falta la cifra.");
      else if (!saber.replace(/\s/g, "").includes(cifra)) avisos.push(`La cifra «${l.numero}» no está en lo que sabemos del cliente: confírmala antes de publicar.`);
    }
  }
  if (p.formato === "reel" && !p.youtube) avisos.push("Al reel le falta su texto para YouTube Shorts.");
  if (/sin precios/i.test(reglas) && /(\$\s?\d|\busd\b|\bprecio)/i.test(`${p.texto} ${l?.titulo ?? ""} ${l?.bajada ?? ""}`)) avisos.push("Habla de precio y la marca no muestra precios.");
  return avisos;
}

interface Fila { n: number; fecha: string; serie: string; formato: FormatoPieza; plantilla: PlantillaArte; hora: string; ideaA: string; ideaB: string }
/** El calendario que devuelve Faro, limpio: series con plantilla válida y una fila por fecha. */
export function leerCalendarioIA(x: unknown, fechas: string[]) {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const series = (Array.isArray(r.series) ? r.series : []).slice(0, 6).map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return { nombre: limpio(o.nombre, 60), para: limpio(o.para, 200), plantilla: esPlantillaArte(o.plantilla) && o.plantilla !== "portada" ? o.plantilla : "frase" as PlantillaArte };
  }).filter((s) => s.nombre);
  const filas: Fila[] = [];
  const vistas = new Set<number>();
  for (const f of Array.isArray(r.fechas) ? r.fechas : []) {
    const o = (f ?? {}) as Record<string, unknown>;
    const n = Number(o.n);
    if (!Number.isInteger(n) || n < 1 || n > fechas.length || vistas.has(n)) continue;
    const ideaA = limpio(o.ideaA, 300);
    if (!ideaA) continue;
    vistas.add(n);
    const serie = series.find((s) => s.nombre === limpio(o.serie, 60)) ?? series[(n - 1) % Math.max(1, series.length)];
    let formato: FormatoPieza = (["reel", "carrusel", "post"] as const).find((v) => v === o.formato) ?? "post";
    let plantilla: PlantillaArte = formato === "reel" ? "portada" : serie?.plantilla ?? "frase";
    if (formato !== "reel" && !PLANTILLAS_ARTE[plantilla].formatos.includes(formato)) formato = PLANTILLAS_ARTE[plantilla].formatos[0]!;
    if (formato === "reel") plantilla = "portada";
    const hora = /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(o.hora ?? "").trim()) ? String(o.hora).trim().padStart(5, "0") : "18:00";
    filas.push({ n, fecha: fechas[n - 1]!, serie: serie?.nombre ?? "General", formato, plantilla, hora, ideaA, ideaB: limpio(o.ideaB, 300) });
  }
  filas.sort((a, b) => a.n - b.n);
  if (!series.length || filas.length < Math.ceil(fechas.length * 0.8)) throw new Error("Faro no devolvió el mes completo. Vuelve a pedirlo.");
  return { series, filas };
}

/** Lo que devuelve la IA, limpio, con límites y una pieza por fecha. Si faltan muchas, no sirve. */
export function leerMesIA(x: unknown, fechas: string[]) {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const series = (Array.isArray(r.series) ? r.series : []).slice(0, 6).map((s) => ({ nombre: corto((s as { nombre?: unknown })?.nombre, 60), para: corto((s as { para?: unknown })?.para, 200) })).filter((s) => s.nombre);
  const porN = new Map<number, Record<string, unknown>>();
  for (const p of Array.isArray(r.piezas) ? r.piezas : []) { const n = Number((p as { n?: unknown })?.n); if (Number.isInteger(n) && n >= 1 && n <= fechas.length && !porN.has(n)) porN.set(n, p as Record<string, unknown>); }
  const piezas: Omit<Pieza, "id">[] = [];
  fechas.forEach((fecha, i) => {
    const p = porN.get(i + 1);
    if (!p) return;
    const formato = (["reel", "carrusel", "post", "historia"] as const).find((f) => f === p.formato) ?? "post";
    const idea = corto(p.idea, 300), texto = corto(p.texto, 2200);
    if (idea && texto) piezas.push({ fecha, serie: corto(p.serie, 60) || series[0]?.nombre || "General", formato, idea, texto, visual: corto(p.visual, 600), estado: "propuesta" });
  });
  if (!series.length || piezas.length < Math.ceil(fechas.length * 0.8)) throw new Error("Faro no devolvió el mes completo. Vuelve a pedirlo.");
  return { series, piezas };
}

/** Faro arma el mes y queda guardado para revisar. Un mes por cliente: si ya existe, no se vuelve a gastar. */
export async function armarMes(o: { cliente: string; nombre: string; mes: string; saber: string; canales: string; frecuencia: string; pedido?: string; por: string; color?: string }): Promise<MesContenido> {
  if (!/^\d{4}-\d{2}$/.test(o.mes)) throw new Error("No entendí el mes.");
  const id = idMes(o.cliente, o.mes);
  if ((await leer()).meses[id]) throw new Error(`Ya hay un mes de contenido para ${o.nombre} en ${nombreMes(o.mes)}. Ábrelo desde Contenido.`);
  const fechas = fechasDelMes(o.mes, o.frecuencia);
  const estilo = estiloPara(o.cliente, o.nombre, o.color);
  const contexto = [
    `## Cliente\n${o.nombre}`,
    `## Lo que sabemos del cliente (úsalo tal cual; no inventes nada más de su negocio)\n${o.saber.slice(0, 4000)}`,
    `## Reglas de marca\n${estilo.reglas}`,
    o.pedido?.trim() ? `## Lo que pidieron para este mes\n${o.pedido.trim().slice(0, 800)}` : "",
    `## Dónde publica\n${o.canales}`,
  ].filter(Boolean).join("\n\n");
  // 1 · El calendario.
  let crudo: unknown;
  try {
    crudo = await pedirEstructura(SISTEMA_MES, `${contexto}\n\n## Fechas (${fechas.length}, ${nombreMes(o.mes)})\n${fechas.map((f, i) => `${i + 1}. ${f} (${DIA[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7]})`).join("\n")}`, HERRAMIENTA_CALENDARIO, 5000, { origen: "faro", tarea: "contenido" });
  } catch (e) {
    throw new Error(`Faro no pudo armar el mes: ${(e as Error).message}`);
  }
  if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Faro no puede armar el mes.");
  const { series, filas } = leerCalendarioIA(crudo, fechas);
  // 2 · Las piezas, en tandas de 4 en paralelo (una sola llamada tardaría más de lo que deja Vercel). Si una tanda falla, se intenta una vez más.
  const tandas: Fila[][] = [];
  for (let i = 0; i < filas.length; i += 4) tandas.push(filas.slice(i, i + 4));
  const escribir = (t: Fila[]) => pedirEstructura(SISTEMA_PIEZAS, `${contexto}\n\n## Series\n${series.map((s) => `- ${s.nombre} (plantilla «${s.plantilla}»): ${s.para}`).join("\n")}\n\n## Piezas para escribir\n${t.map((f) => `${f.n}. ${f.fecha} ${f.hora} · serie «${f.serie}» · ${f.formato} · plantilla «${f.plantilla}»\n   A: ${f.ideaA}\n   B: ${f.ideaB || "(otra idea de la misma serie)"}`).join("\n")}`, HERRAMIENTA_PIEZAS, 7000, { origen: "faro", tarea: "contenido" });
  const porN = new Map<number, Record<string, unknown>>();
  await Promise.all(tandas.map(async (t) => {
    let r: unknown;
    try { r = await escribir(t); } catch { try { r = await escribir(t); } catch { return; } }
    for (const p of ((r as { piezas?: unknown[] })?.piezas ?? [])) { const n = Number((p as { n?: unknown })?.n); if (t.some((f) => f.n === n)) porN.set(n, p as Record<string, unknown>); }
  }));
  const piezas: Pieza[] = [];
  for (const f of filas) {
    const p = porN.get(f.n);
    const A = (p?.A ?? {}) as Record<string, unknown>, B = (p?.B ?? {}) as Record<string, unknown>;
    const texto = limpio(A.texto, 2200), lamina = leerLamina(A.lamina);
    if (!texto || !lamina) continue;
    const textoB = limpio(B.texto, 2200), laminaB = leerLamina(B.lamina);
    const yt = (p?.youtube ?? {}) as Record<string, unknown>;
    piezas.push({
      id: `p${String(piezas.length + 1).padStart(2, "0")}`, fecha: f.fecha, hora: f.hora, serie: f.serie, formato: f.formato, plantilla: f.plantilla,
      idea: f.ideaA, texto, visual: limpio(A.visual, 600) || "Solo el arte", lamina,
      ...(textoB && laminaB && f.ideaB ? { b: { idea: f.ideaB, texto: textoB, visual: limpio(B.visual, 600) || "Solo el arte", lamina: laminaB } } : {}),
      historias: leerHistorias(p?.historias),
      ...(f.formato === "reel" && limpio(yt.titulo, 100) ? { youtube: { titulo: limpio(yt.titulo, 100), descripcion: limpio(yt.descripcion, 600) } } : {}),
      estado: "propuesta",
    });
    const ultima = piezas[piezas.length - 1]!;
    const avisos = revisarPieza(ultima, o.saber, estilo.reglas);
    if (avisos.length) ultima.avisos = avisos;
  }
  if (piezas.length < Math.ceil(fechas.length * 0.8)) throw new Error("Faro no terminó de escribir el mes (faltaron piezas). Vuelve a pedirlo: no se guardó nada.");
  const ahora = new Date().toISOString();
  const mes: MesContenido = {
    id, cliente: o.cliente, nombre: o.nombre, mes: o.mes, canales: o.canales, frecuencia: o.frecuencia, pedido: o.pedido?.trim() || undefined, series, piezas, estilo: estilo.id,
    historia: [
      { cuando: ahora, quien: o.por, que: `Pidió el mes de ${nombreMes(o.mes)}` },
      { cuando: ahora, quien: "faro", que: `Armó ${piezas.length} piezas en ${series.length} series, cada una con opción A y B, texto, arte e historias${piezas.length < fechas.length ? ` (faltaron ${fechas.length - piezas.length})` : ""}` },
    ],
    creado: ahora, actualizado: ahora,
  };
  // Se vuelve a leer justo antes de guardar: si otro lo armó mientras tanto, gana el primero.
  const l = await leer();
  if (l.meses[id]) throw new Error(`Ya hay un mes de contenido para ${o.nombre} en ${nombreMes(o.mes)}.`);
  l.meses[id] = mes;
  await guardar(l);
  return mes;
}

export interface CambioPieza { estado?: EstadoPieza; idea?: string; texto?: string; visual?: string; nota?: string | null; guion?: string; formato?: FormatoPieza;
  /** Cambiar a la opción B: la B pasa a ser la elegida y la A queda como alternativa. */
  elegirB?: boolean;
  /** Los archivos del arte dibujado (de la opción elegida). */
  artes?: string[];
  /** Corregir a mano lo que va escrito en el arte: el título. */
  tituloArte?: string }

/** Aprobar, pedir un cambio o corregir una pieza. Lee lo último antes de guardar, para que Jay y Luna no se pisen. */
export async function cambiarPieza(mesId: string, piezaId: string, c: CambioPieza, por: string): Promise<MesContenido> {
  const l = await leer();
  const m = l.meses[mesId];
  if (!m) throw new Error("No encontramos ese mes de contenido.");
  const p = m.piezas.find((x) => x.id === piezaId);
  if (!p) throw new Error("No encontramos esa pieza.");
  const que: string[] = [];
  for (const k of ["idea", "texto", "visual"] as const) {
    if (c[k] === undefined) continue;
    const v = corto(c[k], k === "texto" ? 2200 : 600);
    if (!v) throw new Error("No puede quedar vacía: escribe algo o deja lo que estaba.");
    if (v !== p[k]) { p[k] = v; que.push(k); }
  }
  if (c.formato && c.formato !== p.formato && FORMATOS[c.formato]) { p.formato = c.formato; que.push("formato"); }
  if (c.elegirB) {
    if (!p.b) throw new Error("Esta pieza no tiene opción B.");
    const a: OpcionPieza = { idea: p.idea, texto: p.texto, visual: p.visual, lamina: p.lamina, artes: p.artes };
    p.idea = p.b.idea; p.texto = p.b.texto; p.visual = p.b.visual; p.lamina = p.b.lamina; p.artes = p.b.artes;
    p.b = a;
    if (p.estado === "aprobada") p.estado = "propuesta";
    que.push("eligió la otra opción");
  }
  if (c.artes) { p.artes = c.artes.slice(0, 20); que.push("arte dibujado"); }
  if (c.tituloArte !== undefined && p.lamina) {
    const v = corto(c.tituloArte, 120);
    if (!v) throw new Error("No puede quedar vacía: escribe algo o deja lo que estaba.");
    if (v !== p.lamina.titulo) { p.lamina.titulo = v; que.push("título del arte"); if (p.artes?.length) delete p.artes; }
  }
  if (c.guion) { p.guion = c.guion; que.push("guion"); }
  if (c.estado && c.estado !== p.estado) {
    if (c.estado === "cambio" && !corto(c.nota, 400)) throw new Error("Cuenta qué hay que cambiar.");
    p.estado = c.estado;
    que.push(ESTADOS_PIEZA[c.estado].toLowerCase());
  }
  if (c.nota !== undefined) p.nota = corto(c.nota, 400) || undefined;
  if (c.estado === "aprobada") delete p.nota;
  // Si se corrige a mano una pieza con cambio pedido, vuelve a quedar por revisar.
  if (!c.estado && p.estado === "cambio" && que.some((x) => ["idea", "texto", "visual", "título del arte"].includes(x))) p.estado = "propuesta";
  if (que.some((x) => ["texto", "título del arte", "eligió la otra opción"].includes(x))) { const a = revisarPieza(p, "", "").filter((x) => !x.startsWith("La cifra")); if (a.length) p.avisos = a; else delete p.avisos; }
  if (que.length) m.historia.push({ cuando: new Date().toISOString(), quien: por, que: `${p.fecha}: ${que.join(", ")}` });
  m.actualizado = new Date().toISOString();
  await guardar(l);
  return m;
}

/** Cuántas piezas hay en cada estado. */
export function resumenMes(m: Pick<MesContenido, "piezas">) {
  const r = { total: m.piezas.length, aprobadas: 0, cambios: 0, porRevisar: 0 };
  for (const p of m.piezas) { if (p.estado === "aprobada") r.aprobadas++; else if (p.estado === "cambio") r.cambios++; else r.porRevisar++; }
  return r;
}

/** El mes en texto, para mandárselo al cliente por WhatsApp o correo. Solo las piezas aprobadas. */
export function textoMesParaCliente(m: MesContenido) {
  const fecha = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return `${DIA[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()}`; };
  const aprobadas = m.piezas.filter((p) => p.estado === "aprobada");
  return [
    `Contenido de ${m.nombre} · ${nombreMes(m.mes)}`,
    `Series: ${m.series.map((s) => s.nombre).join(", ")}`,
    "",
    ...aprobadas.map((p) => `${fecha(p.fecha)} · ${FORMATOS[p.formato]} · ${p.serie}\n${p.idea}\n«${p.texto}»`),
  ].join("\n\n").replace(/\n\n\n+/g, "\n\n");
}
