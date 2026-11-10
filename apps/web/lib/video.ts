// Ayudas de las rutas del departamento de video (sistema/62).
import { idKitValido, idVideoValido, type KitMarca } from "@anonymo/pipeline";
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

/** Solo Jay y Luna, y solo un id de kit de marca bien formado (sistema/65). */
export async function permisoKit(id: string) {
  const yo = await quienEsta();
  if (!yo) return { error: mal("Tu sesión terminó. Vuelve a entrar.", 403) };
  if (!idKitValido(id)) return { error: mal("No encontramos esa marca.", 404) };
  return { yo };
}

/** Lo que el navegador necesita de un kit: sin rutas internas. */
export const kitParaVista = (k: KitMarca) => ({ id: k.id, actualizado: k.actualizado, nombre: k.nombre, color: k.color, texto: k.texto, logo: k.logo ? `/estudio/video/marcas/${k.id}/archivo/${k.logo}?v=${encodeURIComponent(k.actualizado)}` : undefined, musica: k.musica ? { nombre: k.musica.nombre, url: `/estudio/video/marcas/${k.id}/archivo/${k.musica.archivo}?v=${encodeURIComponent(k.actualizado)}` } : undefined });
export type KitVista = ReturnType<typeof kitParaVista>;
