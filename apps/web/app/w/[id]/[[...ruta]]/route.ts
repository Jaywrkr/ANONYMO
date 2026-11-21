// La web del cliente en vivo (sistema/98): la versión del equipo con los cambios que hizo el cliente desde su portal.
// Solo existe si Jay o Luna la pusieron en vivo. Sin sesión: es la web pública del negocio.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta, leerRemotoBytes, nubeActiva, paginaEnVivo, REL_MIWEB, rutaSegura, scriptAsistente, asistenteVisible, TIPOS_SITIO, type EstadoMiWeb } from "@anonymo/pipeline";

export const dynamic = "force-dynamic";

async function leer(id: string, rel: string): Promise<Uint8Array | undefined> {
  if (nubeActiva()) return leerRemotoBytes(id, rel);
  const p = join(carpeta(), id, rel);
  return existsSync(p) ? new Uint8Array(readFileSync(p)) : undefined;
}

const no = () => new Response("No encontrado", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function GET(req: Request, { params }: { params: Promise<{ id: string; ruta?: string[] }> }) {
  const { id, ruta } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) return no();
  // Las rutas relativas de la web necesitan un archivo en la dirección: /w/id → /w/id/index.html.
  if (!ruta?.length) return Response.redirect(new URL(`/w/${id}/index.html`, req.url), 308);
  const r = rutaSegura(ruta.map(decodeURIComponent).join("/"));
  if (!r) return no();
  let e: EstadoMiWeb | undefined;
  try {
    const b = await leer(id, REL_MIWEB);
    e = b ? (JSON.parse(Buffer.from(b).toString("utf8")) as EstadoMiWeb) : undefined;
  } catch {
    return new Response("No disponible", { status: 503 });
  }
  if (!e?.activa) return no();
  const cabeceras = { "cache-control": "public, max-age=30", "x-content-type-options": "nosniff" };
  if (r === "_asistente.js") {
    if (!asistenteVisible(e)) return no();
    return new Response(scriptAsistente(e, e.negocio), { headers: { ...cabeceras, "content-type": "text/javascript; charset=utf-8" } });
  }
  const ext = r.split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPOS_SITIO[ext];
  if (!tipo) return no();
  const foto = r.match(/^img\/(mw-[a-z0-9]+\.(?:webp|jpe?g|png))$/)?.[1];
  const datos = foto ? await leer(id, `miweb/img/${foto}`) : (await leer(id, `sitio/v${e.base}/${r}`)) ?? (r.startsWith("img/") ? await leer(id, `archivos/${r.slice(4)}`) : undefined);
  if (!datos) return no();
  if (ext === "html") {
    const html = paginaEnVivo(Buffer.from(datos).toString("utf8"), e, r, `/w/${id}/_asistente.js`);
    return new Response(html, { headers: { ...cabeceras, "content-type": tipo } });
  }
  return new Response(datos as BodyInit, { headers: { ...cabeceras, "content-type": tipo } });
}
