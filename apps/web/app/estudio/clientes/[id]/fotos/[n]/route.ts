// El estudio le pone fotos a la muestra de un negocio (sistema/87): las de su Instagram o su local, para mandarle
// una muestra más cuidada. No cuenta como señal del negocio: no suena el celular ni dice «subió sus fotos».
import { anotarFoto, cambiarProspectos, fotoValida, FOTO_BYTES_MAX, FOTOS_MAX, idMuestra, leerProspectos, rutaFoto, subirSuelto } from "@anonymo/pipeline";
import { mal, permiso, vistaProspecto } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";

export const dynamic = "force-dynamic";

const numero = (n: string) => (/^[1-9]$/.test(n) && Number(n) <= FOTOS_MAX ? Number(n) : 0);

export async function POST(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const p = await permiso();
  if (p.error) return p.error;
  const { id, n } = await params;
  const k = numero(n);
  if (!k) return mal(`Una muestra lleva hasta ${FOTOS_MAX} fotos.`);
  if (Number(req.headers.get("content-length") ?? 0) > FOTO_BYTES_MAX) return mal("La foto pesa demasiado. Prueba con otra.", 413);
  const total = numero(new URL(req.url).searchParams.get("de") ?? "") || undefined;
  const b = new Uint8Array(await req.arrayBuffer());
  if (!fotoValida(b)) return mal("No pudimos leer esa foto. Prueba con otra.");
  try {
    const existe = (await leerProspectos()).prospectos[id];
    if (!existe) return mal("No encontramos ese negocio. Recarga la página.", 404);
    await subirSuelto(rutaFoto(idMuestra(existe), k), b, "image/jpeg");
    const { lista, valor: x } = await cambiarProspectos((l) => {
      const x = l.prospectos[id];
      if (x) anotarFoto(x, k, total, new Date(), p.yo!);
      return x;
    });
    if (!x) return mal("No encontramos ese negocio. Recarga la página.", 404);
    return Response.json({ prospecto: vistaProspecto(x, lista.firma, await baseUrl()) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
