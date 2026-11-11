// La firma de los mensajes (sistema/66). Se guarda con la lista: Jay y Luna ven la misma.
import { cambiarProspectos } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { firma?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const firma = String(c.firma ?? "").trim().slice(0, 120);
  if (!firma) return mal("La firma no puede quedar vacía.");
  try {
    const { lista } = await cambiarProspectos((l) => { l.firma = firma; });
    return Response.json(vistaLista(lista), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
