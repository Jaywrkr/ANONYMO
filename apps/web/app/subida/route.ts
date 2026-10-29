import { randomUUID } from "node:crypto";
import { firmarSubida, limpiarNombre, nubeActiva, tokenValido, validarSubida } from "@anonymo/pipeline";
import { portalActivo, quienEsta } from "@/lib/estudio";
import { traer } from "@/lib/nube";

export const dynamic = "force-dynamic";

// Subida directa a la nube (sistema/35): Vercel no deja pasar más de ~4,5 MB por pedido,
// así que el navegador pide aquí una URL firmada y sube el archivo directo a la nube privada.
// Solo Jay y Luna (con sesión) o un cliente con el enlace de su portal.
export async function POST(req: Request) {
  if (!nubeActiva()) return Response.json({ local: true });
  let cuerpo: { nombre?: string; bytes?: number; proyecto?: string; t?: string };
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "Pedido no válido." }, { status: 400 }); }
  const { nombre = "", bytes = 0, proyecto = "", t = "" } = cuerpo;
  let permitido = !!(await quienEsta());
  if (!permitido && proyecto && t && portalActivo() && /^[a-z0-9-]+$/.test(proyecto)) {
    try { await traer(proyecto); permitido = tokenValido(proyecto, t); } catch {}
  }
  if (!permitido) return Response.json({ error: "Sin permiso." }, { status: 403 });
  const limpio = limpiarNombre(String(nombre));
  try {
    validarSubida(limpio, Number(bytes));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const clave = `${randomUUID()}/${limpio}`;
  try {
    return Response.json({ clave, url: await firmarSubida(clave) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
