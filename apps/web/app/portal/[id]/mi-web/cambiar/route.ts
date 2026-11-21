// Lo que guarda el cliente desde «Mi web» (sistema/98). El enlace del portal es el permiso.
// POST JSON: { t, accion: "textos" | "deshacer" | "asistente", ... }. POST con ?t=…&foto=1 y el archivo en el cuerpo: sube una foto.
import { deshacerMiWeb, existe, guardarAsistente, guardarCambios, guardarFotoMiWeb, tokenValido, type CambiosPagina, type PreguntaAsistente } from "@anonymo/pipeline";
import { portalActivo } from "@/lib/estudio";
import { conNube, traer } from "@/lib/nube";

export const dynamic = "force-dynamic";
const resp = (x: unknown, status = 200) => Response.json(x, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id) || !portalActivo()) return resp({ error: "No encontrado." }, 404);
  const url = new URL(req.url);
  if (url.searchParams.get("foto") === "1") {
    const t = url.searchParams.get("t") ?? "";
    await traer(id);
    if (!existe(id) || !tokenValido(id, t)) return resp({ error: "Este enlace ya no es válido. Pide uno nuevo a Jay o a Luna." }, 403);
    const datos = new Uint8Array(await req.arrayBuffer());
    try {
      return resp({ nombre: await conNube([id], () => guardarFotoMiWeb(id, datos, req.headers.get("content-type") ?? "")) });
    } catch (e) {
      return resp({ error: (e as Error).message }, 400);
    }
  }
  let c: { t?: unknown; accion?: unknown; pagina?: unknown; textos?: unknown; fotos?: unknown; activo?: unknown; preguntas?: unknown; whatsapp?: unknown };
  try { c = await req.json(); } catch { return resp({ error: "Pedido no válido." }, 400); }
  await traer(id);
  if (!existe(id) || !tokenValido(id, typeof c.t === "string" ? c.t : undefined)) return resp({ error: "Este enlace ya no es válido. Pide uno nuevo a Jay o a Luna." }, 403);
  try {
    const estado = await conNube([id], () => {
      if (c.accion === "textos") return guardarCambios(id, String(c.pagina ?? ""), { textos: (c.textos ?? {}) as Record<string, string>, fotos: (c.fotos ?? {}) as CambiosPagina["fotos"] }, "cliente");
      if (c.accion === "deshacer") return deshacerMiWeb(id, "cliente");
      if (c.accion === "asistente") return guardarAsistente(id, { activo: c.activo === true, preguntas: Array.isArray(c.preguntas) ? (c.preguntas as PreguntaAsistente[]) : [], whatsapp: typeof c.whatsapp === "string" ? c.whatsapp : undefined }, "cliente");
      throw new Error("Esa acción no existe.");
    });
    return resp({ ok: true, paginas: estado.paginas, puedeDeshacer: estado.historia.some((h) => h.antes) });
  } catch (e) {
    return resp({ error: (e as Error).message }, 400);
  }
}
