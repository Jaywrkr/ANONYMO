// Una imagen del arte de un mes (sistema/107): solo para Jay y Luna.
import { leerArte } from "@anonymo/pipeline";
import { permisoMes } from "@/lib/contenido";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; archivo: string }> }) {
  const { id, archivo } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  const d = await leerArte(id, archivo);
  if (!d) return new Response(null, { status: 404 });
  return new Response(Buffer.from(d), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300" } });
}
