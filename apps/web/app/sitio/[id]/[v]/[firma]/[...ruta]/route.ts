import { readFileSync } from "node:fs";
import { leerArchivoSitio, leerRemotoBytes, nubeActiva, rutaArchivo, rutaSegura, TIPOS_SITIO } from "@anonymo/pipeline";
import { firmaSitioValida } from "@/lib/sitio";

export const dynamic = "force-dynamic";

// La web del cliente, tal cual la construyó el equipo (sistema/42). Las imágenes «img/<archivo>» salen de los
// archivos del proyecto. Sin sesión: la firma del enlace es el permiso.
export async function GET(_: Request, { params }: { params: Promise<{ id: string; v: string; firma: string; ruta: string[] }> }) {
  const { id, v, firma, ruta } = await params;
  const version = Number(v);
  if (!/^[a-z0-9_-]+$/.test(id) || !(version > 0) || !firmaSitioValida(id, version, firma)) return new Response("No encontrado", { status: 404 });
  const r = rutaSegura(ruta.map(decodeURIComponent).join("/"));
  if (!r) return new Response("No encontrado", { status: 404 });
  const ext = r.split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPOS_SITIO[ext] ?? "application/octet-stream";
  const esImagen = r.startsWith("img/");
  let datos: Uint8Array | undefined;
  try {
    if (nubeActiva()) {
      datos = await leerRemotoBytes(id, esImagen ? `archivos/${r.slice(4)}` : `sitio/v${version}/${r}`);
    } else if (esImagen) {
      const p = rutaArchivo(id, r.slice(4));
      datos = p ? new Uint8Array(readFileSync(p)) : undefined;
    } else {
      const b = leerArchivoSitio(id, version, r);
      datos = b ? new Uint8Array(b) : undefined;
    }
  } catch {
    return new Response("No disponible", { status: 503 });
  }
  if (!datos) return new Response(esImagen ? "" : "No encontrado", { status: 404 });
  return new Response(datos as BodyInit, {
    headers: {
      "content-type": tipo,
      // Cada versión es fija: se guarda en caché del navegador.
      "cache-control": "private, max-age=600",
      "x-robots-tag": "noindex",
      // La vista previa no puede ser incrustada fuera del estudio.
      "content-security-policy": "frame-ancestors 'self'",
    },
  });
}
