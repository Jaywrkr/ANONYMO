// Crea un kit de marca (sistema/65): nombre y colores. El logo y la música se suben después.
import { datosKit, guardarKit, nuevoIdKit, type KitMarca } from "@anonymo/pipeline";
import { kitParaVista, mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  try {
    const d = datosKit(await req.json());
    const k: KitMarca = { id: nuevoIdKit(d.nombre), ...d, actualizado: "" };
    await guardarKit(k);
    return Response.json({ kit: kitParaVista(k) });
  } catch (e) {
    return mal((e as Error).message);
  }
}
