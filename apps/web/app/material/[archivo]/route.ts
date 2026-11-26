// Las capturas del material de un cliente (sistema/118). Su nombre no se adivina, así que se sirven sin sesión:
// la vista previa del arte (un iframe aislado) y el navegador que dibuja el arte las pueden cargar.
import { ARCHIVO_MATERIAL, leerMaterial } from "@anonymo/pipeline";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  if (!ARCHIVO_MATERIAL.test(archivo)) return new Response("No existe.", { status: 404 });
  const datos = await leerMaterial(archivo).catch(() => undefined);
  if (!datos) return new Response("No existe.", { status: 404 });
  return new Response(Buffer.from(datos), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400, immutable" } });
}
