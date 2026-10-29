import { quienEsta } from "@/lib/estudio";
import { pendientes } from "@/lib/pendientes";

export const dynamic = "force-dynamic";

// Lo pendiente, liviano (sistema/36): el vigía del estudio lo consulta para avisar apenas algo necesita tu decisión.
export async function GET() {
  const yo = await quienEsta();
  if (!yo) return new Response(null, { status: 404 });
  const { avisos } = await pendientes(yo);
  return Response.json({ avisos }, { headers: { "cache-control": "no-store" } });
}
