// Lee los proyectos de clientes que deja el pipeline en proyectos/<id>/. Solo en el servidor, al compilar.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contratoPorId, type TareaId } from "@anonymo/pipeline";
import { PROYECTO, type Estado, type Mensaje } from "./proyecto";

const local = () => process.env.ESTUDIO === "1" || process.env.NODE_ENV === "development";

const RAIZ = process.env.ANONYMO_PROYECTOS ?? join(process.cwd(), "../../proyectos");

/** Lo que necesita la sala: el mismo formato para la agencia y para cada cliente. */
export interface VistaProyecto {
  id: string;
  nombre: string;
  /** Fases que entran en el plan. */
  fases: number[];
  mensajes: Record<number, Record<string, Mensaje & { tarea?: string; modo?: string }>>;
  nota?: number;
  estado?: string;
  /** Lo que dijo el cliente y a quién se lo mandó Atlas. */
  cliente?: { fecha: string; texto: string; quien: string; agentes: string[] }[];
  /** Publicado como caso, con permiso del cliente. */
  publico?: boolean;
  resumen?: string;
  testimonio?: { texto: string; autor: string; logo?: string };
  descripcion?: string;
}

interface EstadoArchivo {
  pedido: { id: string; cliente: string; descripcion?: string };
  caso?: { publico: boolean; resumen?: string; testimonio?: { texto: string; autor: string; logo?: string } };
  plan: { fases: number[]; tareas: string[] };
  tareas: Record<string, string>;
  estado: string;
  notasCliente?: { fecha: string; texto: string; quien: string; tareas: string[] }[];
  papelera?: { fecha: string };
}

export interface EntregaArchivo {
  tarea: string;
  agente: string;
  titulo: string;
  dice: string;
  necesita: string;
  nota?: number;
  modo: string;
  version: number;
  contenido: string;
}

export function leerEntrega(id: string, tarea: string): EntregaArchivo | undefined {
  const ruta = join(RAIZ, id, "entregas", `${tarea.replace(".", "-")}.md`);
  if (!existsSync(ruta)) return undefined;
  const m = readFileSync(ruta, "utf8").match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!m) return undefined;
  const datos: Record<string, unknown> = {};
  for (const l of m[1].split("\n")) {
    const i = l.indexOf(": ");
    if (i > 0) datos[l.slice(0, i)] = JSON.parse(l.slice(i + 2));
  }
  return { ...(datos as Omit<EntregaArchivo, "contenido">), contenido: m[2] };
}

const ESTADO: Record<string, Estado> = { lista: "listo", "en-curso": "en-curso", rehacer: "en-curso", "por-empezar": "por-empezar" };

function leerCliente(id: string): VistaProyecto | undefined {
  const ruta = join(RAIZ, id, "estado.json");
  if (!existsSync(ruta)) return undefined;
  const p = JSON.parse(readFileSync(ruta, "utf8")) as EstadoArchivo;
  // Lo que está en la papelera no sale en ningún lado.
  if (p.papelera) return undefined;
  const mensajes: VistaProyecto["mensajes"] = {};
  for (const t of p.plan.tareas) {
    // En la web pública no salen precios internos, la nota del jurado ni ventas.
    if (!local() && contratoPorId(t as TareaId)?.interna) continue;
    const [f, agente] = t.split(".");
    const e = leerEntrega(id, t);
    (mensajes[Number(f)] ??= {})[agente] = {
      estado: ESTADO[p.tareas[t]] ?? "por-empezar",
      dice: e?.dice ?? "Todavía no empieza.",
      necesita: e?.necesita ?? "—",
      entrega: e?.titulo ?? "",
      tarea: t,
      modo: e?.modo,
    };
  }
  const cliente = (p.notasCliente ?? []).map((n) => ({ fecha: n.fecha.slice(0, 10), texto: n.texto, quien: n.quien, agentes: n.tareas.map((t) => t.split(".")[1]) }));
  return { id, nombre: p.pedido.cliente, fases: p.plan.fases, mensajes, nota: local() ? leerEntrega(id, "6.trofeo")?.nota : undefined, estado: p.estado, cliente, publico: !!p.caso?.publico, resumen: p.caso?.resumen, testimonio: p.caso?.publico ? p.caso.testimonio : undefined, descripcion: p.pedido.descripcion };
}

/**
 * Proyectos para la sala. En la web pública solo salen los publicados con permiso del cliente;
 * en local (estudio) salen todos.
 */
export function listarProyectos(): VistaProyecto[] {
  const agencia: VistaProyecto = { id: "agencia", nombre: PROYECTO.nombre, fases: [1, 2, 3, 4, 5, 6, 7], mensajes: PROYECTO.mensajes };
  if (!existsSync(RAIZ)) return [agencia];
  const clientes = readdirSync(RAIZ)
    .map(leerCliente)
    .filter((p): p is VistaProyecto => !!p)
    .filter((p) => p.publico || local());
  return [agencia, ...clientes];
}

export function rutasDeEntregas() {
  return listarProyectos()
    .filter((p) => p.id !== "agencia")
    .flatMap((p) => Object.values(p.mensajes).flatMap((m) => Object.values(m)).filter((m) => m.tarea && leerEntrega(p.id, m.tarea)).map((m) => ({ proyecto: p.id, tarea: m.tarea!.replace(".", "-") })));
}

/** Casos publicados con permiso del cliente. */
export const casosPublicos = () => listarProyectos().filter((p) => p.id !== "agencia" && p.publico);

/** Testimonios reales: solo de casos públicos, tal como los dio el cliente. */
export const testimonios = () =>
  casosPublicos()
    .filter((c) => c.testimonio)
    .map((c) => ({ ...c.testimonio!, caso: c.id, cliente: c.nombre }));
