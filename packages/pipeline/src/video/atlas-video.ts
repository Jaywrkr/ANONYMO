// Atlas en el departamento de video (sistema/63): Luna escribe lo que quiere y Atlas lo convierte en acciones
// sobre el JSON de edición. La IA solo elige las acciones; aplicarlas es cálculo puro (`aplicarAcciones`),
// así lo que se ve en la vista previa es exactamente lo que se pidió y se puede deshacer.
import { pedirEstructura } from "../ia.ts";
import { edicionSegura, motivoPalabra, planEdicion } from "./edicion.ts";
import { PLANTILLAS_SUB } from "./subtitulos.ts";
import { FORMATOS_VIDEO, type Edicion, type FormatoVideo, type IdPlantilla, type MensajeVideo, type Transcripcion, type TrabajoVideo } from "./tipos.ts";

/** Una acción que Atlas puede pedir. Campos planos: el modelo llena solo los que usa. */
export interface AccionVideo {
  tipo: "silencios" | "muletillas" | "quitar" | "devolver" | "subtitulos" | "audio" | "armar";
  activo?: boolean;
  pausaMax?: number;
  /** Para quitar/devolver: por palabras (índices, inclusive) o por segundos del original. */
  unidad?: "palabra" | "segundo";
  desde?: number;
  hasta?: number;
  plantilla?: IdPlantilla;
  acento?: string;
  tamano?: number;
  posicion?: "abajo" | "centro" | "arriba";
  normalizar?: boolean;
  limpiarRuido?: boolean;
  formatos?: FormatoVideo[];
}

export interface RespuestaAtlasVideo {
  /** Lo que Atlas le dice a Luna, corto y en palabras simples. */
  respuesta: string;
  acciones: AccionVideo[];
  /** Lo pedido que todavía no se puede hacer (zoom, logo, música…): se dice, no se inventa. */
  noSePuede: string[];
}

export interface ResultadoAtlas {
  respuesta: string;
  edicion: Edicion;
  /** Qué cambió, una línea por cambio («Subtítulos: Marca»). */
  cambios: string[];
  armar: FormatoVideo[];
  noSePuede: string[];
}

