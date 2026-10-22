// El estudio en línea trabaja contra la nube privada (Supabase): antes de leer, baja el proyecto al disco temporal;
// después de cambiarlo, lo vuelve a subir. En tu máquina (sin nube activa) no hace nada: todo queda en proyectos/.
import { bajarProyecto, espejarProyecto, nubeActiva, proyectosEnNube } from "@anonymo/pipeline";

/** Baja estos proyectos (copia idéntica a la nube). */
export async function traer(...ids: string[]) {
  if (!nubeActiva()) return;
  await Promise.all([...new Set(ids.filter(Boolean))].map((id) => bajarProyecto(id, fetch, true)));
}

/** Baja todos los proyectos y las solicitudes (no la analítica: tiene su propia página). */
export async function traerTodo() {
  if (!nubeActiva()) return;
  await traer(...(await proyectosEnNube()).filter((id) => id !== "_analitica"), "_solicitudes");
}

/** Sube estos proyectos tal como quedaron. */
export async function llevar(...ids: string[]) {
  if (!nubeActiva()) return;
  for (const id of new Set(ids.filter(Boolean))) await espejarProyecto(id);
}

/** Baja, hace el cambio y sube, aunque el cambio falle a la mitad (lo que alcanzó a guardar no se pierde). */
export async function conNube<T>(ids: string[], fn: () => Promise<T> | T): Promise<T> {
  await traer(...ids);
  try {
    return await fn();
  } finally {
    await llevar(...ids);
  }
}
