// Miniaturas privadas del banco (sistema/55): solo para Jay y Luna, solo para medir. Nunca públicas.
import { bytesCaptura } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ archivo: string }> }) {
  if (!(await quienEsta())) return new Response(null, { status: 404 });
  const { archivo } = await params;
  const b = await bytesCaptura(archivo).catch(() => undefined);
  if (!b) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(b), { headers: { "content-type": archivo.endsWith(".png") ? "image/png" : "image/jpeg", "cache-control": "private, max-age=3600", "x-robots-tag": "noindex" } });
}
