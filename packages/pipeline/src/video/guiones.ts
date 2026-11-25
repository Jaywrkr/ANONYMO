// Guiones de video (sistema/71): antes de grabar, Faro escribe el guion; Luna o Jay lo aprueban; Corte edita con él.
// Cada paso queda firmado en la historia del guion. Vive en `_guiones/lista/guiones.json` (nube privada o proyectos/).
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { pedirEstructura } from "../ia.ts";
import { slug } from "../solicitudes.ts";

export type EstadoGuion = "borrador" | "aprobado" | "grabado";

export interface PasoGuion { cuando: string; quien: string; que: string }

export interface Guion {
  id: string;
  /** Lo que pidió Luna o Jay, en sus palabras. */
  pedido: string;
  cliente?: string;
  /** Duración buscada en segundos (15, 30, 60, 90). */
  segundos: number;
  titulo: string;
  /** Los primeros 3 segundos: lo que detiene el scroll. */
  gancho: string;
  /** Lo que se dice o se muestra, en orden. */
  partes: { texto: string; toma: string }[];
  cierre: string;
  /** Lo que hay que grabar, como lista de rodaje para Luna. */
  tomas: string[];
  estado: EstadoGuion;
  /** El video que se grabó con este guion. */
  video?: string;
  /** De qué guion es otra versión (sistema/109). */
  de?: string;
  historia: PasoGuion[];
  creado: string;
  actualizado: string;
}

interface ListaGuiones { actualizado: string; guiones: Record<string, Guion> }

const REL = "_guiones/lista/guiones.json";
const local = () => join(carpeta(), REL);
export const idGuionValido = (id: string) => /^g-[a-z0-9][a-z0-9-]{2,70}$/.test(id);
export const DURACIONES_GUION = [15, 30, 60, 90] as const;

async function leer(): Promise<ListaGuiones> {
  let texto: string | undefined;
  if (nubeActiva()) { const b = await leerSuelto(REL); texto = b ? Buffer.from(b).toString("utf8") : undefined; }
  else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  const l = texto ? (JSON.parse(texto) as ListaGuiones) : undefined;
  return { actualizado: l?.actualizado ?? "", guiones: l?.guiones ?? {} };
}

async function guardar(l: ListaGuiones) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), "_guiones", "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

