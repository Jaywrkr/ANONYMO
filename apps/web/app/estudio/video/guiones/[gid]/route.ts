// Aprobar un guion de Faro (sistema/71): queda listo para grabar.
import { aprobarGuion, idGuionValido } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ gid: string }> }) {
  const p = await permiso();
  if (p.error) return p.error;
  const { gid } = await params;
  if (!idGuionValido(gid)) return mal("No encontramos ese guion.", 404);
  let c: { accion?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  if (c.accion !== "aprobar") return mal("Esa acción no existe.");
  try {
    return Response.json({ guion: await aprobarGuion(gid, p.yo!) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 404);
  }
}
