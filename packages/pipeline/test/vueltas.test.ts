// sistema/36: modos de trabajo, una tarea por vuelta, seguir donde quedó y la API en vivo.
import "./preparar.ts";
process.env.ANONYMO_MARGEN_MS = "200";
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
const { crear, guardarProyecto, leerProyecto, leerEntrega } = await import("../src/almacen.ts");
const { avanzar, aprobar, cambiar, empezar, cambiarModo, fusionar, reanudar, parar, hayPendientes, elegirDireccion, pedirDirecciones, direccionDelCliente } = await import("../src/correr.ts");
const { versionCliente, leerDirecciones } = await import("../src/privado.ts").then(async (m) => ({ ...m, ...(await import("../src/direcciones.ts")) }));
const { planificar } = await import("../src/atlas.ts");
const { simulado, real } = await import("../src/motor.ts");
const { leerStream } = await import("../src/envivo.ts");

const silencio = () => {};
const pedido = (id: string) => ({ id, cliente: id, tipo: "web" as const, descripcion: "Web de prueba", creado: new Date().toISOString() });
const conPlan = (id: string, modo?: "paso" | "fase" | "auto") => {
  const ped = pedido(id);
  const p = crear(ped, planificar(ped, { tareas: ["1.atlas", "1.ledger", "4.orla", "4.vector"], preguntas: [] }), "plan");
  if (modo) { p.modo = modo; guardarProyecto(p); }
  return p;
};

test("modo paso: trabaja un agente y espera tu revisión; aprobar sigue con el siguiente", async () => {
  conPlan("paso", "paso");
  let p = await empezar("paso", "jay", simulado, silencio);
  assert.equal(p.estado, "esperando");
  assert.equal(p.revision?.tarea, "1.atlas");
  assert.equal(Object.values(p.tareas).filter((e) => e === "lista").length, 1);
  p = await aprobar("paso", "jay", undefined, simulado, silencio);
  assert.equal(p.revision?.tarea, "1.ledger");
  // Pedir un cambio rehace solo esa entrega y vuelve a esperar su revisión.
  p = await cambiar("paso", "jay", "más corto", undefined, simulado, silencio);
  assert.equal(p.revision?.tarea, "1.ledger");
  assert.equal(leerEntrega("paso", "1.ledger")?.version, 2);
  p = await aprobar("paso", "jay", undefined, simulado, silencio);
  // Orla propone direcciones: no es una revisión, es elegir.
  assert.equal(p.direcciones?.esperando, true);
  assert.equal(p.revision, undefined);
  p = await elegirDireccion("paso", 0, "jay", undefined, simulado, silencio);
  assert.equal(p.revision?.tarea, "4.orla");
  p = await aprobar("paso", "jay", undefined, simulado, silencio);
  assert.equal(p.revision?.tarea, "4.vector");
  p = await aprobar("paso", "jay", undefined, simulado, silencio);
  assert.ok(["listo", "esperando"].includes(p.estado));
  assert.equal(p.revision, undefined);
});

test("una tarea por vuelta: max 1 deja el resto en curso; max 0 solo prepara", async () => {
  conPlan("vuelta", "auto");
  let p = await empezar("vuelta", "jay", simulado, silencio, { max: 0 });
  assert.equal(p.estado, "en-curso");
  assert.equal(Object.values(p.tareas).filter((e) => e === "lista").length, 0);
  p = await avanzar("vuelta", simulado, silencio, { max: 1 });
  assert.equal(p.estado, "en-curso");
  assert.equal(Object.values(p.tareas).filter((e) => e === "lista").length, 1);
  assert.ok(hayPendientes(p));
  for (let i = 0; i < 6 && p.estado === "en-curso"; i++) p = await avanzar("vuelta", simulado, silencio, { max: 1 });
  // Aun en automático, las direcciones esperan a que alguien elija.
  assert.equal(p.estado, "esperando");
  assert.equal(p.direcciones?.esperando, true);
  p = await elegirDireccion("vuelta", 2, "jay", undefined, simulado, silencio, { max: 0 });
  for (let i = 0; i < 6 && p.estado === "en-curso"; i++) p = await avanzar("vuelta", simulado, silencio, { max: 1 });
  assert.equal(p.estado, "listo");
});

