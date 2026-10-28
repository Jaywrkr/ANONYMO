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

export async function preguntarClaude(sistema: string, usuario: string, maxTokens = 600): Promise<string | undefined> {
  const clave = claveAnthropic();
  if (!clave) return undefined;
  const r = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_RAPIDO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system: sistema,
      messages: [{ role: "user", content: usuario }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(ocultarClaves(`la API respondió ${r.status}: ${(await r.text()).slice(0, 160)}`));
  const d = (await r.json()) as { content: { type: string; text?: string }[] };
  return d.content.filter((b) => b.type === "text").map((b) => b.text).join("");
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
