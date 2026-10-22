// Atlas: convierte un pedido en un plan. Reglas fijas por ahora; con clave, Atlas podrá ajustarlas.
import { FASES, PEDIDOS } from "@anonymo/agentes";
import { contratosDeFase, ordenar } from "./contratos.ts";
import type { Pausas, Pedido, Plan, TareaId } from "./tipos.ts";

/** Pausas que Atlas propone por tipo: después de lo que el resto del trabajo usa como base. */
const PAUSAS_CLAVE: Record<Pedido["tipo"], number[]> = {
  web: [1, 4],
  marca: [1, 2, 3],
  lanzamiento: [1, 5],
  todo: [1, 2, 3, 4],
};

export function resolverPausas(p: Pausas | undefined, tipo: Pedido["tipo"], fases: number[]): number[] {
  if (p === "nunca") return [];
  if (p === "cada-fase") return [...fases];
  if (Array.isArray(p)) return p.filter((f) => fases.includes(f)).sort((a, b) => a - b);
  return PAUSAS_CLAVE[tipo].filter((f) => fases.includes(f));
}

/** Acepta "nunca", "cada-fase", "clave" o "1,4". */
export function leerPausas(texto: string): Pausas {
  const t = texto.trim().toLowerCase();
  if (t === "nunca" || t === "cada-fase" || t === "clave") return t;
  const nums = t.split(/[ ,]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  if (!nums.length) throw new Error(`Pausas no válidas: "${texto}". Usa nunca, cada-fase, clave o números como 1,4`);
  return nums;
}

export function planificar(pedido: Pedido): Plan {
  const base = PEDIDOS[pedido.tipo];
  const fases = new Set(base.fases);
  const razones: Record<number, string> = {};
  for (const f of base.fases) razones[f] = `Incluida en "${base.nombre.toLowerCase()}".`;

  // Sin marca, no hay sobre qué diseñar una web ni un lanzamiento.
  if (pedido.contexto?.tieneMarca === false && !fases.has(3) && pedido.tipo !== "marca") {
    fases.add(3);
    razones[3] = "El cliente no tiene marca: sin identidad, la web o el lanzamiento no tienen base.";
  }

  const lista = [...fases].sort((a, b) => a - b);
  for (const f of FASES) if (!fases.has(f.n)) razones[f.n] = "No aplica a este pedido.";

  // Tareas que no tienen sentido en este plan.
  const quitadas: Plan["quitadas"] = [];
  if (!fases.has(4) && fases.has(6)) quitadas.push({ id: "6.prisma", razon: "No hay web que auditar." });
  const fuera = new Set<TareaId>(quitadas.map((q) => q.id));
  const tareas = ordenar(lista).filter((id) => !fuera.has(id));

  const c = pedido.contexto ?? {};
  const preguntas: string[] = [];
  if (!c.publico) preguntas.push("¿Quién es el cliente ideal? Edad, zona y qué busca.");
  if (!c.referencias?.length) preguntas.push("Tres marcas o webs que te gusten y por qué.");
  if (!c.plazo) preguntas.push("¿Para cuándo lo necesitas?");
  if (!c.presupuesto) preguntas.push("¿Qué rango de inversión tienes en mente?");
  if (c.tieneMarca === undefined && pedido.tipo !== "marca" && pedido.tipo !== "todo") preguntas.push("¿Ya tienes logo y colores?");

  return {
    pedido: pedido.id,
    fases: lista,
    razones,
    tareas,
    quitadas,
    pausas: resolverPausas(pedido.pausas, pedido.tipo, lista),
    preguntas,
  };
}

/** Cuántas tareas tiene cada fase del plan (para la sala y los resúmenes). */
export const tareasPorFase = (plan: Plan) =>
  Object.fromEntries(plan.fases.map((f) => [f, contratosDeFase(f).filter((c) => plan.tareas.includes(c.id)).length]));