export async function listarGuiones(): Promise<Guion[]> {
  return Object.values((await leer()).guiones).sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

export async function leerGuion(id: string) {
  return idGuionValido(id) ? (await leer()).guiones[id] : undefined;
}

/** Lee lo último, cambia y guarda: así Jay y Luna no se pisan. */
export async function cambiarGuion(id: string, fn: (g: Guion) => void) {
  const l = await leer();
  const g = l.guiones[id];
  if (!g) throw new Error("No encontramos ese guion.");
  fn(g);
  g.actualizado = new Date().toISOString();
  await guardar(l);
  return g;
}

/** Cuántas palabras caben (sistema/109): unas 2,3 por segundo dichas con calma. 30 s ≈ 70 palabras. */
export const palabrasPara = (segundos: number) => Math.round(segundos * 2.3);
export const GANCHO_MAX = 10;

export const SISTEMA_FARO = `Faro, contenido de Unmake: estratégico, piensa en series y sabe qué publicar el próximo martes.
Escribes el guion de un video corto ANTES de grabarlo, para que Luna lo grabe y Corte lo edite. Respondes siempre con la herramienta «escribir_guion».

Reglas (se revisan solas; si no se cumplen, el guion vuelve):
- Largo: lo que se dice (gancho + partes + cierre) NO pasa las palabras que te doy para la duración. Mejor corto que apurado.
- Gancho: máximo ${GANCHO_MAX} palabras. Una frase o una imagen que detiene el scroll. Nada de «hola, hoy les voy a hablar de».
- Nada inventado: ni clientes, ni casos, ni cifras, ni testimonios, ni trabajos que no estén en «Lo que sabemos». Tampoco en las tomas.
  Si hace falta mostrar un trabajo, la toma dice «un trabajo real de Unmake (elegir uno)» o usa los del cliente que estén en lo que sabemos.
- Un solo llamado a la acción, en el cierre (escribir, visitar o guardar; uno). Las partes no venden.
- Cada parte es una sola idea, en frases que se dicen en voz alta sin trabarse, y dice qué toma se graba (plano, lugar, qué se ve).
  Las tomas se graban con un celular en un día.
- Español de Ecuador, directo, sin palabras rebuscadas ni frases de motivación vacías.
- Si el pedido no alcanza para escribirlo, escribe la mejor versión y dilo en «titulo».`;

const contar = (t: string) => t.split(/\s+/).filter(Boolean).length;
const LLAMADOS = /\b(escr[ií]be(nos|me)?|visita(nos)?|gu[aá]rda(lo)?|s[ií]gue(nos)?|ll[aá]ma(nos)?|agenda|reserva|link en (la )?bio|comenta|comp[aá]rte(lo)?|toca el enlace|m[aá]ndanos)\b/gi;

/** Lo que no cumple el guion (sistema/109). Vacío: está bien. */
export function revisarGuion(g: { gancho: string; partes: { texto: string; toma: string }[]; cierre: string }, segundos: number): string[] {
  const p: string[] = [];
  const dichas = contar([g.gancho, ...g.partes.map((x) => x.texto), g.cierre].join(" "));
  const tope = palabrasPara(segundos);
  if (dichas > Math.round(tope * 1.1)) p.push(`Tiene ${dichas} palabras y en ${segundos} s caben unas ${tope}. Recórtalo.`);
  const gancho = contar(g.gancho);
  if (gancho > GANCHO_MAX) p.push(`El gancho tiene ${gancho} palabras: déjalo en ${GANCHO_MAX} o menos.`);
  const enPartes = g.partes.filter((x) => (x.texto.match(LLAMADOS) ?? []).length > 0).length;
  if (enPartes > 0) p.push("Hay llamados a la acción en las partes: deja uno solo, en el cierre.");
  if ((g.cierre.match(LLAMADOS) ?? []).length > 2) p.push("El cierre pide varias cosas: deja un solo llamado.");
  return p;
}

const HERRAMIENTA = {
  nombre: "escribir_guion",
  descripcion: "El guion del video, listo para grabar.",
  esquema: {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Nombre corto del video" },
      gancho: { type: "string" },
      partes: { type: "array", items: { type: "object", properties: { texto: { type: "string" }, toma: { type: "string" } }, required: ["texto", "toma"] } },
      cierre: { type: "string" },
      tomas: { type: "array", items: { type: "string" }, description: "Lista de rodaje: lo que hay que grabar" },
    },
    required: ["titulo", "gancho", "partes", "cierre", "tomas"],
  },
};

const corto = (x: unknown, n: number) => String(x ?? "").trim().slice(0, n);

/** Lo que devuelve la IA, limpio y con límites. */
export function leerGuionIA(x: unknown) {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const partes = (Array.isArray(r.partes) ? r.partes : []).slice(0, 12).map((p) => ({ texto: corto((p as { texto?: unknown })?.texto, 600), toma: corto((p as { toma?: unknown })?.toma, 300) })).filter((p) => p.texto);
  const tomas = (Array.isArray(r.tomas) ? r.tomas : []).map((t) => corto(t, 200)).filter(Boolean).slice(0, 20);
  const g = { titulo: corto(r.titulo, 120), gancho: corto(r.gancho, 400), partes, cierre: corto(r.cierre, 400), tomas };
  if (!g.gancho || !g.partes.length) throw new Error("Faro no devolvió un guion completo. Vuelve a pedirlo con un poco más de contexto.");
  return g;
}

