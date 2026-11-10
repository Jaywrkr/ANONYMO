// Cómo va un video (sistema/62): la página lo consulta mientras un paso pesado trabaja.
import { estaOcupado, leerAvance, leerVideo } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  const [t, a] = await Promise.all([leerVideo(id), leerAvance(id)]);
  if (!t) return mal("No encontramos ese video.", 404);
  const ocupado = estaOcupado(t) ? { ...t.ocupado!, avance: a?.avance ?? t.ocupado!.avance ?? 0, texto: a?.texto || t.ocupado!.texto } : undefined;
  return Response.json({ estado: t.estado, ocupado, error: t.error, resultados: t.resultados, actualizado: t.actualizado }, { headers: { "cache-control": "no-store" } });
}
