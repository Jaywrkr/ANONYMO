// Presupuesto vivo: horas base + ajustes, y el precio si hay tarifa (TARIFA_HORA en .env).
import type { Proyecto } from "./tipos.ts";

export function presupuestoVivo(p: Proyecto) {
  // Si Jay fijó sus horas reales, mandan sobre la estimación de Ledger.
  const estimadas = p.presupuesto?.horas;
  const base = p.presupuesto?.horasJay ?? estimadas;
  const ajustes = p.presupuesto?.ajustes ?? [];
  const extra = ajustes.filter((a) => !a.incluido).reduce((s, a) => s + a.horas, 0);
  const tarifa = p.presupuesto?.tarifa || Number(process.env.TARIFA_HORA ?? 0) || undefined;
  const total = base !== undefined ? base + extra : undefined;
  return { base, estimadas, deJay: p.presupuesto?.horasJay !== undefined, extra, total, ajustes, tarifa, precio: total !== undefined && tarifa ? total * tarifa : undefined };
}
