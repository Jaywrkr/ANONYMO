// Faro escribe el guion de un video antes de grabarlo (sistema/71).
import { clienteConFicha, contextoCliente, escribirGuion, idFicha, ocultarClaves, puedeHacer, saberDe, TAREAS_SABER, textoFaltan } from "@anonymo/pipeline";
import { cartera } from "@/lib/cartera";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { pedido?: unknown; cliente?: unknown; segundos?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  // Con un cliente que tiene ficha (sistema/92), Faro escribe con lo que se sabe de él. Si falta lo mínimo, no escribe:
  // un guion genérico no sirve y cuesta lo mismo. Sin cliente, o con un nombre suelto, escribe como antes.
  const cliente = typeof c.cliente === "string" ? c.cliente.trim() : "";
  let saber: string | undefined;
  if (cliente) {
    const f = (await cartera()).fichas.find((x) => x.id === idFicha(cliente) || (x.guardada?.alias ?? []).some((a) => idFicha(a) === idFicha(cliente)));
    if (f && clienteConFicha(f)) {
      const s = saberDe(f), e = puedeHacer(s, "guion");
      if (!e.listo) return mal(`Para escribirle un guion a ${f.nombre} falta saber: ${textoFaltan(e.faltan)}. Complétalo en su ficha (Clientes → ${f.nombre}).`, 409);
      saber = contextoCliente(s, [...TAREAS_SABER.guion.minimo, ...TAREAS_SABER.guion.mejor]);
    }
  }
  try {
    const guion = await escribirGuion(String(c.pedido ?? ""), { cliente: cliente || undefined, segundos: Number(c.segundos), por: p.yo!, saber });
    return Response.json({ guion }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal(ocultarClaves((e as Error).message), 502);
  }
}
