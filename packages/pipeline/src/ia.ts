// Llamada corta a Claude para decisiones de Atlas (no para entregas). Sin clave, devuelve undefined.
export async function preguntarClaude(sistema: string, usuario: string, maxTokens = 600): Promise<string | undefined> {
  const clave = process.env.ANTHROPIC_API_KEY;
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
  if (!r.ok) throw new Error(`la API respondió ${r.status}: ${(await r.text()).slice(0, 160)}`);
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
