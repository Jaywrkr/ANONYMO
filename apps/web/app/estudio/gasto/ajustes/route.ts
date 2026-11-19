// Cambia los topes de gasto en IA, el saldo anotado o el permiso para seguir hoy (sistema/91).
import { cambiarTopes, resumenGasto, TOPE_MAX, TOPE_MIN, topeValido } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { diario?: unknown; mensual?: unknown; saldo?: unknown; extra?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const cambio: Parameters<typeof cambiarTopes>[0] = {};
  for (const k of ["diario", "mensual"] as const) {
    if (c[k] === undefined) continue;
    if (!topeValido(c[k])) return mal(`El tope va entre ${TOPE_MIN} y ${TOPE_MAX} dólares.`);
    cambio[k] = c[k] as number;
  }
  if (c.saldo === null) cambio.saldo = null;
  else if (c.saldo !== undefined) {
    if (typeof c.saldo !== "number" || !Number.isFinite(c.saldo) || c.saldo < 0 || c.saldo > 100000) return mal("Escribe el saldo en dólares, como aparece en la consola de Anthropic.");
    cambio.saldo = c.saldo;
  }
  if (c.extra === null) cambio.extra = null;
  else if (c.extra !== undefined) {
    if (!topeValido(c.extra)) return mal(`El permiso va entre ${TOPE_MIN} y ${TOPE_MAX} dólares.`);
    cambio.extra = c.extra as number;
  }
  if (!Object.keys(cambio).length) return mal("No hay nada que cambiar.");
  try {
    await cambiarTopes(cambio, p.yo!);
    return Response.json({ resumen: await resumenGasto() }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
