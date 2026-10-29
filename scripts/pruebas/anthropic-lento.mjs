// API de Anthropic falsa en vivo: escribe despacio (para probar vueltas, señal y continuar).
import http from "node:http";
const PAUSA = Number(process.env.PAUSA ?? 300), PALABRAS = Number(process.env.PALABRAS ?? 80);
let n = 0;
http.createServer((req, res) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", async () => {
    const cuerpo = JSON.parse(b); n++;
    // Reproduce la restricción de Sonnet que antes pasaba inadvertida en las pruebas del estudio.
    if (/sonnet-5-5/.test(cuerpo.model ?? "") && cuerpo.thinking?.type === "disabled") {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "invalid_request_error", message: 'To turn thinking off on this model, send "thinking": {"type": "between_tools"}.' } }));
      return;
    }
    const sigue = cuerpo.messages.length > 1;
    console.log(new Date().toISOString(), "pedido", n, sigue ? "(sigue)" : "", cuerpo.stream ? "stream" : "json");
    res.writeHead(200, { "content-type": "text/event-stream" });
    const env = (e) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
    let cerrado = false; res.on("close", () => (cerrado = true));
    env({ type: "message_start", message: { usage: { input_tokens: 1200, output_tokens: 1 } } });
    env({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } });
    env({ type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "Pienso el enfoque." } });
    env({ type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "s" } });
    env({ type: "content_block_stop", index: 0 });
    await new Promise((x) => setTimeout(x, 1500));
    env({ type: "content_block_start", index: 1, content_block: { type: "text", text: "" } });
    const total = sigue ? 12 : PALABRAS;
    if (!sigue) env({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "## Resumen en tres líneas\n\n" } });
    for (let i = 0; i < total && !cerrado; i++) {
      env({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: `palabra${i} ` } });
      await new Promise((x) => setTimeout(x, sigue ? 50 : PAUSA));
    }
    if (cerrado) return;
    env({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "\n\nFin de la entrega.\n\nDICE: Listo, revisen.\nNECESITA: —" } });
    env({ type: "content_block_stop", index: 1 });
    env({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 300 } });
    env({ type: "message_stop" });
    res.end();
  });
}).listen(45888, () => console.log("anthropic lento en 45888"));
