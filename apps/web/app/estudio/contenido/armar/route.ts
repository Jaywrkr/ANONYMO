// Pedirle a Faro el mes de contenido de un cliente (sistema/96). Usa IA: el navegador confirma antes de llamar.
import { mesPorDefecto, nombreMes, ocultarClaves } from "@anonymo/pipeline";
import { cartera } from "@/lib/cartera";
import { crearMes, mal, permisoMes } from "@/lib/contenido";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const p = await permisoMes();
  if (p.error) return p.error;
  let c: { cliente?: unknown; mes?: unknown; pedido?: unknown; reemplazar?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const f = (await cartera()).fichas.find((x) => x.id === c.cliente);
  if (!f) return mal("No encontramos ese cliente.", 404);
  const mes = typeof c.mes === "string" && /^\d{4}-\d{2}$/.test(c.mes) ? c.mes : mesPorDefecto();
  try {
    const m = await crearMes(f, mes, typeof c.pedido === "string" ? c.pedido.slice(0, 800) : undefined, p.yo!, c.reemplazar === true);
    return Response.json({ mes: { id: m.id, nombre: nombreMes(m.mes), piezas: m.piezas.length } }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const m = ocultarClaves((e as Error).message);
    const status = (e as { status?: number }).status ?? (m.startsWith("Ya hay") ? 409 : 502);
    return mal(m, status, status === 409 ? { ficha: `/estudio/cliente/${f.id}#saber` } : {});
  }
}
