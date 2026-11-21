// La caja única de Atlas (sistema/95): un solo lugar para pedir cosas, escribiendo como en un chat.
//   @agente   quién lo hace (Faro, Imán, Atlas)
//   #cliente  para quién (sale de las fichas)
//   /acción   qué se hace (guion, muestra, mensaje, datos, pedido, proyecto, contenido)
// Lo que no lleva marca es el pedido en palabras. Si falta algo se adivina con cuidado y siempre se muestra lo que se
// entendió antes de hacerlo. Esta parte no toca la red ni gasta: solo entiende el texto. Corre también en el navegador.
import type { TareaSaber } from "./saber.ts";

export type AccionCaja = "guion" | "muestra" | "mensaje" | "datos" | "pedido" | "proyecto" | "contenido";
export type AgenteCaja = "faro" | "iman" | "atlas";

export interface DefAccion {
  nombre: string;
  agente: AgenteCaja;
  ayuda: string;
  /** La tarea de la ficha cuyos mínimos se exigen (saber.ts). */
  tarea?: TareaSaber;
  /** Usa IA: se pide confirmación antes de hacerlo. */
  gasta?: boolean;
  /** Necesita un cliente con ficha. */
  conCliente: boolean;
  /** Todavía no se puede hacer desde aquí. */
  pronto?: boolean;
  /** Otras palabras con que se puede pedir. */
  sinonimos: string[];
}

export const ACCIONES_CAJA: Record<AccionCaja, DefAccion> = {
  guion: { nombre: "Guion de video", agente: "faro", ayuda: "Faro escribe el guion de un reel o un video.", tarea: "guion", gasta: true, conCliente: false, sinonimos: ["video", "reel", "tiktok", "guión"] },
  muestra: { nombre: "Ver su muestra", agente: "iman", ayuda: "Abre la idea de web que se le mandó.", tarea: "muestra", conCliente: true, sinonimos: ["boceto"] },
  mensaje: { nombre: "Primer mensaje", agente: "iman", ayuda: "El mensaje de WhatsApp con su muestra, listo para copiar o abrir.", tarea: "mensaje", conCliente: true, sinonimos: ["whatsapp", "escribirle"] },
  datos: { nombre: "Buscar datos en su web", agente: "iman", ayuda: "Lee su web y propone datos para su ficha.", conCliente: true, sinonimos: ["ficha", "buscar", "leer"] },
  pedido: { nombre: "Nuevo pedido", agente: "atlas", ayuda: "Arma un pedido nuevo con lo que escribas.", conCliente: false, sinonimos: ["web", "encargo", "nuevo"] },
  proyecto: { nombre: "Hablar de su proyecto", agente: "atlas", ayuda: "Abre la conversación de su proyecto con Atlas.", conCliente: true, sinonimos: ["avance", "pregunta", "consulta"] },
  contenido: { nombre: "Mes de contenido", agente: "faro", ayuda: "El calendario del mes. Todavía no se puede pedir desde aquí.", tarea: "contenido", gasta: true, conCliente: true, pronto: true, sinonimos: ["calendario", "mes", "publicaciones"] },
};
export const ORDEN_ACCIONES = Object.keys(ACCIONES_CAJA) as AccionCaja[];

export const AGENTES_CAJA: Record<AgenteCaja, { nombre: string; rol: string; porDefecto: AccionCaja }> = {
  faro: { nombre: "Faro", rol: "Contenido y video", porDefecto: "guion" },
  iman: { nombre: "Imán", rol: "Clientes nuevos", porDefecto: "muestra" },
  atlas: { nombre: "Atlas", rol: "Pedidos y proyectos", porDefecto: "pedido" },
};
export const ORDEN_AGENTES = Object.keys(AGENTES_CAJA) as AgenteCaja[];

export interface ClienteCaja { id: string; nombre: string; alias?: string[] }

export interface LecturaCaja {
  agente?: AgenteCaja;
  accion?: AccionCaja;
  cliente?: string;
  /** El pedido en palabras, sin las marcas. */
  texto: string;
  /** Lo que no se entendió y hay que aclarar antes de hacer nada. */
  dudas: string[];
  /** Cómo se llegó a la acción: escrita, por el agente, o adivinada de las palabras. */
  como?: "escrita" | "agente" | "palabras";
}

// La misma regla que idFicha (solicitudes.ts), copiada para no traer nada del disco al navegador.
const slug = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const norma = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Un agente por su nombre o el principio («@ima», «@Imán»). */
export function agenteDe(x: string): AgenteCaja | undefined {
  const n = norma(x);
  if (!n) return undefined;
  return ORDEN_AGENTES.find((a) => a === n || norma(AGENTES_CAJA[a].nombre) === n) ?? (n.length >= 2 ? ORDEN_AGENTES.find((a) => a.startsWith(n)) : undefined);
}

/** Una acción por su nombre, un sinónimo o el principio («/gui»). */
export function accionDe(x: string): AccionCaja | undefined {
  const n = norma(x);
  if (!n) return undefined;
  const exacta = ORDEN_ACCIONES.find((a) => a === n || ACCIONES_CAJA[a].sinonimos.some((s) => norma(s) === n));
  return exacta ?? (n.length >= 3 ? ORDEN_ACCIONES.find((a) => a.startsWith(n)) : undefined);
}

