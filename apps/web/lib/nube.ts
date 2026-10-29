// El estudio en línea trabaja contra la nube privada (Supabase): antes de leer, baja el proyecto al disco temporal;
// después de cambiarlo, lo vuelve a subir. En tu máquina (sin nube activa) no hace nada: todo queda en proyectos/.
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { bajarProyecto, CARPETA_BASE, carpeta, enCarpeta, espejarProyecto, huellaProyecto, subirDistintos, leerRemoto, listar, listarPapelera, nubeActiva, proyectosEnNube, type Proyecto } from "@anonymo/pipeline";

/** Bajadas en curso por carpeta y proyecto: dos páginas que piden lo mismo a la vez esperan la misma bajada. */
const enCurso = new Map<string, Promise<unknown>>();

/** Baja estos proyectos (copia idéntica a la nube). */
export async function traer(...ids: string[]) {
  if (!nubeActiva()) return;
  await Promise.all([...new Set(ids.filter(Boolean))].map((id) => {
    const clave = `${carpeta()}::${id}`;
    const ya = enCurso.get(clave);
    if (ya) return ya;
    const p = bajarProyecto(id, fetch, true).finally(() => enCurso.delete(clave));
    enCurso.set(clave, p);
    return p;
  }));
}

/**
 * Corre `fn` con su propia copia de los proyectos (sistema/37). En línea, varios pedidos comparten el disco:
 * así una acción o una vuelta de trabajo no pisa ni es pisada por otra página que baja el mismo proyecto.
 */
export async function aislado<T>(fn: () => Promise<T>): Promise<T> {
  if (!nubeActiva()) return fn();
  const dir = join(CARPETA_BASE, ".privadas", randomUUID());
  try {
    return await enCarpeta(dir, fn);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Baja todos los proyectos y las solicitudes (no la analítica: tiene su propia página). */
export async function traerTodo() {
  if (!nubeActiva()) return;
  await traer(...(await proyectosEnNube()).filter((id) => id !== "_analitica" && id !== "_subidas"), "_solicitudes");
}

/** Sube estos proyectos tal como quedaron. */
export async function llevar(...ids: string[]) {
  if (!nubeActiva()) return;
  for (const id of new Set(ids.filter(Boolean))) await espejarProyecto(id);
}

/** Baja, hace el cambio y sube, aunque el cambio falle a la mitad (lo que alcanzó a guardar no se pierde). */
export async function conNube<T>(ids: string[], fn: () => Promise<T> | T): Promise<T> {
  return aislado(async () => {
    await traer(...ids);
    // Solo se sube lo que cambió la acción, comparando el contenido (sistema/43): sin volver a subir
    // todas las fotos en cada clic y sin depender de la hora de los archivos.
    const unicos = [...new Set(ids.filter(Boolean))];
    const antes = new Map(unicos.map((id) => [id, nubeActiva() ? huellaProyecto(id) : new Map<string, string>()]));
    try {
      return await fn();
    } finally {
      if (nubeActiva()) for (const id of unicos) await subirDistintos(id, antes.get(id)!);
    }
  });
}

/**
 * Solo el estado de cada proyecto, sin tocar el disco (sistema/32): lo usa la barra lateral en cada página.
 * En línea lo lee directo de la nube; en tu máquina, de proyectos/. Incluye los de la papelera.
 */
export async function resumenProyectos(): Promise<Proyecto[]> {
  if (!nubeActiva()) return [...listar(), ...listarPapelera().map((x) => x.p)];
  const ids = (await proyectosEnNube()).filter((id) => !id.startsWith("_"));
  const todos = await Promise.all(ids.map(async (id) => {
    try {
      const t = await leerRemoto(id, "estado.json");
      return t ? (JSON.parse(t) as Proyecto) : undefined;
    } catch {
      return undefined;
    }
  }));
  return todos.filter((p): p is Proyecto => !!p);
}
