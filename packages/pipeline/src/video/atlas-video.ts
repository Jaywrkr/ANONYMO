// El departamento de video (sistema/63; sin transcripción desde sistema/64; edita Corte desde sistema/71): Luna escribe lo que quiere
// y Atlas lo convierte en acciones sobre el JSON de edición. Atlas no oye el video: ve una hoja con una miniatura
// numerada por parte y sabe cuánto dura cada parte y cuánto silencio hay entre ellas.
// La IA solo elige las acciones; aplicarlas es cálculo puro (`aplicarAcciones`), así lo que se ve en la vista
// previa es exactamente lo que se pidió y se puede deshacer.
import { pedirEstructura } from "../ia.ts";
import { edicionSegura, planEdicion } from "./edicion.ts";
import { FORMATOS_VIDEO, type Analisis, type Edicion, type FormatoVideo, type MensajeVideo, type TrabajoVideo } from "./tipos.ts";

/** Una acción que Atlas puede pedir. Campos planos: el modelo llena solo los que usa. */
export interface AccionVideo {
  tipo: "silencios" | "quitar" | "devolver" | "audio" | "zoom" | "transicion" | "marca" | "armar";
  activo?: boolean;
  pausaMax?: number;
  /** Para quitar/devolver: partes (números desde 1, como en las miniaturas, inclusive) o segundos del original. */
  unidad?: "parte" | "segundo";
  desde?: number;
  hasta?: number;
  normalizar?: boolean;
  limpiarRuido?: boolean;
  /** zoom (sistema/65): "alterno" (en cada corte), "partes" (desde/hasta, números de parte), "quitar" (sin zoom en desde/hasta, o en todo si no hay desde) */
  modo?: "alterno" | "partes" | "quitar";
  /** transicion: corte seco o fundido corto. */
  estilo?: "corte" | "fundido";
  logoEsquina?: boolean;
  cierre?: boolean;
  cierreSegundos?: number;
  musica?: boolean;
  volumenMusica?: number;
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
  /** Qué cambió, una línea por cambio («Quitar la parte 2»). */
  cambios: string[];
  armar: FormatoVideo[];
  noSePuede: string[];
}

/** Lo que Atlas sabe del kit de marca del video (sistema/65). */
export interface KitParaAtlas { nombre: string; logo: boolean; musica?: string }
type VideoParaAtlas = Pick<TrabajoVideo, "nombre" | "cliente" | "duracion" | "analisis" | "edicion"> & { conversacion?: MensajeVideo[]; kit?: KitParaAtlas; guion?: string };

const seg = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("es")} s`;

/** Las partes que tocan un tramo de segundos (por su punto medio). Índices desde 0. */
function partesEnTiempo(an: Analisis, desde: number, hasta: number) {
  const out: number[] = [];
  an.partes.forEach((p, i) => { const m = (p.inicio + p.fin) / 2; if (m >= desde && m <= hasta) out.push(i); });
  return out;
}

/** «2», «2 y 3», «2 a 5». Números desde 1, como los ve Luna. */
function nombrePartes(indices: number[]) {
  const n = indices.map((i) => i + 1);
  if (n.length === 1) return `la parte ${n[0]}`;
  const seguidas = n.every((x, k) => k === 0 || x === n[k - 1] + 1);
  return seguidas && n.length > 2 ? `las partes ${n[0]} a ${n[n.length - 1]}` : `las partes ${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
}

