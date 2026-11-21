// Ayudas del mes de contenido (sistema/96): armarlo desde la ficha de un cliente, con lo mínimo que pide saber.ts.
import { armarMes, clienteConFicha, contextoCliente, idMesValido, puedeHacer, saberDe, TAREAS_SABER, textoFaltan, type Ficha } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";

export const mal = (error: string, status = 400, extra: Record<string, unknown> = {}) => Response.json({ error, ...extra }, { status, headers: { "cache-control": "no-store" } });

/** Solo Jay y Luna, y solo un id de mes bien formado. */
export async function permisoMes(id?: string) {
  const yo = await quienEsta();
  if (!yo) return { error: mal("Tu sesión terminó. Vuelve a entrar.", 403) };
  if (id !== undefined && !idMesValido(id)) return { error: mal("No encontramos ese mes.", 404) };
  return { yo };
}

/** Lo que le falta a un cliente para armarle el mes; vacío si está listo. */
export function faltaParaMes(f: Ficha): string {
  if (!clienteConFicha(f)) return `${f.nombre} todavía no tiene ficha. Ábrela y completa lo que sabemos de él.`;
  const e = puedeHacer(saberDe(f), "contenido");
  return e.listo ? "" : `A ${f.nombre} le falta: ${textoFaltan(e.faltan)}.`;
}

/** Faro arma el mes con lo que se sabe del cliente. Lanza un error en palabras simples si falta algo. */
export async function crearMes(f: Ficha, mes: string, pedido: string | undefined, por: string) {
  const falta = faltaParaMes(f);
  if (falta) throw Object.assign(new Error(falta), { status: 409 });
  const s = saberDe(f);
  return armarMes({
    cliente: f.id, nombre: f.nombre, mes, por, pedido: pedido || undefined,
    saber: contextoCliente(s, [...TAREAS_SABER.contenido.minimo, ...TAREAS_SABER.contenido.mejor]),
    canales: s.canales?.valor ?? "Instagram", frecuencia: s.frecuencia?.valor ?? "",
  });
}