test("modo fase sigue como antes y se puede cambiar el modo en medio", async () => {
  conPlan("fases");
  let p = await empezar("fases", "jay", simulado, silencio);
  assert.equal(p.estado, "esperando");
  assert.equal(p.revision, undefined);
  assert.equal(p.faseActual, 1);
  p = cambiarModo("fases", "auto");
  assert.equal(p.estado, "en-curso");
  p = await avanzar("fases", simulado, silencio);
  assert.equal(p.direcciones?.esperando, true);
  // El cliente marca su preferencia en el portal; Jay confirma.
  direccionDelCliente("fases", 1, "me gusta la sobria");
  assert.equal(leerProyecto("fases").direcciones?.cliente?.n, 1);
  p = await pedirDirecciones("fases", "jay", "más color", simulado, silencio).catch((e) => { throw e; }).then(() => leerProyecto("fases"));
  assert.equal(p.direcciones?.esperando, true);
  assert.equal(leerEntrega("fases", "4.orla")?.version, 2);
  p = await elegirDireccion("fases", 1, "jay", undefined, simulado, silencio);
  assert.equal(p.estado, "listo");
});

test("parar y reanudar en modo paso sigue solo si no hay nada que revisar", async () => {
  conPlan("pausa-paso", "paso");
  await empezar("pausa-paso", "jay", simulado, silencio, { max: 0 });
  parar("pausa-paso", "jay");
  assert.equal(reanudar("pausa-paso").estado, "en-curso");
});

test("fusionar respeta lo que cambió en la nube mientras el agente trabajaba", () => {
  const vuelta = leerProyecto("vuelta");
  vuelta.tareas["4.vector"] = "lista";
  vuelta.estado = "en-curso";
  const nube = structuredClone(leerProyecto("vuelta"));
  nube.marca = { colores: [{ nombre: "Menta", hex: "#7fd1b9" }], fuentes: [] };
  nube.estado = "parado";
  nube.presupuesto = { horasJay: 30, ajustes: [] };
  const f = fusionar(vuelta, nube);
  assert.equal(f.tareas["4.vector"], "lista");
  assert.equal(f.marca?.colores[0].hex, "#7fd1b9");
  assert.equal(f.estado, "parado");
  assert.equal(f.presupuesto?.horasJay, 30);
});

const sse = (eventos: object[]) => eventos.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join("");
const flujo = (texto: string) => new ReadableStream<Uint8Array>({ start(c) { const b = new TextEncoder().encode(texto); for (let i = 0; i < b.length; i += 7) c.enqueue(b.slice(i, i + 7)); c.close(); } });

test("la API en vivo arma los bloques, cuenta palabras y avisa qué hace", async () => {
  const fases: string[] = [];
  const r = await leerStream(flujo(sse([
    { type: "message_start", message: { usage: { input_tokens: 50, output_tokens: 1 } } },
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "veamos" } },
    { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "firma" } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "server_tool_use", id: "b1", name: "web_search", input: {} } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "{\"query\":" } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "\"clínicas cuenca\"}" } },
    { type: "content_block_stop", index: 1 },
    { type: "content_block_start", index: 2, content_block: { type: "web_search_tool_result", tool_use_id: "b1", content: [] } },
    { type: "content_block_stop", index: 2 },
    { type: "content_block_start", index: 3, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 3, delta: { type: "text_delta", text: "Hola equipo, " } },
    { type: "content_block_delta", index: 3, delta: { type: "text_delta", text: "aquí va el plan." } },
    { type: "content_block_stop", index: 3 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 42, server_tool_use: { web_search_requests: 1 } } },
    { type: "message_stop" },
  ])), (f) => fases.push(f));
  assert.equal(r.stop_reason, "end_turn");
  assert.deepEqual(r.content.map((b) => b.type), ["thinking", "server_tool_use", "web_search_tool_result", "text"]);
  assert.equal(r.content[0].signature, "firma");
  assert.deepEqual(r.content[1].input, { query: "clínicas cuenca" });
  assert.equal(r.content[3].text, "Hola equipo, aquí va el plan.");
  assert.equal(r.usage.output_tokens, 42);
  assert.equal(r.usage.server_tool_use?.web_search_requests, 1);
  assert.ok(fases.includes("pensando") && fases.includes("buscando") && fases.includes("escribiendo"));
});

