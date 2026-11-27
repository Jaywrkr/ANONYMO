// El paquete de una pieza de Faro para subir a Instagram (sistema/127): las láminas en orden, el video si es un reel
// y el texto para pegar, en un .zip. Solo con sesión.
import { zipSync } from "fflate";
import { MES_PIEZAS, idPiezaValido, leerArte, leerMaterial, leerMesContenido, leerPiezaFaro } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await quienEsta())) return Response.json({ error: "Tu sesión terminó. Vuelve a entrar." }, { status: 403 });
  const { id } = await params;
  const p = idPiezaValido(id) ? await leerPiezaFaro(id) : undefined;
  const v = p?.versiones.at(-1);
  if (!p || !v) return Response.json({ error: "Esa pieza todavía no tiene diseño." }, { status: 404 });
  const archivos: Record<string, Uint8Array> = {};
  for (const [i, a] of v.laminas.entries()) { const d = await leerArte(MES_PIEZAS, a).catch(() => undefined); if (d) archivos[`${String(i + 1).padStart(2, "0")}${p.formato === "reel" ? "-portada" : ""}.jpg`] = d; }
  if (v.video) { const d = await leerMaterial(v.video).catch(() => undefined); if (d) archivos["reel.mp4"] = d; }
  // Si es del mes, va el texto de la publicación (pudo corregirse a mano después de Faro).
  const delMes = p.enMes ? (await leerMesContenido(p.enMes.mes).catch(() => undefined))?.piezas.find((x) => x.id === p.enMes!.pieza)?.texto : undefined;
  archivos["texto.txt"] = new TextEncoder().encode(delMes ?? v.texto);
  const nombre = `${p.enMes?.fecha ?? p.creado.slice(0, 10)}-${p.proyecto.nombre}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(Buffer.from(zipSync(archivos, { level: 0 })), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${nombre}.zip"`, "cache-control": "no-store" } });
}