const NOMBRE_PLANTILLA = Object.fromEntries(PLANTILLAS_SUB.map((p) => [p.id, p.nombre])) as Record<IdPlantilla, string>;
const LUGAR = { abajo: "abajo", centro: "al centro", arriba: "arriba" } as const;
const seg = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("es")} s`;

/** Las palabras que tocan un tramo de segundos (por su punto medio). */
function palabrasEnTiempo(tr: Transcripcion, desde: number, hasta: number) {
  const out: number[] = [];
  tr.palabras.forEach((p, i) => { const m = (p.inicio + p.fin) / 2; if (m >= desde && m <= hasta) out.push(i); });
  return out;
}

/** Aplica las acciones a la edición, sin IA. Lo que no tiene sentido se ignora y no se cuenta como cambio. */
export function aplicarAcciones(base: Edicion, acciones: AccionVideo[], tr: Transcripcion | undefined): { edicion: Edicion; cambios: string[]; armar: FormatoVideo[] } {
  let e: Edicion = structuredClone(base);
  const cambios: string[] = [];
  const armar = new Set<FormatoVideo>();
  const n = tr?.palabras.length ?? 0;
  for (const a of acciones.slice(0, 30)) {
    if (!a || typeof a !== "object") continue;
    if (a.tipo === "silencios") {
      const activo = a.activo ?? true;
      e.silencios = activo;
      if (typeof a.pausaMax === "number") e.pausaMax = a.pausaMax;
      e = edicionSegura(e, e);
      cambios.push(activo ? `Quitar pausas de más de ${seg(e.pausaMax)}` : "Dejar las pausas");
    } else if (a.tipo === "muletillas") {
      e.muletillas = a.activo ?? true;
      cambios.push(e.muletillas ? "Quitar muletillas" : "Dejar las muletillas");
    } else if ((a.tipo === "quitar" || a.tipo === "devolver") && tr && n && typeof a.desde === "number" && typeof a.hasta === "number") {
      const [x, y] = [Math.min(a.desde, a.hasta), Math.max(a.desde, a.hasta)];
      const indices = a.unidad === "segundo" ? palabrasEnTiempo(tr, x, y) : Array.from({ length: Math.max(0, Math.min(n - 1, Math.floor(y)) - Math.max(0, Math.ceil(x)) + 1) }, (_, k) => Math.max(0, Math.ceil(x)) + k);
      if (!indices.length) continue;
      const q = new Set(e.quitadas);
      for (const i of indices) a.tipo === "quitar" ? q.add(i) : q.delete(i);
      e.quitadas = [...q].sort((m, k) => m - k);
      const muestra = indices.slice(0, 6).map((i) => tr.palabras[i].texto).join(" ") + (indices.length > 6 ? "…" : "");
      cambios.push(`${a.tipo === "quitar" ? "Quitar" : "Devolver"} «${muestra}» (${indices.length} ${indices.length === 1 ? "palabra" : "palabras"})`);
    } else if (a.tipo === "subtitulos") {
      const antes = e.subtitulos;
      e = edicionSegura({ ...e, subtitulos: { ...antes, ...(a.activo !== undefined ? { activos: a.activo } : {}), ...(a.plantilla ? { plantilla: a.plantilla } : {}), ...(a.acento ? { acento: a.acento } : {}), ...(typeof a.tamano === "number" ? { tamano: a.tamano } : {}), ...(a.posicion ? { posicion: a.posicion } : {}) } }, e);
      const s = e.subtitulos, l: string[] = [];
      if (s.activos !== antes.activos) l.push(s.activos ? "con subtítulos" : "sin subtítulos");
      if (s.plantilla !== antes.plantilla) l.push(`plantilla ${NOMBRE_PLANTILLA[s.plantilla]}`);
      if (s.acento !== antes.acento) l.push(`color ${s.acento}`);
      if (s.tamano !== antes.tamano) l.push(s.tamano > antes.tamano ? "letra más grande" : "letra más chica");
      if (s.posicion !== antes.posicion) l.push(LUGAR[s.posicion]);
      if (l.length) cambios.push(`Subtítulos: ${l.join(", ")}`);
    } else if (a.tipo === "audio") {
      const antes = e.audio;
      e = edicionSegura({ ...e, audio: { ...antes, ...(a.normalizar !== undefined ? { normalizar: a.normalizar } : {}), ...(a.limpiarRuido !== undefined ? { limpiarRuido: a.limpiarRuido } : {}) } }, e);
      if (e.audio.normalizar !== antes.normalizar) cambios.push(e.audio.normalizar ? "Volumen parejo" : "Volumen como viene");
      if (e.audio.limpiarRuido !== antes.limpiarRuido) cambios.push(e.audio.limpiarRuido ? "Limpiar ruido de fondo" : "Sin limpiar ruido");
    } else if (a.tipo === "armar") {
      for (const f of a.formatos ?? []) if (FORMATOS_VIDEO.includes(f)) armar.add(f);
    }
  }
  return { edicion: edicionSegura(e, base), cambios, armar: [...armar] };
}

export const SISTEMA_ATLAS_VIDEO = `Atlas, departamento de video de ANONYMO.
Luna (o Jay) te escribe lo que quiere de un video filmado y tú lo conviertes en acciones de edición. Respondes siempre con la herramienta «editar_video».

