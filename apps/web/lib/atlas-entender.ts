// Atlas entiende lo que le escriben (sistema/106).
// Con marcas (# cliente, / acción, @ agente) se lee directo, sin gastar. En palabras normales pregunta a un modelo
// rápido qué acción es y para quién. Sin clave, o si la IA falla, adivina por palabras como antes: nunca se queda mudo.
import { ACCIONES_CAJA, AGENTES_CAJA, clientesDe, leerCaja, pedirEstructura, type AccionCaja, type ClienteCaja } from "@anonymo/pipeline";
import type { Eleccion } from "./atlas-hilo";

/** Lo que Atlas sabe hacer además de las acciones de la caja. */
export const EXTRAS = {
  hoy: { nombre: "Lo que te toca hoy", agente: "atlas" },
  memoria: { nombre: "Lo que sé de un cliente", agente: "atlas" },
  ayuda: { nombre: "Qué puedo hacer", agente: "atlas" },
} as const;
export type AccionAtlas = AccionCaja | keyof typeof EXTRAS;
const TODAS = [...(Object.keys(ACCIONES_CAJA) as AccionCaja[]), ...(Object.keys(EXTRAS) as (keyof typeof EXTRAS)[])];
export const esAccion = (x: unknown): x is AccionAtlas => typeof x === "string" && (TODAS as string[]).includes(x);
export const nombreAccion = (a: AccionAtlas) => (a in EXTRAS ? EXTRAS[a as keyof typeof EXTRAS].nombre : ACCIONES_CAJA[a as AccionCaja].nombre);
export const agenteDeAccion = (a: AccionAtlas) => AGENTES_CAJA[(a in EXTRAS ? "atlas" : ACCIONES_CAJA[a as AccionCaja].agente) as keyof typeof AGENTES_CAJA].nombre;

export interface ProyectoCorto { id: string; cliente: string; estado: string }
export interface Intento {
  eleccion?: Eleccion;
  pregunta?: string;
  opciones?: { texto: string; eleccion: Eleccion }[];
  dudas?: string[];
  como: "marcas" | "ia" | "palabras";
}

const normal = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^[¿¡\s]+/, "");

/** El cliente nombrado en palabras normales («la web de clínica sonrisa»): solo si es uno. */
function clienteEnTexto(texto: string, clientes: ClienteCaja[]): string | undefined {
  const t = normal(texto);
  const exactos = clientes.filter((c) => [c.nombre, c.id.replace(/-/g, " "), ...(c.alias ?? [])].some((n) => n && n.length > 3 && t.includes(normal(n))));
  if (exactos.length === 1) return exactos[0]!.id;
  const porPalabra = new Map<string, number>();
  for (const w of t.split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 5)) for (const c of clientesDe(w, clientes)) porPalabra.set(c.id, (porPalabra.get(c.id) ?? 0) + 1);
  const mejores = [...porPalabra.entries()].sort((a, b) => b[1] - a[1]);
  return mejores.length && (mejores.length === 1 || mejores[0]![1] > mejores[1]![1]) ? mejores[0]![0] : undefined;
}

/** Sin IA: las palabras de siempre, más «hoy» y «qué sabes de». */
export function entenderPorPalabras(texto: string, clientes: ClienteCaja[], ctx: { cliente?: string; proyecto?: string; suave?: boolean }): Intento {
  const t = normal(texto);
  const nombrado = clienteEnTexto(texto, clientes);
  const cliente = nombrado ?? ctx.cliente;
  if (/^(hoy|que (me|nos) toca|pendientes|que hay (para )?hoy|que tengo)\b/.test(t)) return { como: "palabras", eleccion: { accion: "hoy", texto } };
  if (/\b(que sabes de|que sabe(s)? del cliente|memoria de|lo que sabes)\b/.test(t)) return { como: "palabras", eleccion: { accion: "memoria", cliente, texto } };
  if (/^(ayuda|que puedes hacer|que sabes hacer|como funcionas)\b/.test(t)) return { como: "palabras", eleccion: { accion: "ayuda", texto } };
  const l = leerCaja(texto, clientes);
  if (/\b(cambia\w*|cambio|diga|digan|que se vea|mas corto|mas grande|mas chico|quita\w*|pon|ponle|agrega\w*|reemplaza\w*|corrige|corregir)\b/.test(t) && (ctx.proyecto || cliente)) return { como: "palabras", eleccion: { accion: "cambio", cliente, proyecto: ctx.proyecto, texto } };
  if (l.accion) return { como: "palabras", eleccion: { accion: l.accion, cliente: ctx.suave && !nombrado && !ACCIONES_CAJA[l.accion].conCliente ? undefined : cliente, proyecto: ctx.proyecto, texto: l.texto } };
  if (ctx.proyecto || cliente) return { como: "palabras", eleccion: { accion: "proyecto", cliente, proyecto: ctx.proyecto, texto } };
  return { como: "palabras", eleccion: { accion: "ayuda", texto } };
}

const SISTEMA = `Atlas entiende pedidos del estudio Unmake. Jay o Luna le escriben en español, como en un chat, a veces dictado.
Tu trabajo es elegir UNA acción y para qué cliente o proyecto es. No respondas el pedido: solo clasifícalo.
Acciones:
${TODAS.map((a) => `- ${a}: ${a in EXTRAS ? EXTRAS[a as keyof typeof EXTRAS].nombre : `${ACCIONES_CAJA[a as AccionCaja].nombre}. ${ACCIONES_CAJA[a as AccionCaja].ayuda}`}`).join("\n")}
Reglas:
- «proyecto» es preguntar cómo va, qué falta, qué se hizo. «cambio» es pedir que se modifique algo de un proyecto.
- Si hay un proyecto o cliente en contexto y no se nombra otro, es ese.
- Usa solo ids de las listas. Si no se nombra cliente y la acción lo necesita, deja cliente vacío.
- Si de verdad no se puede saber (por ejemplo, dos clientes posibles), escribe una pregunta corta y hasta 4 opciones. Si se puede, no preguntes.
- «texto» es el pedido limpio, sin el nombre del cliente ni la acción, con las palabras de quien escribe.`;

