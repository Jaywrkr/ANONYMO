// Ayudas de las rutas del departamento de video (sistema/62).
import { idVideoValido } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

/** Respuesta de error en palabras simples. */
export const mal = (error: string, status = 400) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

/** Solo Jay y Luna, y solo un id de video bien formado. */
export async function permiso(id?: string) {
  const yo = await quienEsta();
  if (!yo) return { error: mal("Tu sesión terminó. Vuelve a entrar.", 403) };
  if (id !== undefined && !idVideoValido(id)) return { error: mal("No encontramos ese video.", 404) };
  return { yo };
}
