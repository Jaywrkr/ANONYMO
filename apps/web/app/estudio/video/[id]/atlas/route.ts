// Atlas en el video (sistema/63): lee el pedido de Luna, lo convierte en cambios de edición y los guarda.
// Devuelve la edición de antes para poder deshacer, y los formatos que pidió armar.
import { cambiarVideo, guionParaCorte, interpretarPedidoVideo, leerArchivoVideo, leerGuion, leerKit, leerVideo, type MensajeVideo } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permiso(id);
  if (p.error) return p.error;
  let c: { texto?: unknown; inicial?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const texto = typeof c.texto === "string" ? c.texto.trim().slice(0, 2000) : "";
  if (!texto) return mal("Escribe qué quieres que haga Corte con el video.");
  const t = await leerVideo(id);
  if (!t) return mal("No encontramos ese video.", 404);
  const ahora = () => new Date().toISOString();
  const deLuna: MensajeVideo = { quien: p.yo!, texto, cuando: ahora() };
  try {
    // Atlas ve la hoja con una miniatura por parte (sistema/64): así entiende el video sin transcribirlo.
    const hoja = t.analisis?.cuadros ? await leerArchivoVideo(id, t.analisis.cuadros.archivo).catch(() => undefined) : undefined;
    // Y sabe qué tiene la marca del video (sistema/65).
    const k = t.marca ? await leerKit(t.marca).catch(() => undefined) : undefined;
    // Y el guion de Faro con que se grabó, si lo hay (sistema/71).
    const g = t.guion ? await leerGuion(t.guion).catch(() => undefined) : undefined;
    const r = await interpretarPedidoVideo(texto, { ...t, kit: k ? { nombre: k.nombre, logo: !!k.logo, musica: k.musica?.nombre } : undefined, guion: g ? guionParaCorte(g) : undefined }, hoja);
    const deAtlas: MensajeVideo = { quien: "atlas", texto: r.respuesta, cuando: ahora(), cambios: r.cambios, noSePuede: r.noSePuede };
    await cambiarVideo(id, (x) => {
      x.edicion = r.edicion;
      x.conversacion = [...(x.conversacion ?? []), deLuna, deAtlas].slice(-60);
      if (c.inicial === true) x.pedidoAplicado = true;
    });
    return Response.json({ ...r, anterior: t.edicion, mensajes: [deLuna, deAtlas] });
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[video ${id}] atlas:`, error);
    const aviso: MensajeVideo = { quien: "atlas", texto: error, cuando: ahora(), error: true };
    await cambiarVideo(id, (x) => {
      x.conversacion = [...(x.conversacion ?? []), deLuna, aviso].slice(-60);
      if (c.inicial === true) x.pedidoAplicado = true;
    }).catch(() => {});
    return Response.json({ error, mensajes: [deLuna, aviso] }, { status: 409 });
  }
}
