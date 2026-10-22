// Guarda y lee proyectos como archivos en proyectos/<id>/ (prototipo).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHIVOS, archivoEntrega, type Entrega, type Pedido, type Plan, type Proyecto, type TareaId } from "./tipos.ts";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const CARPETA = process.env.ANONYMO_PROYECTOS ?? join(RAIZ, "proyectos");

const dir = (id: string) => join(CARPETA, id);
const json = (ruta: string) => JSON.parse(readFileSync(ruta, "utf8"));
const guardar = (ruta: string, dato: unknown) => {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(dato, null, 2) + "\n");
};

export const existe = (id: string) => existsSync(join(dir(id), ARCHIVOS.estado));

export function listar(): Proyecto[] {
  if (!existsSync(CARPETA)) return [];
  return readdirSync(CARPETA).filter(existe).map(leerProyecto);
}

export function crear(pedido: Pedido, plan: Plan): Proyecto {
  if (existe(pedido.id)) throw new Error(`Ya existe un proyecto "${pedido.id}".`);
  guardar(join(dir(pedido.id), ARCHIVOS.pedido), pedido);
  guardar(join(dir(pedido.id), ARCHIVOS.plan), plan);
  const p: Proyecto = {
    pedido,
    plan,
    faseActual: plan.fases[0],
    estado: "en-curso",
    tareas: Object.fromEntries(plan.tareas.map((t) => [t, "por-empezar"])) as Proyecto["tareas"],
    puertas: [],
    cambios: {},
    actualizado: new Date().toISOString(),
  };
  guardarProyecto(p);
  return p;
}

export function leerProyecto(id: string): Proyecto {
  if (!existe(id)) throw new Error(`No hay proyecto "${id}". Mira la lista con: pipeline lista`);
  return json(join(dir(id), ARCHIVOS.estado));
}

export function guardarProyecto(p: Proyecto) {
  p.actualizado = new Date().toISOString();
  guardar(join(dir(p.pedido.id), ARCHIVOS.estado), p);
  guardar(join(dir(p.pedido.id), ARCHIVOS.plan), p.plan);
}

export function bitacora(id: string, linea: string) {
  const hora = new Date().toISOString().replace("T", " ").slice(0, 16);
  mkdirSync(dir(id), { recursive: true });
  appendFileSync(join(dir(id), ARCHIVOS.bitacora), `- ${hora} · ${linea}\n`);
}

/** Entrega en markdown con frontmatter: los datos arriba, el contenido abajo. */
export function guardarEntrega(id: string, e: Entrega) {
  const { contenido, ...datos } = e;
  const cabeza = Object.entries(datos).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  const ruta = join(dir(id), ARCHIVOS.entregas, archivoEntrega(e.tarea));
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, `---\n${cabeza}\n---\n\n${contenido.trim()}\n`);
}

export function leerEntrega(id: string, tarea: TareaId): Entrega | undefined {
  const ruta = join(dir(id), ARCHIVOS.entregas, archivoEntrega(tarea));
  if (!existsSync(ruta)) return undefined;
  const texto = readFileSync(ruta, "utf8");
  const m = texto.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!m) return undefined;
  const datos: Record<string, unknown> = {};
  for (const l of m[1].split("\n")) {
    const i = l.indexOf(": ");
    if (i > 0) datos[l.slice(0, i)] = JSON.parse(l.slice(i + 2));
  }
  return { ...(datos as Omit<Entrega, "contenido">), contenido: m[2] };
}
