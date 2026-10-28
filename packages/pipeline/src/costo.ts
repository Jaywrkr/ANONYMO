// Cuánto cuesta en IA cada entrega y cada proyecto, para que Ledger cobre bien.
// Precios en USD por millón de tokens: ajústalos a tu plan con las variables de entorno.
import type { Entrega, Pedido, Plan, Proyecto, TareaId } from "./tipos.ts";
import { contratoPorId, lecturas } from "./contratos.ts";

export interface Uso { entrada: number; salida: number; busquedas: number; usd: number; estimado: boolean }

export const PRECIOS = {
  entrada: Number(process.env.ANTHROPIC_PRECIO_ENTRADA ?? 3),
  salida: Number(process.env.ANTHROPIC_PRECIO_SALIDA ?? 15),
  busqueda: Number(process.env.ANTHROPIC_PRECIO_BUSQUEDA ?? 0.01),
  // Modelo rápido (tareas livianas y decisiones de Atlas). Revisa los precios de tu modelo en la consola.
  entradaRapido: Number(process.env.ANTHROPIC_PRECIO_ENTRADA_RAPIDO ?? 1),
  salidaRapido: Number(process.env.ANTHROPIC_PRECIO_SALIDA_RAPIDO ?? 5),
};

export const usd = (entrada: number, salida: number, busquedas = 0, rapido = false) =>
  Math.round(
    ((entrada / 1e6) * (rapido ? PRECIOS.entradaRapido : PRECIOS.entrada) + (salida / 1e6) * (rapido ? PRECIOS.salidaRapido : PRECIOS.salida) + busquedas * PRECIOS.busqueda) * 10000,
  ) / 10000;

/** Sin API (simulado o manual): estimación de lo que costaría con el motor real. 1 token ≈ 4 caracteres. */
export function estimar(entradaTexto: string, salidaTokens = 1800, busquedas = 0): Uso {
  const entrada = Math.round(entradaTexto.length / 4) + 600; // + instrucciones del agente
  return { entrada, salida: salidaTokens, busquedas, usd: usd(entrada, salidaTokens, busquedas), estimado: true };
}

export interface ResumenCosto { real: number; estimado: number; tareas: { tarea: TareaId; usd: number; estimado: boolean; veces: number }[] }

/** Suma lo gastado: cada rehacer cuenta. */
export function sumar(p: Proyecto): ResumenCosto {
  const tareas = Object.entries(p.costos ?? {}).map(([t, l]) => ({
    tarea: t as TareaId,
    usd: Math.round(l.reduce((s, u) => s + u.usd, 0) * 10000) / 10000,
    estimado: l.every((u) => u.estimado),
    veces: l.length,
  }));
  const real = tareas.flatMap((t) => (p.costos?.[t.tarea] ?? []).filter((u) => !u.estimado)).reduce((s, u) => s + u.usd, 0);
  const estimado = tareas.flatMap((t) => (p.costos?.[t.tarea] ?? []).filter((u) => u.estimado)).reduce((s, u) => s + u.usd, 0);
  return { real: Math.round(real * 100) / 100, estimado: Math.round(estimado * 100) / 100, tareas: tareas.sort((a, b) => b.usd - a.usd) };
}

export const textoEntrada = (lecturas: Entrega[], extra = "") => lecturas.map((e) => e.contenido).join("\n") + extra;

/**
 * Cuánto costaría el plan con IA real, antes de empezar (sistema/23). Aproximado: supone que cada agente
 * lee el pedido y las entregas de las que depende, y escribe dos tercios de su tope.
 */
export function costoPlan(pedido: Pick<Pedido, "descripcion" | "contexto">, plan: Pick<Plan, "tareas">): number {
  const base = Math.round((pedido.descripcion.length + JSON.stringify(pedido.contexto ?? {}).length) / 4) + 900;
  let total = 0;
  for (const t of plan.tareas) {
    const c = contratoPorId(t);
    if (!c) continue;
    // Las tareas creativas piensan antes de escribir: ese pensamiento también se cobra como salida.
    const salida = Math.round((c.salida ?? 2500) * 0.66) + (c.profunda ? 3000 : 0);
    const entrada = base + lecturas(t, plan.tareas).length * 1800;
    const busquedas = c.herramientas?.includes("web") ? 3 : 0;
    total += usd(entrada, salida, busquedas, !!c.ligera);
  }
  return Math.round(total * 100) / 100;
}
