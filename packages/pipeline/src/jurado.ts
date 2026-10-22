// 5.5 Calidad: lee la nota del Jurado y decide qué se rehace si no llega al mínimo.
import { contratoPorId, lecturas } from "./contratos.ts";
import { NOTA_MINIMA, type Entrega, type Plan, type TareaId } from "./tipos.ts";

export type Criterio = "diseno" | "usabilidad" | "creatividad" | "contenido";
export const PESOS: Record<Criterio, number> = { diseno: 0.4, usabilidad: 0.3, creatividad: 0.2, contenido: 0.1 };
export const NOMBRE_CRITERIO: Record<Criterio, string> = { diseno: "diseño", usabilidad: "usabilidad", creatividad: "creatividad", contenido: "contenido" };

/** Rondas automáticas antes de pasarle la decisión a Jay o Luna. */
export const RONDAS_MAX = 2;

/** Quién responde por cada criterio, en orden de preferencia. Se usan los que estén en el plan. */
const RESPONSABLES: Record<Criterio, TareaId[]> = {
  diseno: ["4.orla", "3.mira", "5.lente"],
  usabilidad: ["4.vector", "4.kine", "4.orla"],
  creatividad: ["4.lumen", "4.orla", "5.escena", "3.kine", "1.nova"],
  contenido: ["3.rhea", "5.faro", "4.orla", "5.corte", "1.nova"],
};

export interface NotaJurado {
  final: number;
  criterios: Partial<Record<Criterio, number>>;
  arreglos: string[];
}

/** Saca la nota de la entrega de Trofeo: de datos.jurado o del bloque json del contenido. */
export function leerNota(e: Entrega | undefined): NotaJurado | undefined {
  if (!e) return undefined;
  let j = e.datos?.jurado as Record<string, unknown> | undefined;
  if (!j) {
    const bloque = e.contenido.match(/```json\s*([\s\S]*?)```/)?.[1];
    try {
      j = bloque ? JSON.parse(bloque) : undefined;
    } catch {
      j = undefined;
    }
  }
  const criterios: NotaJurado["criterios"] = {};
  for (const k of Object.keys(PESOS) as Criterio[]) if (typeof j?.[k] === "number") criterios[k] = j[k] as number;
  const ponderada = Object.keys(criterios).length === 4 ? (Object.entries(criterios) as [Criterio, number][]).reduce((s, [k, v]) => s + v * PESOS[k], 0) : undefined;
  const final = e.nota ?? (typeof j?.final === "number" ? (j.final as number) : ponderada);
  if (final === undefined) return undefined;
  return { final: Math.round(final * 100) / 100, criterios, arreglos: Array.isArray(j?.arreglos) ? (j!.arreglos as string[]) : [] };
}

export interface Veredicto {
  aprobado: boolean;
  nota: NotaJurado;
  /** Criterio más bajo que tiene responsables en el plan. */
  criterio?: Criterio;
  /** Tareas a rehacer: los responsables y todo lo que depende de ellos, hasta el Jurado incluido. */
  rehacer: TareaId[];
  cambio: string;
}

/** Prisma también cuenta: errores de accesibilidad mandan a rehacer el código. */
function fallasPrisma(prisma: Entrega | undefined): string | undefined {
  const a = prisma?.datos?.lighthouse as { celular?: { accesibilidad: number }; axe?: unknown[] } | undefined;
  if (!a) return undefined;
  const acc = a.celular?.accesibilidad ?? 100;
  const axe = a.axe?.length ?? 0;
  if (acc >= 90 && axe === 0) return undefined;
  return `Prisma: accesibilidad ${acc} en celular y ${axe} errores de axe.`;
}

export function evaluar(plan: Plan, trofeo: Entrega | undefined, prisma: Entrega | undefined, ronda: number): Veredicto | undefined {
  const nota = leerNota(trofeo);
  if (!nota) return undefined;
  const prismaFalla = fallasPrisma(prisma);
  if (nota.final >= NOTA_MINIMA && !prismaFalla) return { aprobado: true, nota, rehacer: [], cambio: "" };

  const enPlan = (t: TareaId) => plan.tareas.includes(t) && !t.startsWith("6.");
  const ordenados = (Object.entries(nota.criterios) as [Criterio, number][]).sort((a, b) => a[1] - b[1]);
  let criterio: Criterio | undefined;
  let base: TareaId[] = [];
  if (nota.final < NOTA_MINIMA) {
    for (const [k] of ordenados) {
      const r = RESPONSABLES[k].filter(enPlan);
      if (r.length) {
        criterio = k;
        // Preferir lo más cercano al resultado: rehacer el brief (fase 1) arrastra todo el proyecto.
        const cercanos = r.filter((t) => !t.startsWith("1."));
        base = cercanos.length ? cercanos.slice(0, 2) : r.slice(0, 1);
        break;
      }
    }
  }
  if (prismaFalla && enPlan("4.vector") && !base.includes("4.vector")) base.push("4.vector");

  // Todo lo que lee (directa o indirectamente) lo que se rehace, se rehace también.
  const rehacer = new Set<TareaId>(base);
  for (const t of plan.tareas) {
    if (rehacer.has(t)) continue;
    const c = contratoPorId(t);
    if (!c) continue;
    const lee = c.usa === "todo" ? [] : lecturas(t, plan.tareas);
    if (lee.some((u) => rehacer.has(u))) rehacer.add(t);
  }
  // El Jurado siempre vuelve a calificar, y lo que viene después (fase 7) se rehace con la nota nueva.
  for (const t of plan.tareas) if (Number(t.split(".")[0]) >= 6) rehacer.add(t);

  const partes = [
    `Jurado, ronda ${ronda}: ${nota.final} (mínimo ${NOTA_MINIMA}).`,
    criterio ? `Lo más bajo: ${NOMBRE_CRITERIO[criterio]} (${nota.criterios[criterio]}).` : "",
    nota.arreglos.length ? `Arreglos: ${nota.arreglos.join("; ")}` : "",
    prismaFalla ?? "",
  ].filter(Boolean);
  return { aprobado: false, nota, criterio, rehacer: plan.tareas.filter((t) => rehacer.has(t)), cambio: partes.join(" ") };
}
