// Cuánto suele tardar cada entrega (sistema/35): una estimación honesta para mostrar el avance mientras el agente trabaja.
import { contratoPorId, type TareaId } from "@anonymo/pipeline";

/** Segundos aproximados: arranque + lo que escribe (~70 tokens/s) + pensar + buscar en la web. */
export function segundosEstimados(t: string): number {
  const c = contratoPorId(t as TareaId);
  if (!c) return 120;
  const salida = (c.salida ?? 4000) * 0.6;
  return Math.round(25 + salida / 70 + (c.profunda ? 70 : 0) + (c.herramientas?.includes("web") ? 60 : 0) + (c.ligera ? -20 : 0));
}