/** Los clientes que calzan con lo escrito tras «#»: por id, por nombre o por otro nombre. */
export function clientesDe<T extends ClienteCaja>(x: string, clientes: T[]): T[] {
  const n = slug(x);
  if (!n) return [];
  const exactos = clientes.filter((c) => c.id === n || slug(c.nombre) === n || (c.alias ?? []).some((a) => slug(a) === n));
  if (exactos.length) return exactos;
  return clientes.filter((c) => c.id.startsWith(n) || slug(c.nombre).split("-").some((w) => w.startsWith(n)) || (c.alias ?? []).some((a) => slug(a).startsWith(n)));
}

/** Adivina la acción por las palabras del pedido, solo cuando es claro. */
function accionPorPalabras(t: string): AccionCaja | undefined {
  const n = norma(t);
  if (/\b(guion|reel|reels|video|tiktok)\b/.test(n)) return "guion";
  if (/\b(muestra|boceto)\b/.test(n)) return "muestra";
  if (/\b(mensaje|whatsapp|escribirle)\b/.test(n)) return "mensaje";
  if (/\b(buscar datos|sus datos|su web|leer su web)\b/.test(n)) return "datos";
  if (/\b(como va|avance|en que va|su proyecto)\b/.test(n)) return "proyecto";
  return undefined;
}

/** Entiende lo escrito en la caja. `contexto`: el cliente de la última vez, que se mantiene si no se nombra otro. */
export function leerCaja(texto: string, clientes: ClienteCaja[], contexto?: string): LecturaCaja {
  const dudas: string[] = [];
  let agente: AgenteCaja | undefined, accion: AccionCaja | undefined, cliente: string | undefined, como: LecturaCaja["como"];
  const resto = texto.replace(/(^|\s)([@#/])([^\s@#/]+)/g, (todo, antes: string, marca: string, palabra: string) => {
    if (marca === "@") {
      const a = agenteDe(palabra);
      if (a) agente = a; else dudas.push(`No conozco a «@${palabra}». Puedes pedirle a ${ORDEN_AGENTES.map((x) => "@" + AGENTES_CAJA[x].nombre).join(", ")}.`);
      return antes;
    }
    if (marca === "/") {
      const a = accionDe(palabra);
      if (a) { accion = a; como = "escrita"; } else dudas.push(`No conozco «/${palabra}». Escribe / para ver lo que se puede pedir.`);
      return antes;
    }
    const lista = clientesDe(palabra, clientes);
    if (lista.length === 1) cliente = lista[0]!.id;
    else if (lista.length > 1) dudas.push(`«#${palabra}» puede ser ${lista.slice(0, 4).map((c) => c.nombre).join(", ")}. Elige uno de la lista.`);
    else dudas.push(`No encontré el cliente «#${palabra}».`);
    return antes;
  }).replace(/\s+/g, " ").trim();
  if (!accion && agente) { accion = AGENTES_CAJA[agente].porDefecto; como = "agente"; }
  if (!accion) { accion = accionPorPalabras(resto); if (accion) como = "palabras"; }
  if (accion && !agente) agente = ACCIONES_CAJA[accion].agente;
  // Si se escribió un agente que no hace esa acción, manda la acción: se dice para que no sorprenda.
  if (accion && agente && ACCIONES_CAJA[accion].agente !== agente) {
    dudas.push(`${AGENTES_CAJA[agente].nombre} no hace «${ACCIONES_CAJA[accion].nombre}»: lo hace ${AGENTES_CAJA[ACCIONES_CAJA[accion].agente].nombre}.`);
    agente = ACCIONES_CAJA[accion].agente;
  }
  if (!cliente && contexto && clientes.some((c) => c.id === contexto)) cliente = contexto;
  return { agente, accion, cliente, texto: resto, dudas, como };
}

/** La palabra que se está escribiendo justo antes del cursor, si empieza con una marca: para las sugerencias. */
export function marcaEnCurso(texto: string, cursor: number): { marca: "@" | "#" | "/"; palabra: string; desde: number } | undefined {
  const antes = texto.slice(0, cursor);
  const m = antes.match(/(^|\s)([@#/])([^\s@#/]*)$/);
  if (!m) return undefined;
  return { marca: m[2] as "@" | "#" | "/", palabra: m[3] ?? "", desde: antes.length - (m[3]?.length ?? 0) - 1 };
}

/** Pone la sugerencia elegida en lugar de la palabra en curso. Devuelve el texto nuevo y dónde queda el cursor. */
export function ponerSugerencia(texto: string, cursor: number, valor: string): { texto: string; cursor: number } {
  const m = marcaEnCurso(texto, cursor);
  if (!m) return { texto, cursor };
  const nuevo = `${texto.slice(0, m.desde)}${valor} ${texto.slice(cursor).replace(/^\s+/, "")}`;
  return { texto: nuevo, cursor: m.desde + valor.length + 1 };
}
