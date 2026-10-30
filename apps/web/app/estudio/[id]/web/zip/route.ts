import { readFileSync } from "node:fs";
import { zipSync } from "fflate";
import { archivosSitio, existe, leerArchivoSitio, listarArchivos, rutaArchivo, versionesSitio } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import { traer } from "@/lib/nube";

export const dynamic = "force-dynamic";

// La web en un .zip (sistema/42): los archivos de la versión y las imágenes del cliente en img/.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await quienEsta())) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });
  await traer(id);
  if (!existe(id)) return new Response(null, { status: 404 });
  const v = Number(new URL(req.url).searchParams.get("v")) || versionesSitio(id)[0];
  if (!v) return new Response("Todavía no hay web.", { status: 404 });
  const zip: Record<string, Uint8Array> = {};
  for (const a of archivosSitio(id, v)) {
    const b = leerArchivoSitio(id, v, a.ruta);
    if (b) zip[a.ruta] = new Uint8Array(b);
  }
  for (const a of listarArchivos(id)) {
    const p = rutaArchivo(id, a.nombre);
    if (p && /^image\//.test(a.tipo) && !zip[`img/${a.nombre}`]) zip[`img/${a.nombre}`] = new Uint8Array(readFileSync(p));
  }
  return new Response(zipSync(zip, { level: 6 }) as BodyInit, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${id}-web-v${v}.zip"` },
  });
}
