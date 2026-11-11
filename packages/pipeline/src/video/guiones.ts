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

export const SISTEMA_FARO = `Faro, contenido de ANONYMO: estratégico, piensa en series y sabe qué publicar el próximo martes.
Escribes el guion de un video corto ANTES de grabarlo, para que Luna lo grabe y Corte lo edite. Respondes siempre con la herramienta «escribir_guion».

Cómo es un buen guion:
- El gancho son los primeros 3 segundos: una frase o una imagen que detiene el scroll. Nada de «hola, hoy les voy a hablar de».
- Cada parte es una sola idea, en frases que se dicen en voz alta sin trabarse. Lo que se dice cabe en la duración pedida (unas 2,5 palabras por segundo).
- Cada parte dice qué toma se graba (plano, lugar, qué se ve). Las tomas se pueden grabar con un celular en un día.
- El cierre dice qué hacer después (escribir, visitar, guardar), sin sonar a anuncio.
- Español de Ecuador, directo, sin palabras rebuscadas ni frases de motivación vacías.
- Si el pedido no alcanza para escribirlo, escribe la mejor versión y dilo en «titulo».`;

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
export async function escribirGuion(pedido: string, opciones: { cliente?: string; segundos?: number; por: string }): Promise<Guion> {
  const limpio = pedido.trim().slice(0, 2000);
  if (limpio.length < 10) throw new Error("Cuéntale a Faro de qué es el video: al menos una frase.");
  const segundos = (DURACIONES_GUION as readonly number[]).includes(Number(opciones.segundos)) ? Number(opciones.segundos) : 30;
  const cliente = opciones.cliente?.trim().slice(0, 80) || undefined;
  const texto = [`## Pedido\n${limpio}`, cliente ? `## Cliente\n${cliente}` : "", `## Duración\n${segundos} segundos (unas ${Math.round(segundos * 2.5)} palabras en total)`].filter(Boolean).join("\n\n");
  let crudo: unknown;
  try {
    crudo = await pedirEstructura(SISTEMA_FARO, texto, HERRAMIENTA, 2500);
  } catch (e) {
    throw new Error(`Faro no pudo escribir el guion: ${(e as Error).message}`);
  }
  if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Faro no puede escribir guiones.");
  const g = leerGuionIA(crudo);
  const ahora = new Date().toISOString();
  const id = `g-${slug(g.titulo || limpio).slice(0, 40) || "guion"}-${randomBytes(2).toString("hex")}`;
  const guion: Guion = {
    id, pedido: limpio, cliente, segundos, ...g, estado: "borrador", creado: ahora, actualizado: ahora,
    historia: [
      { cuando: ahora, quien: opciones.por, que: "Pidió el video" },
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