/** Entiende el mensaje. `ctx`: el proyecto o cliente de la página donde se está (la etiqueta de arriba). */
export async function entender(texto: string, clientes: ClienteCaja[], proyectos: ProyectoCorto[], ctx: { cliente?: string; proyecto?: string; suave?: boolean }, quien: "jay" | "luna"): Promise<Intento> {
  // Con marcas, manda lo escrito: no se gasta nada.
  if (/(^|\s)[#/@][^\s]/.test(texto)) {
    const l0 = leerCaja(texto, clientes, ctx.suave ? undefined : ctx.cliente);
    // El último cliente del que se habló (suave) solo vale para acciones que necesitan un cliente.
    const l = ctx.suave && !l0.cliente && l0.accion && ACCIONES_CAJA[l0.accion].conCliente && ctx.cliente ? { ...l0, cliente: ctx.cliente } : l0;
    if (l.dudas.length) return { como: "marcas", dudas: l.dudas };
    if (!l.accion) return { como: "marcas", dudas: ["No entendí qué hacer. Escribe / para ver lo que puedo hacer."] };
    return { como: "marcas", eleccion: { accion: l.accion, cliente: l.cliente, proyecto: l.cliente ? undefined : ctx.proyecto, texto: l.texto } };
  }
  const palabras = entenderPorPalabras(texto, clientes, ctx);
  // Lo de todos los días no necesita IA.
  if (palabras.eleccion && ["hoy", "ayuda"].includes(palabras.eleccion.accion) && texto.length < 40) return palabras;
  const opcion = { type: "object", properties: { texto: { type: "string" }, accion: { type: "string", enum: TODAS }, cliente: { type: "string" }, proyecto: { type: "string" } }, required: ["texto", "accion"] };
  try {
    const r = await pedirEstructura<{ accion?: string; cliente?: string; proyecto?: string; texto?: string; pregunta?: string; opciones?: { texto?: string; accion?: string; cliente?: string; proyecto?: string }[] }>(
      SISTEMA,
      `## Quién escribe\n${quien === "jay" ? "Jay" : "Luna"}\n## Contexto\n${ctx.proyecto ? `Proyecto abierto: ${ctx.proyecto}` : ctx.cliente ? (ctx.suave ? `Último cliente del que se habló: ${ctx.cliente} (úsalo solo si el pedido es claramente sobre un cliente)` : `Cliente abierto: ${ctx.cliente}`) : "Ninguno"}\n## Clientes (id: nombre)\n${clientes.slice(0, 120).map((c) => `${c.id}: ${c.nombre}${c.alias?.length ? ` (${c.alias.join(", ")})` : ""}`).join("\n") || "(ninguno)"}\n## Proyectos (id: cliente · estado)\n${proyectos.slice(0, 60).map((p) => `${p.id}: ${p.cliente} · ${p.estado}`).join("\n") || "(ninguno)"}\n## Mensaje\n${texto}`,
      { nombre: "entender_pedido", descripcion: "La acción que se pide y para quién.", esquema: { type: "object", properties: { accion: { type: "string", enum: TODAS }, cliente: { type: "string" }, proyecto: { type: "string" }, texto: { type: "string" }, pregunta: { type: "string" }, opciones: { type: "array", items: opcion, maxItems: 4 } }, required: ["accion", "texto"] } },
      600,
      { origen: "atlas", tarea: "entender" },
      process.env.ANTHROPIC_MODEL_ATLAS ?? "claude-haiku-5-5",
    );
    if (!r || !esAccion(r.accion)) return palabras;
    const cliente = clientes.some((c) => c.id === r.cliente) ? r.cliente : undefined;
    const proyecto = proyectos.some((p) => p.id === r.proyecto) ? r.proyecto : undefined;
    const limpio = (r.texto ?? "").trim() || texto;
    const opciones = (r.opciones ?? []).filter((o) => esAccion(o.accion) && o.texto?.trim()).map((o) => ({
      texto: o.texto!.trim().slice(0, 60),
      eleccion: { accion: o.accion!, cliente: clientes.some((c) => c.id === o.cliente) ? o.cliente : cliente, proyecto: proyectos.some((p) => p.id === o.proyecto) ? o.proyecto : proyecto, texto: limpio },
    }));
    if (r.pregunta?.trim() && opciones.length >= 2) return { como: "ia", pregunta: r.pregunta.trim().slice(0, 200), opciones };
    if (r.accion === "ayuda" && ctx.proyecto && !/^(ayuda|que puedes|que sabes hacer|como funcionas)/.test(normal(texto))) return { como: "ia", eleccion: { accion: "proyecto", proyecto: ctx.proyecto, texto } };
    return { como: "ia", eleccion: { accion: r.accion, cliente: cliente ?? (proyecto || (ctx.suave && !(r.accion in ACCIONES_CAJA && ACCIONES_CAJA[r.accion as AccionCaja].conCliente)) ? undefined : ctx.cliente), proyecto: proyecto ?? (cliente ? undefined : ctx.proyecto), texto: limpio } };
  } catch {
    return palabras;
  }
}
