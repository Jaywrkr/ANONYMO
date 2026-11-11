// La firma de los mensajes (sistema/66). Se guarda con la lista: Jay y Luna ven la misma.
import { cambiarProspectos, numeroInternacional } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { firma?: unknown; numero?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const firma = c.firma === undefined ? undefined : String(c.firma).trim().slice(0, 120);
  if (firma === "") return mal("La firma no puede quedar vacía.");
  // El WhatsApp de ANONYMO (sistema/72): quien toca «Quiero esta web» en su muestra escribe aquí.
  const numero = c.numero === undefined ? undefined : String(c.numero).trim();
  if (numero && !numeroInternacional(numero)) return mal("Ese número no parece válido. Escríbelo como 099 123 4567.");
  try {
    const { lista } = await cambiarProspectos((l) => {
      if (firma !== undefined) l.firma = firma;
      if (numero !== undefined) l.numero = numero || undefined;
    });
    return Response.json(vistaLista(lista, await baseUrl()), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
