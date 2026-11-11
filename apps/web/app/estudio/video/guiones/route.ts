// Faro escribe el guion de un video antes de grabarlo (sistema/71).
import { escribirGuion, ocultarClaves } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/video";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { pedido?: unknown; cliente?: unknown; segundos?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  try {
    const guion = await escribirGuion(String(c.pedido ?? ""), { cliente: typeof c.cliente === "string" ? c.cliente : undefined, segundos: Number(c.segundos), por: p.yo! });
    return Response.json({ guion }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal(ocultarClaves((e as Error).message), 502);
  }
}
