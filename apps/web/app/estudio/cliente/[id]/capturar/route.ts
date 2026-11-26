// Capturar las webs de la Dirección de un cliente (sistema/118): su trabajo real y sus referencias, en computadora y celular.
// Lo pide la ficha sola cuando hay referencias sin capturas. Solo Jay y Luna.
import { capturarReferencias, direccionVacia, guardarFicha, navegadorCapturas, ocultarClaves, porCapturar } from "@anonymo/pipeline";
import { cartera } from "@/lib/cartera";
import { quienEsta } from "@/lib/estudio";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const sinCache = { headers: { "cache-control": "no-store" } };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await quienEsta();
  if (!yo) return Response.json({ error: "Tu sesión terminó. Vuelve a entrar." }, { status: 403, ...sinCache });
  const { id } = await params;
  const todas = new URL(req.url).searchParams.get("todas") === "1";
  const f = (await cartera()).fichas.find((x) => x.id === id);
  if (!f?.guardada) return Response.json({ error: "No encontramos ese cliente." }, { status: 404, ...sinCache });
  const d = f.guardada.direccion ?? direccionVacia();
  if (!porCapturar(d, todas).length) return Response.json({ hechas: 0, fallas: [] }, sinCache);
  const nav = await navegadorCapturas();
  try {
    const r = await capturarReferencias(nav, id, d, { todas, plazo: Date.now() + 240_000 });
    // Se guarda sobre lo último: si alguien cambió la Dirección mientras tanto, solo se suman las capturas.
    const ahora = (await cartera()).fichas.find((x) => x.id === id)?.guardada?.direccion ?? d;
    const conCapturas = { ...ahora, referencias: ahora.referencias.map((x) => { const c = r.direccion.referencias.find((y) => y.url === x.url && y.capturas?.length); return c && (!x.capturas?.length || todas) ? { ...x, capturas: c.capturas, capturadaEl: c.capturadaEl } : x; }) };
    await guardarFicha(id, { nombre: f.guardada.nombre, direccion: conCapturas }, yo);
    return Response.json({ hechas: r.hechas, fallas: r.fallas }, sinCache);
  } catch (e) {
    return Response.json({ error: `No se pudo capturar: ${ocultarClaves((e as Error).message).slice(0, 160)}` }, { status: 502, ...sinCache });
  } finally {
    await nav.close().catch(() => {});
  }
}
