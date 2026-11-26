// Qué es bueno, en imágenes (sistema/123): subir (una por vez, ya achicada en el navegador) o quitar.
import { createHash } from "node:crypto";
import { direccionVacia, guardarFicha, guardarMaterial, leerFichas } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const dynamic = "force-dynamic";
const mal = (error: string, status = 400) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

async function ficha(id: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(id)) return undefined;
  return (await leerFichas()).fichas[id];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await quienEsta();
  if (!yo) return mal("Tu sesión terminó. Vuelve a entrar.", 403);
  const { id } = await params;
  const f = await ficha(id);
  if (!f) return mal("No encontramos ese cliente.", 404);
  const datos = await req.formData().then((fd) => fd.get("imagen")).catch(() => null);
  if (!(datos instanceof Blob) || !datos.size) return mal("No llegó la imagen.");
  if (datos.size > 3_000_000) return mal("La imagen es muy pesada (máximo 3 MB).");
  const b = new Uint8Array(await datos.arrayBuffer());
  const png = b[0] === 0x89 && b[1] === 0x50, jpg = b[0] === 0xff && b[1] === 0xd8;
  if (!png && !jpg) return mal("Solo imágenes JPG o PNG.");
  const archivo = `${id.slice(0, 40)}-ref-${createHash("sha256").update(b).digest("hex").slice(0, 16)}.${png ? "png" : "jpg"}`;
  await guardarMaterial(archivo, b);
  const d = f.direccion ?? direccionVacia();
  const imagenes = [{ archivo, por: yo, subida: new Date().toISOString() }, ...(d.imagenes ?? []).filter((x) => x.archivo !== archivo)].slice(0, 24);
  await guardarFicha(id, { nombre: f.nombre, direccion: { ...d, imagenes, actualizada: new Date().toISOString() } }, yo);
  return Response.json({ archivo }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await quienEsta();
  if (!yo) return mal("Tu sesión terminó. Vuelve a entrar.", 403);
  const { id } = await params;
  const f = await ficha(id);
  if (!f?.direccion) return mal("No encontramos ese cliente.", 404);
  const { archivo } = (await req.json().catch(() => ({}))) as { archivo?: string };
  await guardarFicha(id, { nombre: f.nombre, direccion: { ...f.direccion, imagenes: (f.direccion.imagenes ?? []).filter((x) => x.archivo !== archivo), actualizada: new Date().toISOString() } }, yo);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