/** Aplica las acciones a la edición, sin IA. Lo que no tiene sentido se ignora y no se cuenta como cambio. */
export function aplicarAcciones(base: Edicion, acciones: AccionVideo[], an: Analisis | undefined, kit?: KitParaAtlas): { edicion: Edicion; cambios: string[]; armar: FormatoVideo[] } {
  let e: Edicion = edicionSegura(structuredClone(base), base);
  const cambios: string[] = [];
  const armar = new Set<FormatoVideo>();
  const n = an?.partes.length ?? 0;
  for (const a of acciones.slice(0, 30)) {
    if (!a || typeof a !== "object") continue;
    if (a.tipo === "silencios") {
      const antes = { s: e.silencios, p: e.pausaMax };
      e.silencios = a.activo ?? true;
      if (typeof a.pausaMax === "number") e.pausaMax = a.pausaMax;
      e = edicionSegura(e, e);
      if (e.silencios !== antes.s || e.pausaMax !== antes.p) cambios.push(e.silencios ? `Quitar pausas de más de ${seg(e.pausaMax)}` : "Dejar las pausas");
    } else if ((a.tipo === "quitar" || a.tipo === "devolver") && an && n && typeof a.desde === "number" && typeof a.hasta === "number") {
      const [x, y] = [Math.min(a.desde, a.hasta), Math.max(a.desde, a.hasta)];
      const indices = a.unidad === "segundo"
        ? partesEnTiempo(an, x, y)
        : (() => { const ini = Math.max(1, Math.ceil(x)), fin = Math.min(n, Math.floor(y)); return Array.from({ length: Math.max(0, fin - ini + 1) }, (_, k) => ini - 1 + k); })();
      const q = new Set(e.quitadas);
      const cambian = indices.filter((i) => (a.tipo === "quitar" ? !q.has(i) : q.has(i)));
      if (!cambian.length) continue;
      for (const i of cambian) a.tipo === "quitar" ? q.add(i) : q.delete(i);
      e.quitadas = [...q].sort((m, k) => m - k);
      cambios.push(`${a.tipo === "quitar" ? "Quitar" : "Devolver"} ${nombrePartes(cambian)}`);
    } else if (a.tipo === "audio") {
      const antes = e.audio;
      e = edicionSegura({ ...e, audio: { ...antes, ...(a.normalizar !== undefined ? { normalizar: a.normalizar } : {}), ...(a.limpiarRuido !== undefined ? { limpiarRuido: a.limpiarRuido } : {}) } }, e);
      if (e.audio.normalizar !== antes.normalizar) cambios.push(e.audio.normalizar ? "Volumen parejo" : "Volumen como viene");
      if (e.audio.limpiarRuido !== antes.limpiarRuido) cambios.push(e.audio.limpiarRuido ? "Limpiar ruido de fondo" : "Sin limpiar ruido");
    } else if (a.tipo === "zoom") {
      const antes = JSON.stringify(e.motion);
      const rango = (): number[] => {
        if (!an || !n || typeof a.desde !== "number") return [];
        const ini = Math.max(1, Math.ceil(Math.min(a.desde, a.hasta ?? a.desde))), fin = Math.min(n, Math.floor(Math.max(a.desde, a.hasta ?? a.desde)));
        return Array.from({ length: Math.max(0, fin - ini + 1) }, (_, k) => ini - 1 + k);
      };
      if (a.modo === "alterno") { e.motion = { ...e.motion, zoomAlterno: true }; if (JSON.stringify(e.motion) !== antes) cambios.push("Zoom en cada corte"); }
      else if (a.modo === "partes") {
        const r = rango().filter((i) => !e.motion.zoomPartes.includes(i));
        if (r.length) { e.motion = { ...e.motion, zoomPartes: [...e.motion.zoomPartes, ...r].sort((x, y) => x - y) }; cambios.push(`Zoom en ${nombrePartes(r)}`); }
      } else if (a.modo === "quitar") {
        const r = typeof a.desde === "number" ? rango() : null;
        const zp = r ? e.motion.zoomPartes.filter((i) => !r.includes(i)) : [];
        e.motion = { ...e.motion, zoomAlterno: r ? e.motion.zoomAlterno : false, zoomPartes: zp };
        if (JSON.stringify(e.motion) !== antes) cambios.push(r ? `Sin zoom en ${nombrePartes(r)}` : "Sin zoom");
      }
    } else if (a.tipo === "transicion" && (a.estilo === "corte" || a.estilo === "fundido")) {
      if (e.motion.transicion !== a.estilo) { e.motion = { ...e.motion, transicion: a.estilo }; cambios.push(a.estilo === "fundido" ? "Fundido corto entre partes" : "Corte seco entre partes"); }
    } else if (a.tipo === "marca") {
      // Sin kit de marca no hay logo ni música que poner: no se cuenta como cambio (Atlas lo dice en noSePuede).
      if (!kit) continue;
      const antes = e.marca;
      const pedido = {
        ...(a.logoEsquina !== undefined && (kit.logo || !a.logoEsquina) ? { logoEsquina: a.logoEsquina } : {}),
        ...(a.cierre !== undefined ? { cierre: a.cierre } : {}),
        ...(typeof a.cierreSegundos === "number" ? { cierreSegundos: a.cierreSegundos } : {}),
        ...(a.musica !== undefined && (kit.musica || !a.musica) ? { musica: a.musica } : {}),
        ...(typeof a.volumenMusica === "number" ? { volumenMusica: a.volumenMusica } : {}),
      };
      e = edicionSegura({ ...e, marca: { ...antes, ...pedido } }, e);
      const m = e.marca, l: string[] = [];
      if (m.logoEsquina !== antes.logoEsquina) l.push(m.logoEsquina ? "logo en la esquina" : "sin logo en la esquina");
      if (m.cierre !== antes.cierre) l.push(m.cierre ? `cierre de ${seg(m.cierreSegundos)} con ${kit.logo ? "el logo" : "el nombre"}` : "sin cierre");
      else if (m.cierre && m.cierreSegundos !== antes.cierreSegundos) l.push(`cierre de ${seg(m.cierreSegundos)}`);
      if (m.musica !== antes.musica) l.push(m.musica ? `música «${kit.musica}»` : "sin música");
      if (m.volumenMusica !== antes.volumenMusica && m.musica) l.push(m.volumenMusica > antes.volumenMusica ? "música más alta" : "música más baja");
      if (l.length) cambios.push(`Marca: ${l.join(", ")}`);
    } else if (a.tipo === "armar") {
      for (const f of a.formatos ?? []) if (FORMATOS_VIDEO.includes(f)) armar.add(f);
    }
  }
  return { edicion: edicionSegura(e, base), cambios, armar: [...armar] };
}

