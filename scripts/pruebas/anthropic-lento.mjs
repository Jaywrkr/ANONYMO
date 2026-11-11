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
    // Faro escribe guiones (sistema/71): uno fijo de prueba, con el cliente y la duración que le llegan.
    if (cuerpo.system?.startsWith("Faro, contenido de ANONYMO")) {
      const texto = String(cuerpo.messages?.[0]?.content ?? "");
      const cliente = texto.split("## Cliente\n")[1]?.split("\n")[0] ?? "la marca";
      const input = { titulo: `Guion de prueba para ${cliente}`, gancho: "¿Y si tu agencia trabajara mientras duermes?", partes: [{ texto: "Somos dos personas y veintidós agentes.", toma: "Plano medio de Jay y Luna en el estudio" }, { texto: "Cada uno hace lo suyo, como en una oficina de verdad.", toma: "Pantalla con la oficina de agentes" }], cierre: "Escríbenos y te mostramos tu web en una semana.", tomas: ["Jay y Luna en el estudio", "Pantalla de la oficina", "Logo al final"] };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_faro", name: "escribir_guion", input }], usage: { input_tokens: 400, output_tokens: 200 } }));
      return;
    }
    // Atlas del departamento de video (sistema/63–64): lee el pedido con reglas simples y responde con la herramienta.
    // Recibe la hoja de miniaturas como imagen y las partes numeradas en el texto.
    if (cuerpo.system?.startsWith("Corte, editor de video")) {
      const bloques = Array.isArray(cuerpo.messages?.[0]?.content) ? cuerpo.messages[0].content : [{ type: "text", text: String(cuerpo.messages?.[0]?.content ?? "") }];
      const conImagen = bloques.some((b) => b.type === "image" && b.source?.media_type === "image/jpeg" && b.source.data?.length > 100);
      const texto = bloques.find((b) => b.type === "text")?.text ?? "";
      const pedido = (texto.split("## Pedido\n")[1] ?? "").toLowerCase();
      const acciones = [], hecho = [], noSePuede = [];
      if (/silencio|pausa/.test(pedido)) { acciones.push({ tipo: "silencios", activo: true, pausaMax: 0.6 }); hecho.push("corté los silencios"); }
      if (/dinámico/.test(pedido)) { acciones.push({ tipo: "silencios", activo: true, pausaMax: 0.3 }); hecho.push("dejé el ritmo más rápido"); }
      if (/inicio|arranque/.test(pedido)) { acciones.push({ tipo: "quitar", unidad: "parte", desde: 1, hasta: 1 }); hecho.push(conImagen ? "quité la parte 1, donde todavía no empieza" : "quité la parte 1"); }
      if (/devuelve/.test(pedido)) { acciones.push({ tipo: "devolver", unidad: "parte", desde: 1, hasta: 99 }); hecho.push("devolví todas las partes"); }
      if (/ruido/.test(pedido)) { acciones.push({ tipo: "audio", limpiarRuido: true }); hecho.push("limpié el ruido"); }
      if (/subtítulo/.test(pedido)) noSePuede.push("Subtítulos: sin transcripción no hay texto que poner.");
      // Fase 3 (sistema/65): motion y marca. La marca solo si el video tiene una con logo o música.
      const marca = texto.split("## Marca\n")[1]?.split("\n")[0] ?? "";
      if (/zoom/.test(pedido)) { acciones.push({ tipo: "zoom", modo: "alterno" }); hecho.push("puse zoom en cada corte"); }
      if (/fundido/.test(pedido)) { acciones.push({ tipo: "transicion", estilo: "fundido" }); hecho.push("puse fundidos cortos"); }
      if (/logo|música/.test(pedido)) {
        if (/no tiene marca/.test(marca)) noSePuede.push("Logo y música: este video no tiene marca. Elígela en «Marca» o créala en «Marcas».");
        else {
          acciones.push({ tipo: "marca", ...(/logo/.test(pedido) ? { cierre: true, logoEsquina: /esquina/.test(pedido) } : {}), ...(/música/.test(pedido) ? { musica: true } : {}) });
          hecho.push(/música/.test(pedido) ? "sumé la música de la marca" : "cerré con el logo");
        }
      }
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
