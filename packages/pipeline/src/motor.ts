// Quién escribe cada entrega. Sin clave: modo simulado (estructura y checklist). Con ANTHROPIC_API_KEY: el agente de verdad.
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId } from "./contratos.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CARPETA } from "./almacen.ts";
import { archivoEntrega, type Entrega, type Pedido, type ResultadoHerramienta, type TareaId } from "./tipos.ts";

export interface Contexto {
  pedido: Pedido;
  tarea: TareaId;
  /** Entregas que el contrato dice que debe leer. */
  lecturas: Entrega[];
  /** Nota de "cambiar" de Jay o Luna, si se está rehaciendo. */
  cambio?: string;
  version: number;
  preguntas: string[];
  /** Lo que ya trajeron las herramientas (dominios, auditoría...). */
  herramientas: ResultadoHerramienta[];
  /** Todo lo que ha dicho el cliente, en orden. Manda sobre las suposiciones del equipo. */
  cliente: string[];
}

export type Resultado = Pick<Entrega, "dice" | "necesita" | "contenido" | "nota" | "modo" | "datos">;

const seccionHerramientas = (h: ResultadoHerramienta[]) =>
  h.length ? ["## Datos de herramientas", "", ...h.flatMap((x) => [`**${x.herramienta}** ${x.ok ? "" : "(pendiente)"}`, "", x.resumen, ""])] : [];
const datosHerramientas = (h: ResultadoHerramienta[]) =>
  Object.fromEntries(h.filter((x) => x.datos !== undefined).map((x) => [x.herramienta, x.datos]));

export interface Motor {
  nombre: "simulado" | "real" | "manual";
  trabajar(ctx: Contexto): Promise<Resultado>;
}

function semilla(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

export const simulado: Motor = {
  nombre: "simulado",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas, herramientas, cliente }) {
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
    if (cliente.length) lineas.push("## Lo que dijo el cliente", "", ...cliente.map((x) => `- "${x}"`), "");
    lineas.push("## Leí", "");
    lineas.push(...(lecturas.length ? lecturas.map((e) => `- ${agentePorId(e.agente)?.nombre}: ${e.titulo} (v${e.version})`) : ["- Solo el pedido."]), "");
    lineas.push("## Se revisa con", "", ...c.criterios.map((k) => `- [ ] ${k}`), "");
    lineas.push("## Borrador", "");
    for (const k of c.criterios) lineas.push(`### ${k}`, "", `Pendiente: ${a.nombre} lo resuelve para ${pedido.cliente}.`, "");
    lineas.push(...seccionHerramientas(herramientas));

    let nota: number | undefined;
    if (tarea === "6.trofeo") {
      // Simulado: arranca cerca del mínimo y sube con cada versión, para probar las rondas.
      const r1 = (x: number) => Math.round(x * 10) / 10;
      const base = 6 + semilla(pedido.id) * 0.9 + (version - 1) * 0.7;
      const notas = { diseno: r1(base + 0.3), usabilidad: r1(base + 0.5), creatividad: r1(base - 0.5 + semilla(pedido.id + "c") * 0.3), contenido: r1(base + 0.2) };
      nota = r1(notas.diseno * 0.4 + notas.usabilidad * 0.3 + notas.creatividad * 0.2 + notas.contenido * 0.1);
      const bajo = Object.entries(notas).sort((a, b) => a[1] - b[1])[0][0];
      lineas.push("## Nota", "", "```json", JSON.stringify({ ...notas, final: nota, arreglos: [`Subir ${bajo} (simulado)`], simulado: true }, null, 2), "```", "");
    }

    const falta = herramientas.find((x) => !x.ok);
    const necesita = falta
      ? falta.falta ?? falta.resumen.split("\n")[0]
      : tarea === "1.atlas" && preguntas.length
        ? preguntas[0]
        : "El visto bueno de Jay o Luna.";
    return {
      dice: `${cambio ? "Rehice" : "Armé"} la estructura de ${c.entrega.toLowerCase()} para ${pedido.cliente}: ${c.criterios.length} puntos por cubrir.`,
      necesita,
      contenido: lineas.join("\n"),
      nota,
      datos: herramientas.length ? datosHerramientas(herramientas) : undefined,
      modo: "simulado",
    };
  },
};