export const SISTEMA_ATLAS_VIDEO = `Corte, editor de video de ANONYMO: ritmo puro, si aburre se corta. Atlas te pasa el pedido.
Luna (o Jay) te escribe lo que quiere de un video filmado (una persona hablando o haciendo algo) y tú lo conviertes en acciones de edición. Respondes siempre con la herramienta «editar_video».

Qué sabes del video: no lo escuchas ni tienes transcripción. Tienes la lista de sus partes (cada tramo con voz o sonido entre dos silencios: inicio, fin, duración y el silencio que viene antes) y una hoja con una miniatura por parte, numeradas desde 1 en el mismo orden. Usa la imagen para entender qué pasa en cada parte (si se ve la persona, si mira a cámara, si está acomodándose, si hay pantalla en negro).

Lo que se puede hacer hoy (acciones):
- silencios: activo true/false; pausaMax en segundos (0,3 = ritmo muy rápido, 0,6 = ritmo de redes, 1,2 = pausado). «Corta los silencios» = activo true; «más dinámico» = bajar pausaMax.
- quitar / devolver: partes enteras. unidad "parte" con desde/hasta = números de parte (desde 1, inclusive, como en las miniaturas), o unidad "segundo" con tiempos del video original. «Quita la parte del inicio» = las primeras partes donde la persona aún no empieza (se acomoda, mira fuera de cámara, partes muy cortas al arranque).
- audio: normalizar (volumen parejo al nivel de redes), limpiarRuido (aire, ventilador).
- zoom: modo "alterno" = en cada corte alterna plano normal y plano cerrado (el estilo de los videos hablados; disimula los saltos); modo "partes" con desde/hasta = plano cerrado en esas partes, para remarcar un momento (una frase clave, un gesto, el producto); modo "quitar" = sin zoom (con desde/hasta, solo en esas partes).
- transicion: estilo "corte" (seco, lo normal en redes) o "fundido" (corto, más suave).
- marca: usa el kit de marca del video. logoEsquina (logo chico arriba a la derecha), cierre (el video termina con el logo, o el nombre si no hay logo, sobre el color de la marca) y cierreSegundos (1 a 5), musica (la música de la marca, que baja sola cuando alguien habla) y volumenMusica (0,05 muy baja, 0,18 normal, 0,35 alta). Si el video no tiene marca, o la marca no tiene logo o música, dilo en noSePuede y explica que se elige o se sube en «Marcas».
- armar: formatos ["9:16","1:1","16:9"] cuando pide el video final, exportar o descargar.

Lo que todavía NO se puede (va en noSePuede, en palabras simples, y no inventes acciones para eso): subtítulos o texto en pantalla, música que no sea la de la marca (no hay biblioteca de canciones), cambiar el orden de las partes, efectos de color, cortar dentro de una parte o buscar una frase por lo que se dice (no hay transcripción).

Reglas:
- Solo pide lo que Luna pidió. No cambies nada más «por las dudas».
- Los cambios son sobre la edición actual: si dice «más», parte del valor actual.
- respuesta: una o dos frases, en español simple, sin jerga, diciendo qué hiciste y nombrando las partes por su número. Si algo no se puede, dilo con amabilidad.
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
            tipo: { type: "string", enum: ["silencios", "quitar", "devolver", "audio", "zoom", "transicion", "marca", "armar"] },
            activo: { type: "boolean" },
            pausaMax: { type: "number" },
            unidad: { type: "string", enum: ["parte", "segundo"] },
            desde: { type: "number" },
            hasta: { type: "number" },
            normalizar: { type: "boolean" },
            limpiarRuido: { type: "boolean" },
            modo: { type: "string", enum: ["alterno", "partes", "quitar"] },
            estilo: { type: "string", enum: ["corte", "fundido"] },
            logoEsquina: { type: "boolean" },
            cierre: { type: "boolean" },
            cierreSegundos: { type: "number" },
            musica: { type: "boolean" },
            volumenMusica: { type: "number" },
            formatos: { type: "array", items: { type: "string", enum: FORMATOS_VIDEO } },
          },
        },
      },
      noSePuede: { type: "array", items: { type: "string" } },
    },
  },
};

/** Lo que Atlas lee: el pedido, la edición actual, las partes con sus tiempos y la conversación reciente. */
export function mensajeAtlasVideo(pedido: string, t: VideoParaAtlas) {
  const an = t.analisis;
  const plan = planEdicion(an, t.edicion, t.duracion ?? 0);
  const quitadas = new Set(t.edicion.quitadas);
  const partes = an
    ? an.partes.map((p, i) => `${i + 1}. ${p.inicio.toFixed(1)}–${p.fin.toFixed(1)} s (dura ${(p.fin - p.inicio).toFixed(1)} s; silencio antes ${(p.inicio - (i ? an.partes[i - 1].fin : 0)).toFixed(1)} s)${quitadas.has(i) ? " [QUITADA]" : ""}`).join("\n")
    : "(sin analizar)";
  const sinImagen = an && an.partes.length > (an.cuadros?.total ?? 0) ? `\nLa hoja muestra solo las primeras ${an.cuadros?.total ?? 0} partes.` : "";
  const previos = (t.conversacion ?? []).slice(-8).map((m) => `${m.quien === "atlas" ? "Corte" : "Luna"}: ${m.texto}`).join("\n");
  return [
    `# Video: ${t.nombre}${t.cliente ? ` (${t.cliente})` : ""}`,
    `Dura ${seg(t.duracion ?? 0)}; con la edición actual queda en ${seg(plan.duracion)}.`,
    `## Edición actual\n${JSON.stringify(t.edicion)}`,
    `## Marca\n${t.kit ? `${t.kit.nombre}: ${t.kit.logo ? "tiene logo" : "sin logo (el cierre lleva el nombre)"}; ${t.kit.musica ? `música «${t.kit.musica}»` : "sin música"}.` : "Este video no tiene marca elegida: no hay logo ni música."}`,
    `## Partes (${an?.partes.length ?? 0})\n${partes}${sinImagen}`,
    t.guion ? `## Guion de Faro (lo que se quería decir; úsalo para decidir qué partes sobran y el orden)\n${t.guion}` : "",
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