test("si se acaba el tiempo de la vuelta, guarda lo escrito y la siguiente sigue desde ahí", async () => {
  // API falsa: la primera respuesta escribe lento (no termina antes del plazo); la segunda termina.
  let pedidos = 0;
  const cuerpos: { thinking?: { type: string }; messages: { role: string; content: unknown }[] }[] = [];
  const srv = http.createServer((req, res) => {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", async () => {
      cuerpos.push(JSON.parse(b)); pedidos++;
      res.writeHead(200, { "content-type": "text/event-stream" });
      const env = (e: object) => res.write(`event: x\ndata: ${JSON.stringify(e)}\n\n`);
      env({ type: "message_start", message: { usage: { input_tokens: 10, output_tokens: 0 } } });
      env({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
      if (pedidos === 1) {
        env({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "# Plan\n\nPrimera mitad" } });
        await new Promise((x) => setTimeout(x, 3000)); // más que el plazo
        res.end();
      } else {
        env({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " y segunda mitad.\n\nDICE: Listo.\nNECESITA: —" } });
        env({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 20 } });
        res.end();
      }
    });
  });
  await new Promise<void>((ok) => srv.listen(0, ok));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  const modeloAnterior = process.env.ANTHROPIC_MODEL;
  process.env.ANTHROPIC_MODEL = "claude-sonnet-5-5";
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba-falsa";
  try {
    conPlan("plazo", "auto");
    await empezar("plazo", "jay", real, silencio, { max: 0 });
    const latidos: number[] = [];
    // Plazo corto: la API falsa tarda 3 s; la vuelta se corta a 1 s.
    let p = await avanzar("plazo", real, silencio, { max: 1, plazo: Date.now() + 1000, latido: (_, x) => latidos.push(x.palabras) });
    assert.equal(p.tareas["1.atlas"], "en-curso");
    assert.match(p.parciales?.["1.atlas"] ?? "", /Primera mitad/);
    assert.ok(latidos.some((n) => n > 0));
    p = await avanzar("plazo", real, silencio, { max: 1 });
    assert.equal(p.tareas["1.atlas"], "lista");
    assert.equal(p.parciales?.["1.atlas"], undefined);
    const e = leerEntrega("plazo", "1.atlas")!;
    assert.match(e.contenido, /Primera mitad y segunda mitad\./);
    assert.equal(e.dice, "Listo.");
    // La segunda vuelta le mostró lo ya escrito y le pidió seguir, sin herramientas.
    const ultimo = cuerpos.at(-1)!;
    assert.deepEqual(ultimo.thinking, { type: "between_tools" });
    assert.equal(ultimo.messages[1].role, "assistant");
    assert.equal(ultimo.messages.length, 3);
  } finally {
    if (modeloAnterior === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = modeloAnterior;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    srv.close();
  }
});

test("la versión para el cliente quita lo interno", () => {
  const md = "# Plan\n\n## Resumen en tres líneas\nTodo bien.\n\n## Riesgos y cómo los cubrimos\nQue se atrase.\n\n### Detalle\nmás\n\n## Fechas clave\n- 1 dic\n\n> ⚠️ Esta entrega quedó cortada.\n\n## Para el equipo\nMargen 40 %.";
  const c = versionCliente(md);
  assert.match(c, /Resumen en tres líneas/);
  assert.match(c, /Fechas clave/);
  assert.doesNotMatch(c, /Riesgos|Que se atrase|Detalle|Margen|cortada/);
});

test("las direcciones se leen del json aunque vengan con ruido", () => {
  const d = leerDirecciones('texto\n```json\n[{"nombre":"Serena","idea":"x","estilo":"raro","colores":[{"nombre":"a","hex":"#112233"},{"nombre":"b","hex":"#ABCDEF"},{"nombre":"c","hex":"rojo"}],"tipografias":{"titulos":"Fraunces<script>","texto":"Inter"},"portada":{"titular":"Hola","bajada":"b","boton":"c"},"seccion":{"titulo":"s","items":[{"titulo":"1","texto":"t"}]},"imagen":"foto"},{"nombre":"Mala"}]\n```');
  assert.equal(d.length, 1);
  assert.equal(d[0].colores.length, 2);
  assert.equal(d[0].colores[1].hex, "#abcdef");
  assert.equal(d[0].tipografias.titulos, "Frauncesscript");
  assert.equal(d[0].estilo, "editorial");
});

