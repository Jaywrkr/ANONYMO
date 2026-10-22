import { readFileSync } from "node:fs";
import { rutaArchivo, TIPOS } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import { traer } from "@/lib/nube";

// Sirve un archivo del proyecto, solo en el estudio. Los SVG se descargan (pueden traer scripts).
export async function GET(_: Request, { params }: { params: Promise<{ id: string; nombre: string }> }) {
  if (!(await quienEsta())) return new Response(null, { status: 404 });
  const { id, nombre } = await params;
  await traer(id);
  const ruta = rutaArchivo(id, decodeURIComponent(nombre));
  if (!ruta) return new Response(null, { status: 404 });
  const ext = ruta.slice(ruta.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(readFileSync(ruta)), {
    headers: {
      "content-type": TIPOS[ext] ?? "application/octet-stream",
      "content-disposition": ext === ".svg" ? `attachment; filename="${nombre}"` : "inline",
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=60",
    },
  });
}