/** Motor real: llama a la API de Anthropic. Sin probar hasta que Jay ponga la clave. */
export const real: Motor = {
  nombre: "real",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas, herramientas, cliente }) {
    const clave = process.env.ANTHROPIC_API_KEY;
    if (!clave) throw new Error("Falta ANTHROPIC_API_KEY.");
    const c = contratoPorId(tarea)!;
    const a = agentePorId(c.agente)!;
    const buscaEnWeb = c.herramientas?.includes("web");
    const sistema = [
      `Eres ${a.nombre}, ${a.rol} en una agencia creativa de Cuenca, Ecuador, dirigida por Jay y Luna.`,
      `Carácter: ${a.caracter} Tu ADN: ${a.adn}. Tu superpoder: ${a.superpoder} Tu frase: "${a.frase}"`,
      "Escribes en español, directo y simple: frases cortas, palabras comunes, cero jerga y cero relleno.",
      "No inventes datos, enlaces ni precios de terceros: si algo hay que verificarlo, márcalo como [verificar].",
      buscaEnWeb ? "Puedes buscar en la web. Usa fuentes reales y pon el enlace de cada una." : "",
      "Responde en markdown. Al final agrega exactamente dos líneas:",
      "DICE: lo que dirías en la sala del proyecto, en una o dos frases.",
      "NECESITA: lo que necesitas del cliente o del equipo para seguir.",
      tarea === "2.verba" ? "Antes de esas líneas agrega: FINALISTAS: nombre1, nombre2, nombre3, nombre4, nombre5" : "",
      tarea === "6.trofeo"
        ? 'Califica como jurado de Awwwards, con exigencia real. Antes de esas líneas agrega un bloque ```json con {"diseno","usabilidad","creatividad","contenido","final","arreglos"}: notas de 0 a 10 (pesos 40/30/20/10) y "arreglos" con los tres cambios que más suben la nota, cada uno nombrando al agente responsable. Luego la línea NOTA: <final>.'
        : "",
    ].filter(Boolean).join("\n");
    const usuario = [
      `# Pedido de ${pedido.cliente}`,
      pedido.descripcion,
      pedido.contexto ? "```json\n" + JSON.stringify(pedido.contexto, null, 2) + "\n```" : "",
      `# Tu tarea: ${c.entrega} (versión ${version})`,
      c.objetivo,
      "Se revisa con:\n" + c.criterios.map((k) => `- ${k}`).join("\n"),
      cliente.length ? "# Lo que dijo el cliente (manda sobre cualquier suposición)\n" + cliente.map((x) => `- "${x}"`).join("\n") : "",
      cambio ? `# Cambio pedido\n${cambio}` : "",
      preguntas.length && c.fase === 1 ? "# Preguntas abiertas al cliente\n" + preguntas.map((p) => `- ${p}`).join("\n") : "",
      herramientas.length ? "# Datos de herramientas (reales, úsalos tal cual)\n" + herramientas.map((h) => `## ${h.herramienta}\n${h.resumen}`).join("\n\n") : "",
      ...lecturas.map((e) => `# Entrega de ${agentePorId(e.agente)?.nombre}: ${e.titulo}\n${e.contenido}`),
    ].filter(Boolean).join("\n\n");

    type Bloque = { type: string; text?: string };
    const mensajes: { role: "user" | "assistant"; content: string | Bloque[] }[] = [{ role: "user", content: usuario }];
    const bloques: Bloque[] = [];
    // Con búsqueda web la API puede pausar el turno: se continúa hasta 3 veces.
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
          max_tokens: 6000,
          system: sistema,
          messages: mensajes,
          ...(buscaEnWeb ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }] } : {}),
        }),
      });
      if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const res = (await r.json()) as { content: Bloque[]; stop_reason: string };
      bloques.push(...res.content);
      if (res.stop_reason !== "pause_turn") break;
      mensajes.push({ role: "assistant", content: res.content });
    }
    const texto = bloques.filter((b) => b.type === "text").map((b) => b.text).join("");
    const linea = (k: string) => texto.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim();
    const nota = linea("NOTA");
    const finalistas = linea("FINALISTAS")?.split(",").map((x) => x.trim()).filter(Boolean);
    let jurado: unknown;
    if (tarea === "6.trofeo") {
      try {
        jurado = JSON.parse(texto.match(/```json\s*([\s\S]*?)```/)?.[1] ?? "null") ?? undefined;
      } catch {
        jurado = undefined;
      }
    }
    const datos = { ...datosHerramientas(herramientas), ...(finalistas?.length ? { finalistas } : {}), ...(jurado ? { jurado } : {}) };
    return {
      dice: linea("DICE") ?? "",
      necesita: linea("NECESITA") ?? "",
      contenido: [texto.replace(/^(DICE|NECESITA|NOTA|FINALISTAS):.*$/gm, "").trim(), "", ...seccionHerramientas(herramientas)].join("\n").trim(),
      nota: nota ? Number.parseFloat(nota) : undefined,
      datos: Object.keys(datos).length ? datos : undefined,
      modo: "real",
    };
  },
};