for (const agente of ["orla", "vector"] as const) test(`${agente}: si una vuelta se va entera pensando, la siguiente va directo a escribir`, async () => {
  let pedidos = 0;
  const cuerpos: Record<string, unknown>[] = [];
  const srv = http.createServer((req, res) => {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", async () => {
      const cuerpo = JSON.parse(b);
      cuerpos.push(cuerpo); pedidos++;
      // Reproduce el rechazo real: Sonnet no acepta disabled en una continuación.
      if (cuerpo.thinking?.type === "disabled") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { type: "invalid_request_error", message: 'To turn thinking off on this model, send "thinking": {"type": "between_tools"}.' } }));
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      const env = (e: object) => res.write(`event: x\ndata: ${JSON.stringify(e)}\n\n`);
      env({ type: "message_start", message: { usage: { input_tokens: 10, output_tokens: 0 } } });
      if (pedidos === 1) {
        env({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } });
        for (let i = 0; i < 30 && !res.destroyed; i++) { env({ type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "hmm " } }); await new Promise((x) => setTimeout(x, 100)); }
        res.end();
      } else {
        env({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
        env({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "# Web\n\nListo el código.\n\nDICE: Hecho.\nNECESITA: —" } });
        env({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 20 } });
        res.end();
      }
    });
  });
  await new Promise<void>((ok) => srv.listen(0, ok));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  const modeloAnterior = process.env.ANTHROPIC_MODEL;
  process.env.ANTHROPIC_MODEL = "claude-sonnet-5-5";
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba-falsa";
  try {
    const id = `directo-${agente}`;
    const tarea = `4.${agente}` as const;
    const ped = pedido(id);
    crear(ped, planificar(ped, { tareas: [tarea], preguntas: [] }), "plan");
    await empezar(id, "jay", real, silencio, { max: 0 });
    let p = await avanzar(id, real, silencio, { max: 1, plazo: Date.now() + 1000 });
    assert.equal(p.tareas[tarea], "en-curso");
    assert.equal(p.reintentos?.[tarea], 1);
    assert.equal(p.error, undefined);
    p = await avanzar(id, real, silencio, { max: 1 });
    assert.equal(p.tareas[tarea], "lista");
    assert.equal(p.reintentos?.[tarea], undefined);
    // La segunda vuelta no busca en la web y no pide pensar a fondo.
    assert.deepEqual(cuerpos[1].thinking, { type: "between_tools" });
    assert.equal(p.error, undefined);
    assert.equal(cuerpos[1].tools, undefined);
    assert.match(JSON.stringify(cuerpos[1].messages), /Escribe la entrega ya/);
  } finally {
    if (modeloAnterior === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = modeloAnterior;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    srv.close();
  }
});

test("la web llega como archivos: se leen, se guardan por versión y no se escapan de su carpeta", async () => {
  const { leerArchivosSitio, sinArchivos, guardarSitio, versionesSitio, archivosSitio, leerArchivoSitio } = await import("../src/sitio.ts");
  const t = "Páginas: inicio.\n\n```html archivo:index.html\n<h1>Hola</h1>\n```\n\n```css archivo:estilos.css\nh1{color:red}\n```\n\n```js archivo:../malo.js\nx\n```\n\nDICE: listo";
  const a = leerArchivosSitio(t);
  assert.deepEqual(Object.keys(a).sort(), ["estilos.css", "index.html"]);
  assert.match(sinArchivos(t), /`index\.html` · 1 líneas/);
  guardarSitio("web-test", 2, a);
  assert.deepEqual(versionesSitio("web-test"), [2]);
  assert.equal(archivosSitio("web-test", 2)[0].ruta, "index.html");
  assert.equal(leerArchivoSitio("web-test", 2, "../estado.json"), undefined);
  assert.equal(String(leerArchivoSitio("web-test", 2, "index.html")), "<h1>Hola</h1>");
});