/**
 * Atlas interpreta el pedido y devuelve la edición nueva (sin guardarla).
 * `hoja`: la imagen con las miniaturas de las partes (JPG), si existe.
 */
export async function interpretarPedidoVideo(pedido: string, t: VideoParaAtlas, hoja?: Uint8Array): Promise<ResultadoAtlas> {
  const limpio = pedido.trim().slice(0, 2000);
  if (!limpio) throw new Error("Escribe qué quieres que haga Corte con el video.");
  if (!t.analisis) throw new Error("Primero hay que escuchar el video.");
  const texto = mensajeAtlasVideo(limpio, t);
  const contenido = hoja?.length
    ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(hoja).toString("base64") } }, { type: "text", text: texto }]
    : texto;
  let crudo: unknown;
  try {
    crudo = await pedirEstructura<RespuestaAtlasVideo>(SISTEMA_ATLAS_VIDEO, contenido, HERRAMIENTA, 2500);
  } catch (e) {
    throw new Error(`Corte no pudo leer el pedido: ${(e as Error).message}`);
  }
  if (crudo === undefined) throw new Error("Falta la clave de Anthropic (ANTHROPIC_API_KEY): sin ella Corte no puede leer pedidos. Mientras tanto puedes editar a mano.");
  const r = leerRespuestaAtlas(crudo);
  const { edicion, cambios, armar } = aplicarAcciones(t.edicion, r.acciones, t.analisis, t.kit);
  return { respuesta: r.respuesta, edicion, cambios, armar, noSePuede: r.noSePuede };
}