/**
 * Motor manual: usa borradores escritos a mano (o en una sesión con Claude) en
 * proyectos/<id>/borradores/<fase>-<agente>.md, con el mismo frontmatter que una entrega.
 * Para una versión nueva: <fase>-<agente>.v2.md. Si falta un borrador, cae al simulado.
 */
export const manual: Motor = {
  nombre: "manual",
  async trabajar(ctx) {
    const base = join(CARPETA, ctx.pedido.id, "borradores", archivoEntrega(ctx.tarea).replace(".md", ""));
    const propia = `${base}.v${ctx.version}.md`;
    const ruta = [propia, `${base}.md`].find(existsSync);
    if (!ruta) return simulado.trabajar(ctx);
    // Se rehace pero no hay borrador nuevo: el agente revisó y su entrega sigue igual.
    const revisado = ctx.version > 1 && ruta !== propia && ctx.cambio ? `> Revisado tras el cambio (${ctx.cambio.replace(/\n/g, " ")}): esta entrega no necesita cambios.\n\n` : "";
    const texto = readFileSync(ruta, "utf8");
    const m = texto.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
    const datos: Record<string, unknown> = {};
    for (const l of (m?.[1] ?? "").split("\n")) {
      const i = l.indexOf(": ");
      if (i > 0) datos[l.slice(0, i)] = JSON.parse(l.slice(i + 2));
    }
    const contenido = (m?.[2] ?? texto).trim();
    const extra = { ...datosHerramientas(ctx.herramientas), ...((datos.datos as Record<string, unknown>) ?? {}) };
    return {
      dice: String(datos.dice ?? ""),
      necesita: String(datos.necesita ?? ""),
      // La nota de revisión va debajo del título, no encima.
      contenido: [contenido.replace(/^(# .*\n+)?/, (t) => t + revisado), "", ...seccionHerramientas(ctx.herramientas)].join("\n").trim(),
      nota: typeof datos.nota === "number" ? datos.nota : undefined,
      datos: Object.keys(extra).length ? extra : undefined,
      modo: "manual",
    };
  },
};

export function elegirMotor(op: { simulado?: boolean; manual?: boolean } | boolean = false): Motor {
  const o = typeof op === "boolean" ? { simulado: op } : op;
  if (o.manual) return manual;
  return !o.simulado && process.env.ANTHROPIC_API_KEY ? real : simulado;
}
