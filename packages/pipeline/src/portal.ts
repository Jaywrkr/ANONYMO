// Portal del cliente: un enlace privado para ver su proyecto, aprobar fases y comentar.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { bitacora, guardarProyecto, leerProyecto } from "./almacen.ts";

/** Crea (o devuelve) el token del portal. Con nuevo=true lo cambia: el enlace anterior deja de servir. */
export function tokenPortal(id: string, nuevo = false): string {
  const p = leerProyecto(id);
  if (p.portal && !nuevo) return p.portal.token;
  p.portal = { token: randomBytes(18).toString("base64url"), creado: new Date().toISOString() };
  guardarProyecto(p);
  bitacora(id, nuevo ? "Enlace del portal cambiado: el anterior ya no sirve." : "Enlace del portal creado.");
  return p.portal.token;
}

/** ¿El token es el del proyecto? Comparación en tiempo constante. */
export function tokenValido(id: string, token: string | undefined): boolean {
  if (!token) return false;
  try {
    const real = leerProyecto(id).portal?.token;
    if (!real || real.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(real), Buffer.from(token));
  } catch {
    return false;
  }
}

/** El cliente deja un comentario: queda pendiente hasta que Jay o Luna lo manden al equipo desde el estudio. */
export function comentarioPortal(id: string, texto: string) {
  const limpio = texto.trim().slice(0, 2000);
  if (!limpio) throw new Error("El comentario está vacío.");
  const p = leerProyecto(id);
  p.pendientesCliente = [...(p.pendientesCliente ?? []), { fecha: new Date().toISOString(), texto: limpio }];
  guardarProyecto(p);
  bitacora(id, `El cliente comentó desde su portal: "${limpio.slice(0, 120)}"`);
}
