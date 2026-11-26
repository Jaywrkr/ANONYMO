// API de Anthropic falsa en vivo: escribe despacio (para probar vueltas, señal y continuar).
import http from "node:http";
const PAUSA = Number(process.env.PAUSA ?? 300), PALABRAS = Number(process.env.PALABRAS ?? 80);
let n = 0;
http.createServer((req, res) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", async () => {
    const cuerpo = JSON.parse(b); n++;
    // Estricta como la API real (sistema/110): un bloque de texto vacío es un 400. Así no vuelve a pasar en producción.
    const vacio = (cuerpo.messages ?? []).some((m) => Array.isArray(m.content) && m.content.some((c) => c?.type === "text" && !String(c.text ?? "").trim()));
    if (vacio || (typeof cuerpo.system === "string" && !cuerpo.system.trim())) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "messages: text content blocks must be non-empty" } })); return; }
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
    // Mira lee una guía de marca en PDF (sistema/117): tiene que llegar el documento.
    if (cuerpo.tools?.[0]?.name === "leer_guia_de_marca") {
      const doc = (cuerpo.messages?.[0]?.content ?? []).find?.((b) => b.type === "document" && b.source?.media_type === "application/pdf" && b.source?.data);
      if (!doc) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { type: "invalid_request_error", message: "falta el PDF" } })); return; }
      const input = { colores: [{ hex: "#01095C", nombre: "navy" }, { hex: "#2F43D1", nombre: "azul" }, { hex: "#FFFFFF", nombre: "fondo" }], letras: [{ familia: "IBM Plex Sans", uso: "títulos" }], palabras: ["confiable", "claro", "técnico"], si: ["Usar el logo sobre fondo blanco"], no: ["No deformar el logo", "No usar degradados"] };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_guia", name: "leer_guia_de_marca", input }], usage: { input_tokens: 3000, output_tokens: 120 } }));
      return;
    }
    // Faro diseña una pieza (sistema/123): tiene que ver las referencias y el material como imágenes; escribe el HTML
    // con «material:» y, si le piden cambiar, lo dice en el diseño. El juicio da 5 a la primera versión y 8 a la segunda.
    if (cuerpo.tools?.[0]?.name === "disenar_pieza") {
      const c = cuerpo.messages?.[0]?.content ?? [];
      const t = Array.isArray(c) ? c.filter((b) => b.type === "text").map((b) => b.text).join("\n") : String(c);
      const imgs = Array.isArray(c) ? c.filter((b) => b.type === "image" && b.source?.data).length : 0;
      if (!/Referencia de lo que es bueno/.test(t) || !/Material del proyecto/.test(t) || imgs < 2) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { type: "invalid_request_error", message: "faltan las referencias o el material" } })); return; }
      const lista = (t.split("## Material disponible (nombres exactos)\n")[1] ?? "").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).split(":")[0]);
      const tramo = lista.find((x) => /-p\d\.jpg$/.test(x)) ?? lista[0], logo = lista.find((x) => x.endsWith("-logo.png"));
      const otra = /Lo que hay que cambiar/.test(t);
      const lamina = (fondo, cuerpo) => `<!doctype html><html><head><style>html,body{margin:0;width:1080px;height:1350px;overflow:hidden;background:${fondo}}</style></head><body>${cuerpo}</body></html>`;
      const input = { formato: "carrusel", texto: "Coresolutions\nWeb · 2026", porQue: otra ? "Más aire, como la referencia." : "Un tramo a sangre y el logo solo.", laminas: [
        { html: lamina("#01095c", `<img src="material:${tramo}" style="position:absolute;inset:${otra ? 120 : 0}px;width:${otra ? 840 : 1080}px;height:${otra ? 1110 : 1350}px;object-fit:cover"><script>alert(1)</script>`) },
        ...(logo ? [{ html: lamina("#01095c", `<img src="material:${logo}" style="position:absolute;left:290px;top:600px;width:500px">`) }] : []),
      ] };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_dis", name: "disenar_pieza", input }], usage: { input_tokens: 9000, output_tokens: 1500 } }));
      return;
    }
    if (cuerpo.tools?.[0]?.name === "juzgar_pieza") {
      const c = cuerpo.messages?.[0]?.content ?? [];
      const t = Array.isArray(c) ? c.filter((b) => b.type === "text").map((b) => b.text).join("\n") : String(c);
      if (!/La pieza a juzgar/.test(t) || !/Referencia de lo que es bueno/.test(t)) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { type: "invalid_request_error", message: "falta la pieza o las referencias" } })); return; }
      const v = Number((t.match(/Versión (\d+)/) ?? [])[1] ?? 1);
      const input = v >= 2 ? { nota: 8, motivos: ["Respira como las referencias."] } : { nota: 5, motivos: ["El tramo va pegado al borde: le falta aire."], cambiar: "Deja aire alrededor del tramo." };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_juz", name: "juzgar_pieza", input }], usage: { input_tokens: 6000, output_tokens: 80 } }));
      return;
    }
    // La revisión contra la vara (sistema/120): tiene que ver la pieza dibujada (y la vara, si hay). La primera vez no
    // llega y trae el título reescrito; la versión rehecha llega. Así se prueba que se rehace sola.
    if (cuerpo.tools?.[0]?.name === "revisar_con_vara") {
      const c = cuerpo.messages?.[0]?.content ?? [];
      const imgs = Array.isArray(c) ? c.filter((b) => b.type === "image" && b.source?.data).length : 0;
      const t = Array.isArray(c) ? c.filter((b) => b.type === "text").map((b) => b.text).join("\n") : String(c);
      if (!imgs || !/La pieza dibujada/.test(t)) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { type: "invalid_request_error", message: "falta la pieza dibujada" } })); return; }
      const titulo = (t.match(/"titulo":"([^"]*)"/) ?? [])[1] ?? "";
      const rehecha = titulo.includes("(a la vara)");
      const input = rehecha ? { nota: 8, motivos: ["Una sola idea, con aire, al nivel de su trabajo."] } : { nota: 5, motivos: ["El título dice demasiado: en el celular no se lee de un vistazo."], lamina: { titulo: `${titulo.split(" ").slice(0, 5).join(" ")} (a la vara)` } };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_vara", name: "revisar_con_vara", input }], usage: { input_tokens: 2500, output_tokens: 80 } }));
      return;
    }
    // Atlas entiende pedidos en palabras normales (sistema/106): reglas simples sobre el mensaje y la lista de clientes.
    if (cuerpo.system?.startsWith("Atlas entiende pedidos")) {
      const t = String(cuerpo.messages?.[0]?.content ?? "");
      const msg = (t.split("## Mensaje\n")[1] ?? "").trim();
      const n = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ctxProy = (t.match(/Proyecto abierto: ([a-z0-9_-]+)/) ?? [])[1] ?? "";
      const clientes = (t.split("## Clientes (id: nombre)\n")[1] ?? "").split("\n## ")[0].split("\n").map((l) => l.split(": ")).filter((x) => x.length > 1).map(([id, nombre]) => ({ id, nombre: nombre.replace(/ \(.*\)$/, "") }));
      const norm = (x) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hits = clientes.filter((c) => norm(c.nombre).split(/\s+/).filter((w) => w.length > 4).some((w) => n.includes(w)));
      const plena = hits.filter((c) => n.includes(norm(c.nombre)));
      const cl = plena.length === 1 ? plena[0] : hits.length === 1 ? hits[0] : undefined;
      const accion = /que sabes/.test(n) ? "memoria" : /que me toca|pendiente/.test(n) ? "hoy" : /cambia|que diga|que el boton/.test(n) ? "cambio" : /reel|video/.test(n) ? "guion" : /mensaje|whatsapp/.test(n) ? "mensaje" : /muestra/.test(n) ? "muestra" : /mes de contenido|calendario/.test(n) ? "contenido" : /como va|que falta|en que va|avance|fase|como esta/.test(n) ? "proyecto" : "ayuda";
      let input = { accion, cliente: cl?.id ?? "", proyecto: cl ? "" : ctxProy, texto: msg.replace(/^.*?(?:de|para) [^,]*?(?:,|:)\s*/i, "") || msg };
      if (!cl && hits.length > 1 && accion !== "hoy") input = { ...input, pregunta: `¿De cuál? Encontré ${hits.length}.`, opciones: hits.slice(0, 4).map((c) => ({ texto: c.nombre, accion, cliente: c.id })) };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_atlas", name: "entender_pedido", input }], usage: { input_tokens: 700, output_tokens: 40 } }));
      return;
    }
    // Faro arma el mes de contenido (sistema/107): primero el calendario, una fila por fecha, con series de plantilla fija.
    if (cuerpo.system?.startsWith("Faro arma el mes de contenido")) {
      const contenido = cuerpo.messages?.[0]?.content ?? "";
      // Con material (sistema/118) llegan las capturas como imágenes y el texto al final.
      const texto = Array.isArray(contenido) ? contenido.filter((b) => b.type === "text").map((b) => b.text).join("\n") : String(contenido);
      const imagenes = Array.isArray(contenido) ? contenido.filter((b) => b.type === "image" && b.source?.data).length : 0;
      const conTrabajo = imagenes > 0 && /· su trabajo ·/.test(texto);
      const fechas = (texto.split(/## Fechas[^\n]*\n/)[1] ?? "").split("\n").filter((l) => /^\d+\. \d{4}-\d{2}-\d{2}/.test(l));
      const series = [{ nombre: "Antes y después", para: "Mostrar el trabajo terminado", plantilla: "frase" }, { nombre: "Preguntas de clientes", para: "Responder dudas reales", plantilla: "lista" }, { nombre: "Detrás de cámaras", para: "Que conozcan al equipo", plantilla: "tachado" }];
      // Con trabajo real y referencias de estudio (sistema/121), Faro decide que la cuenta es un portafolio.
      const portafolio = conTrabajo && /Agencia|estudio|diseño/i.test(texto);
      if (portafolio) series.splice(0, 3, { nombre: "Casos", para: "Cada proyecto contado", plantilla: "caso" }, { nombre: "Detalles", para: "Un recorte de cerca", plantilla: "detalle" }, { nombre: "Logos", para: "El logo de cada proyecto", plantilla: "logo" });
      else if (conTrabajo) series[0] = { nombre: "Trabajo", para: "Mostrar el trabajo real", plantilla: "trabajo" };
      const formatoDe = (i) => (i % 4 === 3 ? "reel" : portafolio ? (i % 3 === 0 ? "carrusel" : "post") : i % 3 === 1 ? "carrusel" : "post");
      const filas = fechas.map((l, i) => ({ n: i + 1, serie: series[i % 3].nombre, formato: formatoDe(i), hora: i % 2 ? "08:30" : "18:00", ideaA: `Idea de prueba ${i + 1}: ${series[i % 3].nombre.toLowerCase()}`, ideaB: `Otra idea ${i + 1}` }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_cal", name: "armar_calendario", input: { enfoque: portafolio ? "portafolio" : "conversacion", porQueEnfoque: portafolio ? "Es un estudio: su trabajo se juzga con los ojos." : "Vende confianza y respuestas.", series, fechas: filas } }], usage: { input_tokens: 1200, output_tokens: 900 } }));
      return;
    }
    // Faro escribe las piezas de una tanda: opción A y B, arte según la plantilla, historias y YouTube en reels.
    if (cuerpo.system?.startsWith("Faro escribe las piezas")) {
      const texto = String(cuerpo.messages?.[0]?.content ?? "");
      const filas = [...texto.matchAll(/^(\d+)\. \d{4}-\d{2}-\d{2} \S+ · serie «[^»]+» · (\w+) · plantilla «(\w+)»/gm)].map((m) => ({ n: Number(m[1]), formato: m[2], plantilla: m[3] }));
      const archivo = (texto.match(/^- ([a-z0-9-]+-1440\.jpg) · su trabajo/m) ?? [])[1];
      const portafolio = /## Enfoque\nportafolio/.test(texto);
      const lamina = (n, pl, o) => ["trabajo", "caso", "detalle", "espacio", "logo"].includes(pl) || (portafolio && pl === "portada") ? { imagen: archivo ?? "no-existe-1440.jpg", titulo: `Proyecto real ${n}${o}`, ...(pl === "caso" ? { antetitulo: "Web · 2026", bajada: "Diseño y desarrollo." } : {}), ...(pl === "detalle" ? { recorte: n % 2 ? "arriba" : "medio" } : {}) } : pl === "tachado" ? { tachado: "Excusa", titulo: `Decisión ${n}${o}.` } : pl === "lista" ? { antetitulo: "PRUEBA · LISTA", titulo: `3 cosas para revisar ${n}${o}`, bajada: "Una bajada de prueba.", items: [{ t: "Primer punto", d: "Por qué importa." }, { t: "Segundo punto", d: "Por qué importa." }, { t: "Tercer punto" }], cierre: "Guárdalo." } : { titulo: `Título de prueba ${n}${o}`, bajada: "Una bajada corta." };
      const piezas = filas.map(({ n, formato, plantilla }) => ({
        n,
        A: { texto: portafolio ? `Proyecto real ${n}\nDiseño y desarrollo web · 2026` : `Texto de prueba ${n}. 🚀 Escríbenos por WhatsApp para saber más.\n¿Lo guardas?`, visual: "Solo el arte", lamina: lamina(n, plantilla, "A") },
        B: { texto: `Texto B de prueba ${n}.\n¿Qué opinas?`, visual: "Solo el arte", lamina: lamina(n, plantilla, "B") },
        historias: [{ texto: "Comparte el post con una línea." }, { texto: "¿Te pasó alguna vez?", sticker: "encuesta", opciones: ["Sí", "No"] }],
        ...(formato === "reel" ? { youtube: { titulo: `Reel de prueba ${n} #shorts`, descripcion: "Una descripción de prueba." } } : {}),
      }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_piezas", name: "escribir_piezas", input: { piezas } }], usage: { input_tokens: 1500, output_tokens: 2500 } }));
      return;
    }
    // Faro escribe guiones (sistema/71): uno fijo de prueba, con el cliente y la duración que le llegan.
    if (cuerpo.system?.startsWith("Faro, contenido de Unmake")) {
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
    if(cuerpo.system?.startsWith('Comprobación de conexión Unmake.')){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({content:[{type:'text',text:'LISTO'}],usage:{input_tokens:10,output_tokens:2}}));return;}
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
    if (cuerpo.system?.startsWith('Eres el asistente de la web de un negocio.')) {
      const q = (JSON.stringify(cuerpo.messages).match(/Pregunta del visitante\\n([^"\\]*)/) ?? [])[1] ?? '';
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({content:[{type:'text',text:`Respuesta de prueba con IA sobre «${q}».`}],usage:{input_tokens:300,output_tokens:30}}));return;
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
