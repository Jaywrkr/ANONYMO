// Los pasos del departamento de video (sistema/62). La respuesta llega cuando el paso termina;
// mientras tanto la página consulta /estado para mostrar el avance.
import { analizarVideo, cambiarVideo, FORMATOS_VIDEO, renderVideo, type FormatoVideo } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  let c: { paso?: string; formato?: string };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  try {
    if (c.paso === "subido") {
      // El navegador terminó de subir el original.
      await cambiarVideo(id, (t) => { if (t.estado === "subiendo" || t.estado === "error") { t.estado = "subido"; t.error = undefined; } });
      return Response.json({ ok: true });
    }
    if (c.paso === "analizar") {
      const t = await analizarVideo(id);
      return Response.json({ ok: true, partes: t.analisis?.partes.length ?? 0 });
    }
    if (c.paso === "render") {
      if (!FORMATOS_VIDEO.includes(c.formato as FormatoVideo)) return mal("Formato no válido.");
      const t = await renderVideo(id, c.formato as FormatoVideo);
      return Response.json({ ok: true, resultado: t.resultados.find((r) => r.formato === c.formato) });
    }
    return mal("Paso no válido.");
  } catch (e) {
    console.error(`[video ${id}]`, (e as Error).message);
    return mal((e as Error).message, 409);
  }
}
