// Cambia el estado, las notas o el mensaje de un negocio (sistema/66).
import { aplicarCambio, cambiarProspectos, ESTADOS_PROSPECTO, PRECIO_MAX, PRECIO_MIN, precioValido, type CambioProspecto, type EstadoProspecto } from "@anonymo/pipeline";
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
  if (c.seguimiento === true) cambio.seguimiento = true;
  if (typeof c.precio === "number" || c.precio === null) {
    if (c.precio !== null && !precioValido(c.precio)) return mal(`El precio va entre ${PRECIO_MIN} y ${PRECIO_MAX} dólares, sin centavos.`);
    cambio.precio = c.precio as number | null;
  }
  if (c.quitarFotos === true) cambio.quitarFotos = true;
  if (c.plantilla === "sereno" || c.plantilla === "grafico") cambio.plantilla = c.plantilla;
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
