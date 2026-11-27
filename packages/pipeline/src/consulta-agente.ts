// Hablarle directo a un agente desde el chat (sistema/124): «Nova: …», «Mira rápido: …», «Sonda: radar de Café Lento».
// Responde con su ficha, con lo que se sabe del cliente (su Dirección) y, si hay, con los registros del proyecto.
// Sonda busca en la web (con fuentes). Solo responde: no cambia nada del proyecto.
import { agentePorId } from "@anonymo/agentes";
import { claveAnthropic, ocultarClaves, textoDe } from "./ia.ts";
import { anotarGasto, exigirPresupuesto } from "./gasto.ts";
import { textoFicha } from "./fichas-agentes.ts";
import { leerCliches } from "./cliches.ts";

export async function consultarAgente(o: { agente: string; texto: string; rapido?: boolean; quien: "jay" | "luna"; cliente?: string; contexto?: string; proyecto?: string }): Promise<string> {
  const a = agentePorId(o.agente);
  if (!a) throw new Error("No conozco a ese agente.");
  const clave = claveAnthropic();
  if (!clave) throw new Error("Falta la clave de Anthropic.");
  await exigirPresupuesto();
  const web = o.agente === "sonda";
  const modelo = o.rapido ? process.env.ANTHROPIC_MODEL_RAPIDO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5" : process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  const sistema = [
    `Eres ${a.nombre}, ${a.rol} de Unmake, un estudio creativo de Cuenca dirigido por Jay y Luna. ${a.caracter} Tu frase: «${a.frase}».`,
    `Te escribe ${o.quien === "jay" ? "Jay" : "Luna"} directo en el chat. Responde como en un mensaje: texto plano, sin markdown (nada de #, ** ni tablas), con líneas cortas, números o guiones para las listas y una línea en blanco entre partes. Sin introducciones. No cambias nada de ningún proyecto: solo respondes.`,
    textoFicha(o.agente, { rapido: o.rapido, cliches: await leerCliches() }),
    web ? "Puedes buscar en la web. Pon el enlace de cada cosa que traigas." : "",
  ].filter(Boolean).join("\n\n");
  const usuario = [
    o.cliente ? `## Cliente\n${o.cliente}` : "",
    o.contexto ? `## Lo que sabemos (úsalo; es la base de tu respuesta)\n${o.contexto.slice(0, 12000)}` : "",
    `## Mensaje\n${o.texto}`,
  ].filter(Boolean).join("\n\n");
  const r = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: modelo, max_tokens: o.rapido ? 900 : 2500, system: sistema, messages: [{ role: "user", content: usuario }], ...(web ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] } : {}) }),
    signal: AbortSignal.timeout(100000),
  });
  if (!r.ok) throw new Error(ocultarClaves(`la API respondió ${r.status}: ${(await r.text()).slice(0, 160)}`));
  const d = (await r.json()) as { content?: { type: string; text?: string }[]; model?: string; usage?: { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } } };
  if (d.usage) await anotarGasto({ origen: o.agente, tarea: "consulta", proyecto: o.proyecto, modelo: d.model ?? modelo, entrada: d.usage.input_tokens ?? 0, salida: d.usage.output_tokens ?? 0, busquedas: d.usage.server_tool_use?.web_search_requests }).catch(() => 0);
  const texto = (d.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim() || textoDe(d as never);
  if (!texto) throw new Error(`${a.nombre} no respondió. Vuelve a intentar.`);
  return ocultarClaves(texto).slice(0, 9000);
}
