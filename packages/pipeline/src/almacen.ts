// Guarda y lee proyectos como archivos en proyectos/<id>/ (prototipo).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHIVOS, archivoEntrega, type Entrega, type Pedido, type Plan, type Proyecto, type TareaId } from "./tipos.ts";

/** Raíz del repo: se busca hacia arriba desde donde se corre (sirve igual desde la terminal y desde la web). */
function buscarRaiz(): string {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkg = join(d, "package.json");
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).name === "anonymo") return d;
    d = dirname(d);
  }
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}
export const RAIZ = buscarRaiz();
/**
 * Dónde viven los proyectos. En tu máquina: proyectos/ (ignorado por git).
 * En Vercel el disco es de solo lectura salvo /tmp: ahí se copia cada proyecto desde la nube privada mientras se usa.
 */
export const CARPETA = process.env.ANONYMO_PROYECTOS ?? (process.env.VERCEL ? "/tmp/anonymo-proyectos" : join(RAIZ, "proyectos"));

const dir = (id: string) => join(CARPETA, id);
const json = (ruta: string) => JSON.parse(readFileSync(ruta, "utf8"));
const guardar = (ruta: string, dato: unknown) => {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(dato, null, 2) + "\n");
};

export const existe = (id: string) => existsSync(join(dir(id), ARCHIVOS.estado));

/** Proyectos activos (sin los de la papelera). */
export function listar(): Proyecto[] {
  return todos().filter((p) => !p.papelera);
}

function todos(): Proyecto[] {
  if (!existsSync(CARPETA)) return [];
  return readdirSync(CARPETA).filter(existe).map(leerProyecto);
}

/** Días que un proyecto queda en la papelera antes de borrarse solo. */
export const DIAS_PAPELERA = 30;

/** Lo que hay en la papelera, lo más reciente primero, con los días que le quedan. */
export function listarPapelera(ahora = Date.now()) {
  return todos()
    .filter((p) => p.papelera)
    .map((p) => ({ p, quedan: Math.max(0, DIAS_PAPELERA - Math.floor((ahora - Date.parse(p.papelera!.fecha)) / 86400_000)) }))
    .sort((a, b) => b.p.papelera!.fecha.localeCompare(a.p.papelera!.fecha));
}

export function mandarAPapelera(id: string, quien: "jay" | "luna") {
  const p = leerProyecto(id);
  if (p.papelera) return p;
  p.papelera = { fecha: new Date().toISOString(), quien };
  guardarProyecto(p);
  bitacora(id, `${quien === "luna" ? "Luna" : "Jay"} lo mandó a la papelera.`);
  return p;
}

export function sacarDePapelera(id: string, quien: "jay" | "luna") {
  const p = leerProyecto(id);
  if (!p.papelera) return p;
  delete p.papelera;
  guardarProyecto(p);
  bitacora(id, `${quien === "luna" ? "Luna" : "Jay"} lo sacó de la papelera.`);
  return p;
}

/** Crea el proyecto. Con estado "plan", espera que Jay o Luna digan «que empiecen» (sistema/23). */
export function crear(pedido: Pedido, plan: Plan, estado: Proyecto["estado"] = "en-curso"): Proyecto {
  if (existe(pedido.id)) throw new Error(`Ya existe un proyecto "${pedido.id}".`);
  guardar(join(dir(pedido.id), ARCHIVOS.pedido), pedido);
  guardar(join(dir(pedido.id), ARCHIVOS.plan), plan);
  const p: Proyecto = {
    pedido,
    plan,
    faseActual: plan.fases[0],
    estado,
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

/** Reescribe el pedido (cuando Atlas lo vuelve a leer con un ajuste). */
export function guardarPedido(pedido: Pedido) {
  guardar(join(dir(pedido.id), ARCHIVOS.pedido), pedido);
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
  // Antes de pisar la versión anterior, se guarda en el historial.
  const previa = leerEntrega(id, e.tarea);
  if (previa && previa.version !== e.version) {
    const h = join(dir(id), ARCHIVOS.entregas, "historial", archivoEntrega(e.tarea).replace(".md", `.v${previa.version}.md`));
    mkdirSync(dirname(h), { recursive: true });
    writeFileSync(h, readFileSync(ruta, "utf8"));
  }
  writeFileSync(ruta, `---\n${cabeza}\n---\n\n${contenido.trim()}\n`);
}

/** Versiones guardadas de una entrega (las anteriores a la actual), de la más nueva a la más vieja. */
export function versiones(id: string, tarea: TareaId): number[] {
  const h = join(dir(id), ARCHIVOS.entregas, "historial");
  if (!existsSync(h)) return [];
  const base = archivoEntrega(tarea).replace(".md", "");
  return readdirSync(h)
    .map((f) => f.match(new RegExp(`^${base}\\.v(\\d+)\\.md$`))?.[1])
    .filter((v): v is string => !!v)
    .map(Number)
    .sort((a, b) => b - a);
}

/** Una entrega tal como estaba en una versión. Sin versión: la actual. */
export function leerEntrega(id: string, tarea: TareaId, version?: number): Entrega | undefined {
  const ruta = version
    ? join(dir(id), ARCHIVOS.entregas, "historial", archivoEntrega(tarea).replace(".md", `.v${version}.md`))
    : join(dir(id), ARCHIVOS.entregas, archivoEntrega(tarea));
  if (version && !existsSync(ruta)) {
    const actual = leerEntrega(id, tarea);
    return actual?.version === version ? actual : undefined;
  }
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

/** Últimas líneas de la bitácora, de la más nueva a la más vieja. */
export function leerBitacora(id: string, cuantas = 20): string[] {
  const ruta = join(dir(id), ARCHIVOS.bitacora);
  if (!existsSync(ruta)) return [];
  return readFileSync(ruta, "utf8").trim().split("\n").map((l) => l.replace(/^- /, "")).reverse().slice(0, cuantas);
}

/** Borra el proyecto de esta máquina (o del disco temporal en línea). No se puede deshacer. */
export function borrarProyecto(id: string) {
  if (!/^[a-z0-9_][a-z0-9_-]{0,80}$/i.test(id) || id.startsWith("_")) throw new Error("Nombre de proyecto no válido.");
  rmSync(dir(id), { recursive: true, force: true });
}
