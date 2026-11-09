// Empieza un video (sistema/62): crea su ficha y devuelve dónde subir el original.
// En línea el navegador sube directo a la nube privada (sin el límite de 4,5 MB de Vercel).
import { guardarVideo, nuevoIdVideo, trabajoNuevo, urlSubida, validarVideo } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { nombre?: unknown; bytes?: unknown; cliente?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const archivo = String(c.nombre ?? "").slice(0, 200);
  const nombre = archivo.replace(/\.[^.]+$/, "").trim() || "Video";
  try {
    const ext = validarVideo(archivo, Number(c.bytes));
    const id = nuevoIdVideo(nombre);
    const t = trabajoNuevo(id, nombre, p.yo!, ext, Number(c.bytes), typeof c.cliente === "string" ? c.cliente.trim() : undefined);
    await guardarVideo(t);
    const url = await urlSubida(id, t.original!);
    return Response.json({ id, url, archivo: t.original });
  } catch (e) {
    return mal((e as Error).message);
  }
}
