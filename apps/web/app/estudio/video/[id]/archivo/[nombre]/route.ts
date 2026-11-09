// Los archivos de un video (sistema/62): el original y los resultados.
// En línea redirige a una URL firmada de la nube privada (el navegador reproduce y salta sin pasar por Vercel).
// En tu máquina lo sirve del disco, con saltos (Range) para que la vista previa pueda cortar.
import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { archivoValido, guardarLocal, leerVideo, nubeActiva, rutaLocal, TIPOS_VIDEO, urlLectura } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; nombre: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id, nombre } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  if (!archivoValido(nombre)) return mal("Archivo no válido.", 404);
  const descargar = new URL(req.url).searchParams.get("descargar");
  const nombreDescarga = descargar ? `${descargar.replace(/[^a-z0-9 ._-]/gi, "").slice(0, 80) || "video"}.mp4` : "";
  if (nubeActiva()) {
    const u = await urlLectura(id, nombre).catch(() => undefined);
    if (!u) return mal("No encontramos el archivo.", 404);
    return Response.redirect(nombreDescarga ? `${u}&download=${encodeURIComponent(nombreDescarga)}` : u, 302);
  }
  const ruta = rutaLocal(id, nombre);
  if (!existsSync(ruta)) return mal("No encontramos el archivo.", 404);
  const total = statSync(ruta).size;
  const tipo = TIPOS_VIDEO[nombre.slice(nombre.lastIndexOf("."))] ?? "application/octet-stream";
  const base: Record<string, string> = { "content-type": tipo, "accept-ranges": "bytes", "cache-control": "private, no-store" };
  if (nombreDescarga) base["content-disposition"] = `attachment; filename="${nombreDescarga}"`;
  const rango = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (rango) {
    const ini = rango[1] ? Number(rango[1]) : Math.max(0, total - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(total - 1, Number(rango[2])) : total - 1;
    if (ini >= total || ini > fin) return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    const flujo = Readable.toWeb(createReadStream(ruta, { start: ini, end: fin })) as ReadableStream;
    return new Response(flujo, { status: 206, headers: { ...base, "content-range": `bytes ${ini}-${fin}/${total}`, "content-length": String(fin - ini + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(ruta)) as ReadableStream, { headers: { ...base, "content-length": String(total) } });
}

/** Solo en tu máquina: el original llega por el estudio (en línea sube directo a la nube). */
export async function PUT(req: Request, { params }: Params) {
  const { id, nombre } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  if (nubeActiva()) return mal("En línea el video sube directo a la nube.");
  const t = await leerVideo(id);
  if (!t || t.original !== nombre) return mal("No encontramos ese video.", 404);
  const bytes = guardarLocal(id, nombre, new Uint8Array(await req.arrayBuffer()));
  return Response.json({ ok: true, bytes });
}
