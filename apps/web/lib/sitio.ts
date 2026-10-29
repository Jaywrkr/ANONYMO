// Enlaces firmados a la vista previa de la web (sistema/42): la vista previa corre aislada del estudio
// (sin cookies ni acceso a la sesión) y cada versión tiene su propia firma.
import { createHmac, timingSafeEqual } from "node:crypto";

export const firmaSitio = (id: string, v: number) =>
  createHmac("sha256", process.env.ESTUDIO_SECRETO ?? "anonymo-local").update(`sitio:${id}:${v}`).digest("hex").slice(0, 32);

export function firmaSitioValida(id: string, v: number, firma: string) {
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaSitio(id, v));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** La dirección de una página de la web en una versión. */
export const urlSitio = (id: string, v: number, ruta = "index.html") => `/sitio/${id}/${v}/${firmaSitio(id, v)}/${ruta}`;
