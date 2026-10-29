// La API de Anthropic en vivo (sistema/36): la respuesta llega por partes (streaming).
// Así se sabe en todo momento qué hace el agente (pensando, buscando, escribiendo) y cuántas palabras lleva,
// y si se acaba el tiempo de la vuelta se corta a tiempo sin perder lo escrito.

export type BloqueApi = { type: string; text?: string; [k: string]: unknown };

export interface RespuestaEnVivo {
  content: BloqueApi[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number; server_tool_use?: { web_search_requests?: number } };
  /** Se cortó porque se acababa el tiempo de la vuelta (no la API). */
  sinTiempo?: boolean;
}

export type FaseVivo = "pensando" | "buscando" | "escribiendo";

/** Lo que va llegando. Se arma en un objeto aparte para no perderlo si la conexión se corta a la mitad. */
export interface Acumulado { bloques: BloqueApi[]; stop: string; usage: RespuestaEnVivo["usage"]; palabras: number }
export const acumulado = (): Acumulado => ({ bloques: [], stop: "", usage: { input_tokens: 0, output_tokens: 0 }, palabras: 0 });
const respuesta = (a: Acumulado): RespuestaEnVivo => ({ content: a.bloques.filter(Boolean), stop_reason: a.stop, usage: a.usage });

/** Lee un stream SSE y arma los bloques tal como los devolvería la API sin streaming. */
export async function leerStream(
  cuerpo: ReadableStream<Uint8Array>,
  alAvanzar?: (fase: FaseVivo, palabras: number) => void,
  acum: Acumulado = acumulado(),
): Promise<RespuestaEnVivo> {
  const bloques = acum.bloques;
  const jsonParcial: Record<number, string> = {};
  const usage = acum.usage;
  let resto = "";
  const decod = new TextDecoder();
  const lector = cuerpo.getReader();

  const procesar = (ev: Record<string, unknown>) => {
    switch (ev.type) {
      case "message_start": {
        const u = (ev.message as { usage?: RespuestaEnVivo["usage"] })?.usage;
        if (u) { usage.input_tokens = u.input_tokens ?? 0; usage.output_tokens = u.output_tokens ?? 0; }
        break;
      }
      case "content_block_start": {
        const b = { ...(ev.content_block as BloqueApi) };
        bloques[ev.index as number] = b;
        if (b.type === "thinking" || b.type === "redacted_thinking") alAvanzar?.("pensando", acum.palabras);
        else if (b.type === "server_tool_use") alAvanzar?.("buscando", acum.palabras);
        else if (b.type === "text") alAvanzar?.("escribiendo", acum.palabras);
        break;
      }
      case "content_block_delta": {
        const i = ev.index as number;
        const b = bloques[i];
        const d = ev.delta as Record<string, unknown>;
        if (!b || !d) break;
        if (d.type === "text_delta") {
          b.text = (b.text ?? "") + String(d.text ?? "");
          acum.palabras += String(d.text ?? "").split(/\s+/).filter(Boolean).length;
          alAvanzar?.("escribiendo", acum.palabras);
        } else if (d.type === "thinking_delta") {
          b.thinking = String(b.thinking ?? "") + String(d.thinking ?? "");
          alAvanzar?.("pensando", acum.palabras);
        } else if (d.type === "signature_delta") {
          b.signature = String(d.signature ?? "");
        } else if (d.type === "input_json_delta") {
          jsonParcial[i] = (jsonParcial[i] ?? "") + String(d.partial_json ?? "");
        } else if (d.type === "citations_delta") {
          b.citations = [...((b.citations as unknown[]) ?? []), d.citation];
        }
        break;
      }
      case "content_block_stop": {
        const i = ev.index as number;
        if (jsonParcial[i] !== undefined && bloques[i]) {
          try { bloques[i].input = JSON.parse(jsonParcial[i] || "{}"); } catch { bloques[i].input = {}; }
          delete jsonParcial[i];
        }
        break;
      }
      case "message_delta": {
        const d = ev.delta as { stop_reason?: string } | undefined;
        if (d?.stop_reason) acum.stop = d.stop_reason;
        const u = ev.usage as Partial<RespuestaEnVivo["usage"]> | undefined;
        if (u?.output_tokens !== undefined) usage.output_tokens = u.output_tokens;
        if (u?.input_tokens) usage.input_tokens = u.input_tokens;
        if (u?.server_tool_use) usage.server_tool_use = u.server_tool_use;
        break;
      }
      case "error": {
        const e = ev.error as { type?: string; message?: string } | undefined;
        throw new Error(`API: ${e?.type ?? "error"} ${e?.message ?? ""}`.trim());
      }
    }
  };

  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    resto += decod.decode(value, { stream: true });
    let corte: number;
    while ((corte = resto.indexOf("\n\n")) >= 0) {
      const evento = resto.slice(0, corte);
      resto = resto.slice(corte + 2);
      const datos = evento.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!datos || datos === "[DONE]") continue;
      let ev: Record<string, unknown>;
      try { ev = JSON.parse(datos); } catch { continue; }
      procesar(ev);
    }
  }
  return respuesta(acum);
}

/**
 * Pide a la API en vivo. Si `plazo` (hora en ms) llega antes de que termine, corta la conexión y devuelve
 * lo que alcanzó a llegar, marcado `sinTiempo`. El que llama decide cómo seguir en otra vuelta.
 */
export async function pedirEnVivo(
  url: string,
  cabeceras: Record<string, string>,
  cuerpo: Record<string, unknown>,
  op: { plazo?: number; alAvanzar?: (fase: FaseVivo, palabras: number) => void } = {},
): Promise<RespuestaEnVivo> {
  const control = new AbortController();
  let sinTiempo = false;
  const reloj = op.plazo ? setTimeout(() => { sinTiempo = true; control.abort(); }, Math.max(0, op.plazo - Date.now())) : undefined;
  const acum = acumulado();
  try {
    const r = await fetch(url, { method: "POST", headers: cabeceras, body: JSON.stringify({ ...cuerpo, stream: true }), signal: control.signal });
    if (!r.ok || !r.body) throw new Error(`API ${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`);
    return await leerStream(r.body, op.alAvanzar, acum);
  } catch (e) {
    if (sinTiempo) {
      // Un bloque de pensamiento sin firma o una búsqueda sin resultado no se pueden reenviar: se quitan.
      const r = respuesta(acum);
      return { ...r, content: r.content.filter((b) => b.type === "text"), stop_reason: "sin_tiempo", sinTiempo: true };
    }
    throw e;
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}
