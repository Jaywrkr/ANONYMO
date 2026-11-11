// Cambia el estado, las notas o el mensaje de un negocio (sistema/66).
import { aplicarCambio, cambiarProspectos, ESTADOS_PROSPECTO, type CambioProspecto, type EstadoProspecto } from "@anonymo/pipeline";
import { mal, permiso, vistaProspecto } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await permiso();
  if (p.error) return p.error;
  const { id } = await params;
  let c: Record<string, unknown>;
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const cambio: CambioProspecto = {};
  if (typeof c.estado === "string") {
    if (!(c.estado in ESTADOS_PROSPECTO)) return mal("Ese estado no existe.");
    cambio.estado = c.estado as EstadoProspecto;
  }
  if (typeof c.notas === "string") cambio.notas = c.notas;
  if (typeof c.mensaje === "string" || c.mensaje === null) cambio.mensaje = c.mensaje as string | null;
  try {
    const { lista, valor: x } = await cambiarProspectos((l) => {
      const x = l.prospectos[id];
      if (x) aplicarCambio(x, cambio, p.yo!);
      return x;
    });
    if (!x) return mal("No encontramos ese negocio. Recarga la página.", 404);
    return Response.json({ prospecto: vistaProspecto(x, lista.firma, await baseUrl()) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
