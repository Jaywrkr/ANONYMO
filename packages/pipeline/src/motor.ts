// Quién escribe cada entrega. Sin clave: modo simulado (estructura y checklist). Con ANTHROPIC_API_KEY: el agente de verdad.
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId } from "./contratos.ts";
import type { Entrega, Pedido, TareaId } from "./tipos.ts";

export interface Contexto {
  pedido: Pedido;
  tarea: TareaId;
  /** Entregas que el contrato dice que debe leer. */
  lecturas: Entrega[];
  /** Nota de "cambiar" de Jay o Luna, si se está rehaciendo. */
  cambio?: string;
  version: number;
  preguntas: string[];
}

export type Resultado = Pick<Entrega, "dice" | "necesita" | "contenido" | "nota" | "modo">;

export interface Motor {
  nombre: "simulado" | "real";
  trabajar(ctx: Contexto): Promise<Resultado>;
}

function semilla(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

export const simulado: Motor = {
  nombre: "simulado",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas }) {
    const c = contratoPorId(tarea)!;
    const a = agentePorId(c.agente)!;
    const fase = FASES.find((f) => f.n === c.fase)!;
    const lineas = [
      `# ${c.entrega} · ${pedido.cliente}`,
      "",
      `> Modo simulado. Esta es la estructura que ${a.nombre} va a llenar cuando haya clave de Anthropic.`,
      "",
      `**Fase ${c.fase} · ${fase.nombre}** · ${a.nombre}, ${a.rol.toLowerCase()} · versión ${version}`,
      "",
      `**Pedido:** ${pedido.descripcion}`,
      "",
      `**Objetivo:** ${c.objetivo}`,
      "",
    ];
    if (cambio) lineas.push(`**Cambio pedido:** ${cambio}`, "");
    lineas.push("## Leí", "");
    lineas.push(...(lecturas.length ? lecturas.map((e) => `- ${agentePorId(e.agente)?.nombre}: ${e.titulo} (v${e.version})`) : ["- Solo el pedido."]), "");
    lineas.push("## Se revisa con", "", ...c.criterios.map((k) => `- [ ] ${k}`), "");
    lineas.push("## Borrador", "");
    for (const k of c.criterios) lineas.push(`### ${k}`, "", `Pendiente: ${a.nombre} lo resuelve para ${pedido.cliente}.`, "");
    if (c.herramientas?.length) lineas.push("## Herramientas pendientes", "", ...c.herramientas.map((h) => `- ${h}`), "");

    let nota: number | undefined;
    if (tarea === "6.trofeo") {
      nota = Math.round((6.6 + semilla(pedido.id + version) * 1.6) * 10) / 10;
      lineas.push("## Nota", "", "```json", JSON.stringify({ diseno: nota, usabilidad: nota, creatividad: nota, contenido: nota, final: nota, simulado: true }, null, 2), "```", "");
    }

    const necesita = c.herramientas?.length
      ? `Conectar ${c.herramientas.join(", ")} (fase 5.4).`
      : tarea === "1.atlas" && preguntas.length
        ? preguntas[0]
        : "El visto bueno de Jay o Luna.";
    return {
      dice: `${cambio ? "Rehice" : "Armé"} la estructura de ${c.entrega.toLowerCase()} para ${pedido.cliente}: ${c.criterios.length} puntos por cubrir.`,
      necesita,
      contenido: lineas.join("\n"),
      nota,
      modo: "simulado",
    };
  },
};

/** Motor real: llama a la API de Anthropic. Sin probar hasta que Jay ponga la clave. */
export const real: Motor = {
  nombre: "real",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas }) {
    const clave = process.env.ANTHROPIC_API_KEY;
    if (!clave) throw new Error("Falta ANTHROPIC_API_KEY.");
    const c = contratoPorId(tarea)!;
    const a = agentePorId(c.agente)!;
    const sistema = [
      `Eres ${a.nombre}, ${a.rol} en una agencia creativa de Cuenca, Ecuador, dirigida por Jay y Luna.`,
      `Carácter: ${a.caracter} Tu ADN: ${a.adn}. Tu superpoder: ${a.superpoder} Tu frase: "${a.frase}"`,
      "Escribes en español, directo y simple: frases cortas, palabras comunes, cero jerga y cero relleno.",
      "No inventes datos, enlaces ni precios de terceros: si algo hay que verificarlo, márcalo como [verificar].",
      "Responde en markdown. Al final agrega exactamente dos líneas:",
      "DICE: lo que dirías en la sala del proyecto, en una o dos frases.",
      "NECESITA: lo que necesitas del cliente o del equipo para seguir.",
      tarea === "6.trofeo" ? 'Antes de esas líneas agrega un bloque ```json con {"diseno","usabilidad","creatividad","contenido","final"} de 0 a 10 (pesos 40/30/20/10) y la línea NOTA: <final>.' : "",
    ].filter(Boolean).join("\n");
    const usuario = [
      `# Pedido de ${pedido.cliente}`,
      pedido.descripcion,
      pedido.contexto ? "```json\n" + JSON.stringify(pedido.contexto, null, 2) + "\n```" : "",
      `# Tu tarea: ${c.entrega} (versión ${version})`,
      c.objetivo,
      "Se revisa con:\n" + c.criterios.map((k) => `- ${k}`).join("\n"),
      cambio ? `# Cambio pedido por Jay o Luna\n${cambio}` : "",
      preguntas.length && c.fase === 1 ? "# Preguntas abiertas al cliente\n" + preguntas.map((p) => `- ${p}`).join("\n") : "",
      ...lecturas.map((e) => `# Entrega de ${agentePorId(e.agente)?.nombre}: ${e.titulo}\n${e.contenido}`),
    ].filter(Boolean).join("\n\n");

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
        max_tokens: 4000,
        system: sistema,
        messages: [{ role: "user", content: usuario }],
      }),
    });
    if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const datos = (await r.json()) as { content: { type: string; text?: string }[] };
    const texto = datos.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const linea = (k: string) => texto.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim();
    const nota = linea("NOTA");
    return {
      dice: linea("DICE") ?? "",
      necesita: linea("NECESITA") ?? "",
      contenido: texto.replace(/^(DICE|NECESITA|NOTA):.*$/gm, "").trim(),
      nota: nota ? Number.parseFloat(nota) : undefined,
      modo: "real",
    };
  },
};

export const elegirMotor = (forzarSimulado = false): Motor => (!forzarSimulado && process.env.ANTHROPIC_API_KEY ? real : simulado);
