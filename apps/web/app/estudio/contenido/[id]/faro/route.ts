// Faro diseña una publicación del mes (sistema/127): crea (o devuelve) su pieza de Faro con la idea y el texto del
// calendario. Las vueltas de diseño las pide el navegador una por una en /estudio/contenido/faro/<id>.
import { leerMesContenido, ocultarClaves } from "@anonymo/pipeline";
import { mal, permisoMes } from "@/lib/contenido";
import { piezaFaroDelMes } from "@/lib/faro";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  const c = (await req.json().catch(() => ({}))) as { pieza?: unknown };
  if (typeof c.pieza !== "string") return mal("Pedido no válido.");
  try {
    const pieza = await piezaFaroDelMes(id, c.pieza, p.yo!);
    return Response.json({ pieza, mes: await leerMesContenido(id) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal(ocultarClaves((e as Error).message).slice(0, 240), 409);
  }
}
