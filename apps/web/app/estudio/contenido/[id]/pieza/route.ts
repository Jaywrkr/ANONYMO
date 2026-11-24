// Revisar una pieza del mes (sistema/96). PATCH: aprobar, pedir un cambio o corregir. POST: Faro escribe el guion de un reel.
import { cambiarPieza, escribirGuion, ESTADOS_PIEZA, FORMATOS, leerMesContenido, ocultarClaves, type CambioPieza, type EstadoPieza, type FormatoPieza } from "@anonymo/pipeline";
import { mal, permisoMes } from "@/lib/contenido";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const sinCache = { headers: { "cache-control": "no-store" } };
const texto = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  let c: Record<string, unknown>;
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const cambio: CambioPieza = { idea: texto(c.idea), texto: texto(c.texto), visual: texto(c.visual) };
  if (typeof c.estado === "string") { if (!(c.estado in ESTADOS_PIEZA)) return mal("Ese estado no existe."); cambio.estado = c.estado as EstadoPieza; }
  if (typeof c.formato === "string") { if (!(c.formato in FORMATOS)) return mal("Ese formato no existe."); cambio.formato = c.formato as FormatoPieza; }
  if (c.nota !== undefined) cambio.nota = c.nota === null ? null : String(c.nota);
  if (c.elegirB === true) cambio.elegirB = true;
  if (typeof c.tituloArte === "string") cambio.tituloArte = c.tituloArte;
  try {
    return Response.json({ mes: await cambiarPieza(id, String(c.pieza ?? ""), cambio, p.yo!) }, sinCache);
  } catch (e) {
    const m = (e as Error).message;
    return mal(m, m.startsWith("No encontramos") ? 404 : 400);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  let c: { pieza?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const m = await leerMesContenido(id);
  const pz = m?.piezas.find((x) => x.id === c.pieza);
  if (!m || !pz) return mal("No encontramos esa pieza.", 404);
  if (pz.formato !== "reel") return mal("Solo los reels llevan guion.");
  try {
    const g = await escribirGuion(`${pz.idea}. Texto de la publicación: ${pz.texto}. Cómo se ve: ${pz.visual}${pz.lamina ? `. Título de la portada: ${pz.lamina.titulo}` : ""}`, { cliente: m.nombre, segundos: 30, por: p.yo! });
    const guion = [`Gancho: ${g.gancho}`, ...g.partes.map((x, i) => `${i + 1}. ${x.texto}${x.toma ? ` (toma: ${x.toma})` : ""}`), `Cierre: ${g.cierre}`].join("\n");
    return Response.json({ mes: await cambiarPieza(id, pz.id, { guion }, p.yo!) }, sinCache);
  } catch (e) {
    return mal(ocultarClaves((e as Error).message), 502);
  }
}
