// Llamada corta a Claude para decisiones de Atlas (no para entregas). Sin clave, devuelve undefined.

/** Tapa cualquier cosa que parezca una clave antes de mostrar o guardar un mensaje de error. */
export function ocultarClaves(texto: string): string {
  return texto
    .replace(/sk-ant-[A-Za-z0-9_\-]+/g, "sk-ant-•••")
    .replace(/eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "eyJ•••")
    .replace(/(Bearer|x-api-key:?)\s+\S+/gi, "$1 •••");
}

/** La clave tal como se manda: sin espacios ni saltos de línea alrededor. Si trae texto antes, se avisa sin mostrarla. */
export function claveAnthropic(): string | undefined {
  const c = process.env.ANTHROPIC_API_KEY?.trim();
  if (!c) return undefined;
  if (!c.startsWith("sk-ant-") || /\s/.test(c))
    throw new Error("ANTHROPIC_API_KEY está mal pegada: el valor debe ser solo la clave, que empieza con «sk-ant-» (sin nombre ni espacios delante)");
  return c;
}

/**
 * Pensamiento según la tarea. Sonnet 5.5 y Haiku 5.5 piensan por defecto y ese pensamiento sale del mismo
 * max_tokens (y se cobra como salida). Para decisiones cortas y tareas livianas se apaga; para las creativas
 * se deja (con espacio de sobra). En otros modelos no se manda nada.
 */
export function pensamiento(modelo: string, profundo: boolean): Record<string, unknown> {
  if (profundo) return {};
  if (/haiku-5-5/.test(modelo)) return { thinking: { type: "disabled" } };
  if (/sonnet-5-5/.test(modelo)) return { thinking: { type: "between_tools" } };
  return {};
}

/**
 * Sin pensar (sistema/41): para seguir una entrega que ya se empezó a escribir. El registro mostró que cada vuelta
 * se iba ~150 s pensando de nuevo antes de escribir una palabra; al continuar, ya no hace falta.
 */
export function sinPensar(modelo: string): Record<string, unknown> {
  // Sonnet usa el mismo modo que las tareas livianas, también al rescatar o continuar.
  if (/sonnet-5-5/.test(modelo)) return pensamiento(modelo, false);
  if (/(haiku|opus)-5-5/.test(modelo)) return { thinking: { type: "disabled" } };
  return {};
}

/** Saca el texto de una respuesta; si no hay, explica por qué (por ejemplo, se acabó el espacio pensando). */
export function textoDe(d: { content?: { type: string; text?: string }[]; stop_reason?: string }): string {
  const t = (d.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  if (!t.trim()) throw new Error(`la respuesta llegó sin texto (motivo: ${d.stop_reason ?? "desconocido"}; bloques: ${(d.content ?? []).map((b) => b.type).join(", ") || "ninguno"})`);
  return t;
}

export async function preguntarClaude(sistema: string, usuario: string, maxTokens = 600): Promise<string | undefined> {
  const clave = claveAnthropic();
  if (!clave) return undefined;
  const modelo = process.env.ANTHROPIC_MODEL_RAPIDO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  const r = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      ...pensamiento(modelo, false),
      system: sistema,
      messages: [{ role: "user", content: usuario }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(ocultarClaves(`la API respondió ${r.status}: ${(await r.text()).slice(0, 160)}`));
  return textoDe((await r.json()) as { content: { type: string; text?: string }[]; stop_reason?: string });
}

/** Saca el primer objeto JSON de un texto. */
export function json<T>(texto: string | undefined): T | undefined {
  const m = texto?.match(/\{[\s\S]*\}/);
  if (!m) return undefined;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return undefined;
  }
}

/**
 * Respuesta estructurada (sistema/27): el modelo rellena una herramienta con su esquema y la API devuelve
 * el objeto ya armado. Así nunca llega un JSON cortado o mal escrito. Si el modelo no acepta forzar la
 * herramienta, se reintenta dejándolo elegir y, como último recurso, se lee el JSON del texto.
 */
export async function pedirEstructura<T>(
  sistema: string,
  usuario: string,
  h: { nombre: string; descripcion: string; esquema: Record<string, unknown> },
  maxTokens = 4000,
): Promise<T | undefined> {
  const clave = claveAnthropic();
  if (!clave) return undefined;
  const modelo = process.env.ANTHROPIC_MODEL_RAPIDO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
  const llamar = (forzar: boolean) =>
    fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: modelo,
        max_tokens: maxTokens,
        ...pensamiento(modelo, false),
        system: sistema,
        messages: [{ role: "user", content: usuario }],
        tools: [{ name: h.nombre, description: h.descripcion, input_schema: h.esquema }],
        tool_choice: forzar ? { type: "tool", name: h.nombre } : { type: "auto" },
      }),
      signal: AbortSignal.timeout(90000),
    });
  let r = await llamar(true);
  if (r.status === 400) r = await llamar(false);
  if (!r.ok) throw new Error(ocultarClaves(`la API respondió ${r.status}: ${(await r.text()).slice(0, 160)}`));
  const d = (await r.json()) as { content?: { type: string; name?: string; input?: unknown; text?: string }[]; stop_reason?: string };
  const uso = d.content?.find((b) => b.type === "tool_use" && b.name === h.nombre);
  if (uso?.input && typeof uso.input === "object") return uso.input as T;
  const desdeTexto = json<T>(textoDe(d));
  if (!desdeTexto) throw new Error(`la respuesta no se pudo leer (motivo: ${d.stop_reason ?? "desconocido"})`);
  return desdeTexto;
}
