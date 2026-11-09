// Guarda la edición (sistema/62): cortes a mano, silencios, muletillas, subtítulos y audio.
import { cambiarVideo, edicionSegura } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  let c: { edicion?: unknown; nombre?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  try {
    const t = await cambiarVideo(id, (t) => {
      if (c.edicion !== undefined) t.edicion = edicionSegura(c.edicion, t.edicion);
      if (typeof c.nombre === "string" && c.nombre.trim()) t.nombre = c.nombre.trim().slice(0, 120);
    });
    return Response.json({ ok: true, actualizado: t.actualizado });
  } catch (e) {
    return mal((e as Error).message);
  }
}