Lo que se puede hacer hoy (acciones):
- silencios: activo true/false; pausaMax en segundos (0,3 = ritmo muy rápido, 0,6 = ritmo de redes, 1,2 = pausado). «Corta los silencios» = activo true; «más dinámico» = bajar pausaMax.
- muletillas: activo true/false (quita «eh», «mmm»).
- quitar / devolver: un tramo del texto. unidad "palabra" con desde/hasta = índices de palabra (inclusive, los ves entre corchetes), o unidad "segundo" con tiempos del video original. «Quita la parte del inicio» = las palabras del arranque que no aportan (saludos, titubeos) hasta donde empieza la idea; elige el corte en un final de frase.
- subtitulos: activo, plantilla ("marca" = pocas palabras grandes con la palabra dicha en color, para reels y anuncios; "limpio" = frase completa discreta, para entrevistas; "caja" = texto sobre fondo oscuro), acento (#rrggbb), tamano (0,6 a 1,6; 1 es normal: «más grande» = actual × 1,25), posicion ("abajo", "centro", "arriba").
- audio: normalizar (volumen parejo al nivel de redes), limpiarRuido (aire, ventilador).
- armar: formatos ["9:16","1:1","16:9"] cuando pide el video final, exportar o descargar.

Lo que todavía NO se puede (va en noSePuede, en palabras simples, y no inventes acciones para eso): zoom o acercamientos, logo, textos animados aparte de los subtítulos, transiciones, música de fondo, cambiar el orden de escenas, efectos de color, cortar por imagen (solo se corta por lo que se dice).

Reglas:
- Solo pide lo que Luna pidió. No cambies nada más «por las dudas».
- Los cambios son sobre la edición actual: si dice «más», parte del valor actual.
- respuesta: una o dos frases, en español simple, sin jerga, diciendo qué hiciste. Si algo no se puede, dilo con amabilidad y qué haría falta.
- Si el pedido no es sobre este video o no se entiende, no hagas acciones y pregunta en la respuesta.`;

const HERRAMIENTA = {
  nombre: "editar_video",
  descripcion: "Las acciones de edición que pide Luna para este video y la respuesta para ella.",
  esquema: {
    type: "object",
    additionalProperties: false,
    required: ["respuesta", "acciones", "noSePuede"],
    properties: {
      respuesta: { type: "string", description: "Lo que le dices a Luna: una o dos frases simples." },
      acciones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tipo"],
          properties: {
            tipo: { type: "string", enum: ["silencios", "muletillas", "quitar", "devolver", "subtitulos", "audio", "armar"] },
            activo: { type: "boolean" },
            pausaMax: { type: "number" },
            unidad: { type: "string", enum: ["palabra", "segundo"] },
            desde: { type: "number" },
            hasta: { type: "number" },
            plantilla: { type: "string", enum: ["marca", "limpio", "caja"] },
            acento: { type: "string", description: "#rrggbb" },
            tamano: { type: "number" },
            posicion: { type: "string", enum: ["abajo", "centro", "arriba"] },
            normalizar: { type: "boolean" },
            limpiarRuido: { type: "boolean" },
            formatos: { type: "array", items: { type: "string", enum: FORMATOS_VIDEO } },
          },
        },
      },
      noSePuede: { type: "array", items: { type: "string" } },
    },
  },
};

/** Lo que Atlas lee: el pedido, la edición actual, el texto numerado y la conversación reciente. */
export function mensajeAtlasVideo(pedido: string, t: Pick<TrabajoVideo, "nombre" | "cliente" | "duracion" | "transcripcion" | "edicion"> & { conversacion?: MensajeVideo[] }) {
  const tr = t.transcripcion;
  const plan = planEdicion(tr, t.edicion, t.duracion ?? 0);
  const texto = tr ? tr.palabras.map((p, i) => `[${i}]${motivoPalabra(i, p, t.edicion) ? "~" : ""}${p.texto}@${p.inicio.toFixed(1)}`).join(" ") : "(sin transcripción)";
  const previos = (t.conversacion ?? []).slice(-8).map((m) => `${m.quien === "atlas" ? "Atlas" : "Luna"}: ${m.texto}`).join("\n");
  return [
    `# Video: ${t.nombre}${t.cliente ? ` (${t.cliente})` : ""}`,
    `Dura ${seg(t.duracion ?? 0)}; con la edición actual queda en ${seg(plan.duracion)}.`,
    `## Edición actual\n${JSON.stringify(t.edicion)}`,
    `## Texto (índice, palabra y segundo de inicio; «~» = ya quitada)\n${texto}`,
    previos ? `## Conversación reciente\n${previos}` : "",
    `## Pedido\n${pedido}`,
  ].filter(Boolean).join("\n\n");
}

/** Lee la respuesta del modelo sin confiar en ella: lo que no encaja se descarta. */
export function leerRespuestaAtlas(x: unknown): RespuestaAtlasVideo {
  const r = (x && typeof x === "object" ? x : {}) as Partial<RespuestaAtlasVideo>;
  return {
    respuesta: typeof r.respuesta === "string" && r.respuesta.trim() ? r.respuesta.trim().slice(0, 600) : "Listo.",
    acciones: Array.isArray(r.acciones) ? r.acciones.filter((a): a is AccionVideo => !!a && typeof a === "object" && typeof (a as AccionVideo).tipo === "string") : [],
    noSePuede: Array.isArray(r.noSePuede) ? r.noSePuede.filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim().slice(0, 200)).slice(0, 6) : [],
  };
}

/** Atlas interpreta el pedido y devuelve la edición nueva (sin guardarla). */
export async function interpretarPedidoVideo(pedido: string, t: Pick<TrabajoVideo, "nombre" | "cliente" | "duracion" | "transcripcion" | "edicion"> & { conversacion?: MensajeVideo[] }): Promise<ResultadoAtlas> {
  const limpio = pedido.trim().slice(0, 2000);
  if (!limpio) throw new Error("Escribe qué quieres que haga Atlas con el video.");
  if (!t.transcripcion) throw new Error("Primero hay que transcribir el video.");
  let crudo: unknown;
  try {
    crudo = await pedirEstructura<RespuestaAtlasVideo>(SISTEMA_ATLAS_VIDEO, mensajeAtlasVideo(limpio, t), HERRAMIENTA, 2500);
  } catch (e) {
    throw new Error(`Atlas no pudo leer el pedido: ${(e as Error).message}`);
  }
  if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Atlas no puede leer pedidos. Mientras tanto puedes editar a mano.");
  const r = leerRespuestaAtlas(crudo);
  const { edicion, cambios, armar } = aplicarAcciones(t.edicion, r.acciones, t.transcripcion);
  return { respuesta: r.respuesta, edicion, cambios, armar, noSePuede: r.noSePuede };
}