/** Faro escribe el guion y queda guardado como borrador. */
/** `saber`: lo que se sabe del cliente, ya en texto (sistema/92). Con eso el guion suena a ese negocio y no a cualquiera. */
export async function escribirGuion(pedido: string, opciones: { cliente?: string; segundos?: number; por: string; saber?: string; /** Gancho de la versión anterior, para pedir otra distinta. */ distinto?: string; de?: string }): Promise<Guion> {
  const limpio = pedido.trim().slice(0, 2000);
  if (limpio.length < 10) throw new Error("Cuéntale a Faro de qué es el video: al menos una frase.");
  const segundos = (DURACIONES_GUION as readonly number[]).includes(Number(opciones.segundos)) ? Number(opciones.segundos) : 30;
  const cliente = opciones.cliente?.trim().slice(0, 80) || undefined;
  const texto = [`## Pedido\n${limpio}`, opciones.distinto ? `## Otra versión\nYa hay una versión con este gancho: «${opciones.distinto}». Escribe otra con un ángulo y un gancho distintos.` : "", cliente ? `## Cliente\n${cliente}` : "", opciones.saber?.trim() ? `## Lo que sabemos del cliente (úsalo tal cual; no inventes nada más de su negocio)\n${opciones.saber.trim().slice(0, 3000)}` : "", `## Duración\n${segundos} segundos: máximo ${palabrasPara(segundos)} palabras dichas, contando gancho y cierre.`].filter(Boolean).join("\n\n");
  const pedir = async (t: string) => {
    let crudo: unknown;
    try {
      crudo = await pedirEstructura(SISTEMA_FARO, t, HERRAMIENTA, 2500, { origen: "faro", tarea: "guion" });
    } catch (e) {
      throw new Error(`Faro no pudo escribir el guion: ${(e as Error).message}`);
    }
    if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Faro no puede escribir guiones.");
    return leerGuionIA(crudo);
  };
  let g = await pedir(texto);
  // Se revisa solo (sistema/109): si se pasa de largo, el gancho es largo o pide varias cosas, vuelve una vez con lo que falló.
  const problemas = revisarGuion(g, segundos);
  if (problemas.length) g = await pedir(`${texto}\n\n## Tu versión anterior no cumplió\n${problemas.map((x) => `- ${x}`).join("\n")}\nEscríbelo de nuevo cumpliendo todo.`).catch(() => g);
  const ahora = new Date().toISOString();
  const id = `g-${slug(g.titulo || limpio).slice(0, 40) || "guion"}-${randomBytes(2).toString("hex")}`;
  const guion: Guion = {
    id, pedido: limpio, cliente, segundos, ...g, ...(opciones.de ? { de: opciones.de } : {}), estado: "borrador", creado: ahora, actualizado: ahora,
    historia: [
      { cuando: ahora, quien: opciones.por, que: opciones.de ? "Pidió otra versión" : "Pidió el video" },
      { cuando: ahora, quien: "atlas", que: "Se lo pasó a Faro" },
      { cuando: ahora, quien: "faro", que: "Escribió el guion" },
    ],
  };
  const l = await leer();
  l.guiones[id] = guion;
  await guardar(l);
  return guion;
}

/** Aprobar el guion: queda listo para grabar. */
export const aprobarGuion = (id: string, por: string) =>
  cambiarGuion(id, (g) => {
    if (g.estado !== "borrador") return;
    g.estado = "aprobado";
    g.historia.push({ cuando: new Date().toISOString(), quien: por, que: "Aprobó el guion" });
  });

/** El video grabado con este guion: Corte lo edita sabiendo lo que se quería decir. */
export const unirGuionAVideo = (id: string, video: string, por: string) =>
  cambiarGuion(id, (g) => {
    g.estado = "grabado";
    g.video = video;
    g.historia.push({ cuando: new Date().toISOString(), quien: por, que: "Subió lo grabado" });
  });

/** Lo que Corte lee del guion para editar. */
export function guionParaCorte(g: Pick<Guion, "gancho" | "partes" | "cierre" | "segundos">) {
  return [`Duración buscada: ${g.segundos} s`, `Gancho: ${g.gancho}`, ...g.partes.map((p, i) => `${i + 1}. ${p.texto}`), `Cierre: ${g.cierre}`].join("\n");
}
