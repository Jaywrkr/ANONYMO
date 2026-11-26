// Las láminas dibujadas de las piezas de Faro (sistema/123). Solo con sesión.
import { ARCHIVO_ARTE, MES_PIEZAS, leerArte } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  if (!(await quienEsta())) return new Response("Sin sesión.", { status: 403 });
  const { archivo } = await params;
  if (!ARCHIVO_ARTE.test(archivo)) return new Response("No existe.", { status: 404 });
  const d = await leerArte(MES_PIEZAS, archivo).catch(() => undefined);
  if (!d) return new Response("No existe.", { status: 404 });
  return new Response(Buffer.from(d), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400, immutable" } });
}
