// Presupuesto vivo: horas base + ajustes, y el precio si hay tarifa (TARIFA_HORA en .env).
import type { Proyecto } from "./tipos.ts";

export function presupuestoVivo(p: Proyecto) {
  const base = p.presupuesto?.horas;
  const ajustes = p.presupuesto?.ajustes ?? [];
  const extra = ajustes.filter((a) => !a.incluido).reduce((s, a) => s + a.horas, 0);
  const tarifa = Number(process.env.TARIFA_HORA ?? 0) || undefined;
  const total = base !== undefined ? base + extra : undefined;
  return { base, extra, total, ajustes, tarifa, precio: total !== undefined && tarifa ? total * tarifa : undefined };
}
