// Cambia un kit de marca (sistema/65): nombre, colores, registrar el logo o la música recién subidos, o quitarlos.
import { datosKit, guardarKit, leerKit } from "@anonymo/pipeline";
import { kitParaVista, mal, permisoKit } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ kit: string }> }) {
  const { kit: id } = await params;
  const p = await permisoKit(id);
  if (p.error) return p.error;
  const k = await leerKit(id);
  if (!k) return mal("No encontramos esa marca.", 404);
  let c: { nombre?: unknown; color?: unknown; texto?: unknown; logo?: unknown; musica?: unknown; nombreMusica?: unknown; quitar?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  try {
    Object.assign(k, datosKit(c, k));
    if (typeof c.logo === "string" && /^logo\.(png|jpg|webp)$/.test(c.logo)) k.logo = c.logo;
    if (typeof c.musica === "string" && /^musica\.(mp3|m4a|wav|aac)$/.test(c.musica)) k.musica = { archivo: c.musica, nombre: typeof c.nombreMusica === "string" && c.nombreMusica.trim() ? c.nombreMusica.trim().replace(/\.[^.]+$/, "").slice(0, 80) : "Música de la marca" };
    if (c.quitar === "logo") k.logo = undefined;
    if (c.quitar === "musica") k.musica = undefined;
    await guardarKit(k);
    return Response.json({ kit: kitParaVista(k) });
  } catch (e) {
    return mal((e as Error).message);
  }
}
