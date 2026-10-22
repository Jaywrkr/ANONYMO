// Lee los proyectos de clientes que deja el pipeline en proyectos/<id>/. Solo en el servidor, al compilar.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROYECTO, type Estado, type Mensaje } from "./proyecto";

const RAIZ = join(process.cwd(), "../../proyectos");

/** Lo que necesita la sala: el mismo formato para la agencia y para cada cliente. */
export interface VistaProyecto {
  id: string;
  nombre: string;
  /** Fases que entran en el plan. */
  fases: number[];
  mensajes: Record<number, Record<string, Mensaje & { tarea?: string; modo?: string }>>;
  nota?: number;
  estado?: string;
}

interface EstadoArchivo {
  pedido: { id: string; cliente: string };
  plan: { fases: number[]; tareas: string[] };
  tareas: Record<string, string>;
  estado: string;
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
  const mensajes: VistaProyecto["mensajes"] = {};
  for (const t of p.plan.tareas) {
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
  return { id, nombre: p.pedido.cliente, fases: p.plan.fases, mensajes, nota: leerEntrega(id, "6.trofeo")?.nota, estado: p.estado };
}

export function listarProyectos(): VistaProyecto[] {
  const agencia: VistaProyecto = { id: "agencia", nombre: PROYECTO.nombre, fases: [1, 2, 3, 4, 5, 6, 7], mensajes: PROYECTO.mensajes };
  if (!existsSync(RAIZ)) return [agencia];
  const clientes = readdirSync(RAIZ)
    .map(leerCliente)
    .filter((p): p is VistaProyecto => !!p);
  return [agencia, ...clientes];
}

export function rutasDeEntregas() {
  return listarProyectos()
    .filter((p) => p.id !== "agencia")
    .flatMap((p) => Object.values(p.mensajes).flatMap((m) => Object.values(m)).filter((m) => m.tarea && leerEntrega(p.id, m.tarea)).map((m) => ({ proyecto: p.id, tarea: m.tarea!.replace(".", "-") })));
}
