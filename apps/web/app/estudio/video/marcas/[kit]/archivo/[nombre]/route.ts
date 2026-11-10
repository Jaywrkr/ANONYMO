// El logo y la música de una marca (sistema/65). En línea redirige a una URL firmada de la nube privada;
// en tu máquina los sirve del disco y recibe la subida.
import { readFileSync, existsSync } from "node:fs";
import { guardarLocalKit, nubeActiva, rutaLocalKit, tipoArchivoKit, urlLecturaKit } from "@anonymo/pipeline";
import { mal, permisoKit } from "@/lib/video";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ kit: string; nombre: string }> };
const valido = (n: string) => /^(logo\.(png|jpg|webp)|musica\.(mp3|m4a|wav|aac))$/.test(n);

export async function GET(_: Request, { params }: Params) {
  const { kit, nombre } = await params;
  const p = await permisoKit(kit);
  if (p.error) return p.error;
  if (!valido(nombre)) return mal("Archivo no válido.", 404);
  if (nubeActiva()) {
    const u = await urlLecturaKit(kit, nombre).catch(() => undefined);
    return u ? Response.redirect(u, 302) : mal("No encontramos el archivo.", 404);
  }
  const r = rutaLocalKit(kit, nombre);
  if (!existsSync(r)) return mal("No encontramos el archivo.", 404);
  return new Response(new Uint8Array(readFileSync(r)), { headers: { "content-type": tipoArchivoKit(nombre), "cache-control": "private, max-age=600" } });
}

/** Solo en tu máquina: el archivo llega por el estudio (en línea sube directo a la nube). */
export async function PUT(req: Request, { params }: Params) {
  const { kit, nombre } = await params;
  const p = await permisoKit(kit);
  if (p.error) return p.error;
  if (nubeActiva()) return mal("En línea el archivo sube directo a la nube.");
  if (!valido(nombre)) return mal("Archivo no válido.");
  guardarLocalKit(kit, nombre, new Uint8Array(await req.arrayBuffer()));
  return Response.json({ ok: true });
}
