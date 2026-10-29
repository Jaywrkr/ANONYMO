// La voz del cliente: lo que dice entra al proyecto, Atlas decide quién lo atiende y se rehace lo necesario.
import { agentePorId } from "@anonymo/agentes";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bitacora, carpeta, guardarProyecto, leerProyecto } from "./almacen.ts";
import { contratoPorId, dependientes } from "./contratos.ts";
import { json, preguntarClaude } from "./ia.ts";
import type { NotaCliente, Plan, Proyecto, TareaId } from "./tipos.ts";

/**
 * Reglas de Atlas para repartir un comentario. Con clave, Atlas podrá decidirlo leyendo el texto;
 * mientras tanto, palabras clave. Siempre se puede forzar con --agentes.
 */
const REGLAS: { palabras: RegExp; tareas: TareaId[] }[] = [
  { palabras: /elegan|lujo|premium|sofistic|refinad|exclusiv|sobri/i, tareas: ["3.mira", "4.orla", "3.rhea", "4.kine"] },
  { palabras: /color|paleta|logo|tipograf|letra|fuente|visual|estilo|moderno|minimal/i, tareas: ["3.mira", "4.orla"] },
  { palabras: /tono|texto|palabra|frase|copy|serio|cercano|formal|ingl[eé]s|traduc/i, tareas: ["3.rhea"] },
  { palabras: /animaci|movimiento|scroll|transici/i, tareas: ["4.kine"] },
  { palabras: /3d|interacti/i, tareas: ["4.lumen"] },
  { palabras: /foto|imagen|imágen|video/i, tareas: ["4.orla", "5.lente"] },
  { palabras: /secci[oó]n|p[aá]gina|men[uú]|estructura|orden|whatsapp|agenda|cita/i, tareas: ["4.orla"] },
  { palabras: /sonido|m[uú]sica|audio/i, tareas: ["3.eco", "4.eco"] },
  { palabras: /precio|presupuesto|caro|barato|costo|pago/i, tareas: ["1.ledger"] },
  { palabras: /plazo|fecha|semana|urgente|r[aá]pido|demora|antes|pronto|tiempo/i, tareas: ["4.tempo"] },
  { palabras: /nombre|marca|posicion|p[uú]blico|competencia/i, tareas: ["1.nova"] },
];

/** A quién manda Atlas el comentario, dentro de lo que existe en el plan. */
export function enrutar(texto: string, plan: Plan, forzadas?: string[]): TareaId[] {
  if (forzadas?.length) {
    const ids = forzadas.flatMap((a) => plan.tareas.filter((t) => t === a || t.endsWith(`.${a}`)));
    if (!ids.length) throw new Error(`Ninguno de ${forzadas.join(", ")} tiene tarea en este plan.`);
    return [...new Set(ids)];
  }
  const ids = REGLAS.filter((r) => r.palabras.test(texto)).flatMap((r) => r.tareas).filter((t) => plan.tareas.includes(t));
  // Sin pistas claras: lo ve quien diseña.
  return ids.length ? [...new Set(ids)] : plan.tareas.filter((t) => t === "4.orla" || t === "3.mira").slice(0, 1);
}

/** Registra lo que dijo el cliente y deja listo qué se rehace. No corre a los agentes: eso lo hace avanzar(). */
export function anotar(id: string, texto: string, quien: NotaCliente["quien"], forzadas?: string[]) {
  const p = leerProyecto(id);
  const base = enrutar(texto, p.plan, forzadas);
  const rehacer = dependientes(base, p.plan.tareas);
  const nota: NotaCliente = { fecha: new Date().toISOString(), texto, quien, tareas: base };
  p.notasCliente = [...(p.notasCliente ?? []), nota];

  for (const t of rehacer) p.tareas[t] = "rehacer";
  const fases = [...new Set(rehacer.map((t) => Number(t.split(".")[0])))];
  for (const f of fases) p.cambios[f] = `El cliente dijo: "${texto}"`;
  // Las fases con pausa se vuelven a revisar antes de seguir.
  for (const f of fases) if (p.plan.pausas.includes(f)) p.puertas.push({ fase: f, decision: "cambia", quien, nota: texto, fecha: nota.fecha });
  // Nueva evaluación del Jurado desde cero.
  p.rondasJurado = 0;
  p.juradoAceptado = false;
  p.esperaJurado = false;
  if (p.estado !== "parado") p.estado = "en-curso";
  // Lo que dijo el cliente manda: la revisión pendiente se retoma con lo rehecho (sistema/36).
  delete p.revision;
  guardarProyecto(p);

  const ruta = join(carpeta(), id, "cliente.md");
  if (!existsSync(ruta)) writeFileSync(ruta, `# Lo que dijo el cliente\n\n`);
  appendFileSync(ruta, `- ${nota.fecha.slice(0, 10)} · ${quien === "luna" ? "Luna" : quien === "cliente" ? "El cliente" : "Jay"} anotó: "${texto}" → ${base.map(nombreTarea).join(", ")}\n`);
  bitacora(id, `Cliente: "${texto}". Atlas lo manda a ${base.map(nombreTarea).join(", ")}; se rehacen ${rehacer.length} tareas.`);
  return { proyecto: p as Proyecto, base, rehacer };
}

export const nombreTarea = (t: TareaId) => `${agentePorId(t.split(".")[1])?.nombre} (${t.split(".")[0]})`;

export interface Reparto { tareas: TareaId[]; razon: string; como: "ia" | "palabras" }

/**
 * Atlas reparte un comentario. Con clave: lee el comentario completo y elige agentes con una razón.
 * Sin clave o si la IA falla: palabras clave.
 */
export async function repartir(texto: string, plan: Plan): Promise<Reparto> {
  const enPlan = [...new Set(plan.tareas)];
  try {
    const lista = enPlan
      .filter((t) => !t.startsWith("6.") && !t.startsWith("7."))
      .map((t) => {
        const c = contratoPorId(t)!;
        const a = agentePorId(c.agente)!;
        return `${t} · ${a.nombre}, ${a.rol}: ${c.entrega}`;
      })
      .join("\n");
    const r = json<{ tareas: string[]; razon: string }>(
      await preguntarClaude(
        "Eres Atlas, el orquestador de una agencia creativa. Recibes un comentario de un cliente y decides qué tareas del plan deben rehacerse para atenderlo. Elige las mínimas necesarias (1 a 4); evita la fase 1 salvo que el comentario cambie el fondo del proyecto. Responde solo JSON: {\"tareas\": [\"3.mira\", ...], \"razon\": \"una frase en español\"}.",
        `Comentario del cliente: "${texto}"\n\nTareas del plan:\n${lista}`,
      ),
    );
    const tareas = (r?.tareas ?? []).filter((t): t is TareaId => enPlan.includes(t as TareaId));
    if (tareas.length) return { tareas, razon: r!.razon ?? "", como: "ia" };
  } catch {
    // sigue con palabras clave
  }
  const tareas = enrutar(texto, plan);
  return { tareas, razon: "Por palabras clave del comentario.", como: "palabras" };
}
