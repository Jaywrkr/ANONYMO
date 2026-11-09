// API de Anthropic falsa en vivo: escribe despacio (para probar vueltas, señal y continuar).
import http from "node:http";
const PAUSA = Number(process.env.PAUSA ?? 300), PALABRAS = Number(process.env.PALABRAS ?? 80);
let n = 0;
http.createServer((req, res) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", async () => {
    const cuerpo = JSON.parse(b); n++;
    // Con ANTHROPIC_REGISTRO, guarda cada pedido para comprobar qué le llegó a la IA (sistema/54).
    if (process.env.ANTHROPIC_REGISTRO) (await import("node:fs")).appendFileSync(process.env.ANTHROPIC_REGISTRO, b + "\n");
    // Reproduce la restricción de Sonnet que antes pasaba inadvertida en las pruebas del estudio.
    if (/sonnet-5-5/.test(cuerpo.model ?? "") && cuerpo.thinking?.type === "disabled") {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "invalid_request_error", message: 'To turn thinking off on this model, send "thinking": {"type": "between_tools"}.' } }));
      return;
    }
    // Como la API real: Sonnet 5.5 no acepta forzar una herramienta (sistema/63).
    if (/sonnet-5-5/.test(cuerpo.model ?? "") && (cuerpo.tool_choice?.type === "tool" || cuerpo.tool_choice?.type === "any")) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "invalid_request_error", message: 'tool_choice: type "tool" and "any" are not supported for this model.' } }));
      return;
    }
    // Atlas del departamento de video (sistema/63): lee el pedido con reglas simples y responde con la herramienta.
    if (cuerpo.system?.startsWith("Atlas, departamento de video")) {
      const texto = String(cuerpo.messages?.[0]?.content ?? "");
      const pedido = (texto.split("## Pedido\n")[1] ?? "").toLowerCase();
      const ed = JSON.parse(texto.match(/## Edición actual\n(\{[^\n]+\})/)?.[1] ?? "{}");
      const acciones = [], hecho = [], noSePuede = [];
      if (/silencio|dinámico|pausa/.test(pedido)) { acciones.push({ tipo: "silencios", activo: true, pausaMax: /dinámico/.test(pedido) ? 0.4 : 0.6 }); hecho.push("corté los silencios"); }
      if (/marca/.test(pedido)) { acciones.push({ tipo: "subtitulos", activo: true, plantilla: "marca" }); hecho.push("puse los subtítulos de marca"); }
      if (/más grande/.test(pedido)) { acciones.push({ tipo: "subtitulos", tamano: Math.round((ed.subtitulos?.tamano ?? 1) * 125) / 100 }); hecho.push("agrandé el texto"); }
      if (/sin subtítulos/.test(pedido)) { acciones.push({ tipo: "subtitulos", activo: false }); hecho.push("quité los subtítulos"); }
      if (/inicio/.test(pedido)) { acciones.push({ tipo: "quitar", unidad: "palabra", desde: 0, hasta: 1 }); hecho.push("quité el saludo del inicio"); }
      if (/zoom/.test(pedido)) noSePuede.push("Zoom en la frase clave: llega con la parte de motion.");
      if (/logo/.test(pedido)) noSePuede.push("Logo al final: llega con los kits de marca.");
      const formatos = [...(/vertical|9:16/.test(pedido) ? ["9:16"] : []), ...(/tres formatos/.test(pedido) ? ["9:16", "1:1", "16:9"] : [])];
      if (formatos.length) { acciones.push({ tipo: "armar", formatos: [...new Set(formatos)] }); hecho.push("armo el video final"); }
      const respuesta = hecho.length ? `Listo: ${hecho.join(", ")}.` : "No entendí qué cambiar. ¿Me lo dices de otra forma?";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "editar_video", input: { respuesta, acciones, noSePuede } }], usage: { input_tokens: 900, output_tokens: 120 } }));
      return;
    }
    if(cuerpo.system?.startsWith('Comprobación de conexión ANONYMO.')){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({content:[{type:'text',text:'LISTO'}],usage:{input_tokens:10,output_tokens:2}}));return;}
    // Comparación a ciegas contra el banco (sistema/55): la pieza B siempre gana, con arreglos para las dos.
    if (cuerpo.system?.startsWith('Revisor de calidad.') && JSON.stringify(cuerpo.messages).includes('# Comparación a ciegas')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({content:[{type:'text',text:JSON.stringify({ganador:'B',porque:'Comparación de prueba: B tiene una idea más clara.',arreglosA:['Arreglo de prueba A1','Arreglo de prueba A2','Arreglo de prueba A3'],arreglosB:['Arreglo de prueba B1','Arreglo de prueba B2','Arreglo de prueba B3']})}],usage:{input_tokens:100,output_tokens:60},stop_reason:'end_turn'}));
      return;
    }
    if (cuerpo.system?.startsWith('Revisor de calidad.')) {
      const texto=cuerpo.messages[0].content.find(c=>c.type==='text'&&c.text.includes('# Revisión de calidad'))?.text??'';
      const condiciones=JSON.parse(texto.match(/CONDICIONES: ([^\n]+)/)?.[1]??'[]');
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({content:[{type:'text',text:JSON.stringify({nota:9,resumen:'Revisión de prueba: condiciones comprobadas con la API falsa.',comprobaciones:condiciones.map(c=>({id:c.id,estado:'cumple',evidencia:'Comprobación de prueba para '+c.texto}))})}],usage:{input_tokens:100,output_tokens:100},stop_reason:'end_turn'}));
      return;
    }
    if (cuerpo.system?.includes('Consulta de solo lectura.')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({content:[{type:'text',text:JSON.stringify({respuesta:'Respuesta ficticia: revisa el avance del proyecto en sus registros.',fuentes:['proyecto','pedido']})}],usage:{input_tokens:100,output_tokens:50}}));return;
    }
    if (cuerpo.system?.startsWith('Interpreta un encargo explícito')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({content:[{type:'text',text:JSON.stringify({accion:'pausar',nota:'Pausa ficticia solicitada desde el chat.'})}],usage:{input_tokens:100,output_tokens:50}}));return;
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
