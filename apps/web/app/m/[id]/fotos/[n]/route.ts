// Las fotos que el negocio pone en su muestra (sistema/82).
// POST: el negocio sube una (ya achicada a JPEG en su navegador). GET: la muestra la enseña. Viven en la nube privada, no en Vercel.
import { anotarError, nombreDe, anotarFoto, buscarPorMuestra, cambiarProspectos, fotoValida, FOTO_BYTES_MAX, FOTOS_MAX, idMuestraValido, leerProspectos, leerSuelto, rutaFoto, subirSuelto } from "@anonymo/pipeline";
import { portalActivo } from "@/lib/estudio";
import { avisarCelulares } from "@/lib/avisos-celular";
import { BOT, frenar } from "@/lib/freno";

export const dynamic = "force-dynamic";

const mal = (error: string, status = 400) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
const numero = (n: string) => (/^[1-9]$/.test(n) && Number(n) <= FOTOS_MAX ? Number(n) : 0);

export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const k = numero(n);
  if (!portalActivo() || !idMuestraValido(id) || !k) return new Response(null, { status: 404 });
  try {
    const p = buscarPorMuestra((await leerProspectos()).prospectos, id);
    if (!p || p.estado === "descartado" || (p.fotos ?? 0) < k) return new Response(null, { status: 404 });
    const b = await leerSuelto(rutaFoto(id, k));
    if (!b) return new Response(null, { status: 404 });
    return new Response(b as unknown as BodyInit, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300", "x-robots-tag": "noindex" } });
  } catch { return new Response(null, { status: 502 }); }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const k = numero(n);
  if (!portalActivo() || !idMuestraValido(id) || !k) return mal("No encontramos esta muestra.", 404);
  const quien = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (BOT.test(req.headers.get("user-agent") ?? "") || frenar(`f:${id}`, 9) || frenar(`fip:${quien}`, 20)) return mal("Demasiados intentos seguidos. Espera un minuto y vuelve a probar.", 429);
  if (Number(req.headers.get("content-length") ?? 0) > FOTO_BYTES_MAX) return mal("La foto pesa demasiado. Prueba con otra.", 413);
  const total = numero(new URL(req.url).searchParams.get("de") ?? "") || undefined;
  const b = new Uint8Array(await req.arrayBuffer());
  if (!fotoValida(b)) return mal("No pudimos leer esa foto. Prueba con otra.");
  try {
    const existe = buscarPorMuestra((await leerProspectos()).prospectos, id);
    if (!existe || existe.estado === "descartado") return mal("No encontramos esta muestra.", 404);
    await subirSuelto(rutaFoto(id, k), b, "image/jpeg");
    const { valor } = await cambiarProspectos((l) => {
      const p = buscarPorMuestra(l.prospectos, id);
      return p ? { ...anotarFoto(p, k, total), nombre: nombreDe(p) } : undefined;
    });
    if (valor?.avisar) await avisarCelulares({ titulo: `${valor.nombre} subió sus fotos`, texto: "Está armando su muestra con sus propias fotos. Buen momento para escribirle.", url: "/estudio/clientes/tanda" });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    await anotarError("Fotos de la muestra", (e as Error).message);
    return mal("No se pudo guardar la foto. Vuelve a intentar en un momento.", 502);
  }
}
