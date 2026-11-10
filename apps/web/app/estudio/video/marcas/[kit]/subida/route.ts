// Prepara la subida del logo o la música de una marca (sistema/65). En línea, el navegador sube directo a la nube.
import { leerKit, urlSubidaKit, validarArchivoKit } from "@anonymo/pipeline";
import { mal, permisoKit } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ kit: string }> }) {
  const { kit: id } = await params;
  const p = await permisoKit(id);
  if (p.error) return p.error;
  if (!(await leerKit(id))) return mal("No encontramos esa marca.", 404);
  let c: { tipo?: unknown; nombre?: unknown; bytes?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  if (c.tipo !== "logo" && c.tipo !== "musica") return mal("Pedido no válido.");
  try {
    const archivo = validarArchivoKit(c.tipo, String(c.nombre ?? ""), Number(c.bytes));
    return Response.json({ archivo, url: await urlSubidaKit(id, archivo) });
  } catch (e) {
    return mal((e as Error).message);
  }
}
