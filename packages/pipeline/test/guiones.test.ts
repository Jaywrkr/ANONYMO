import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
const { leerGuionIA, guionParaCorte, escribirGuion, aprobarGuion, unirGuionAVideo, listarGuiones, leerGuion, idGuionValido } = await import("../src/video/guiones.ts");
const { mensajeAtlasVideo } = await import("../src/video/atlas-video.ts");
const { EDICION_INICIAL } = await import("../src/video/tipos.ts");

test("lo que devuelve Faro se limpia: sin gancho o sin partes no es un guion", () => {
  const g = leerGuionIA({ titulo: "T", gancho: "G", partes: [{ texto: "Uno", toma: "Plano" }, { texto: "" }], cierre: "C", tomas: ["a", "", "b"] });
  assert.deepEqual(g.partes, [{ texto: "Uno", toma: "Plano" }]);
  assert.deepEqual(g.tomas, ["a", "b"]);
  assert.throws(() => leerGuionIA({ titulo: "T", partes: [] }), /no devolvió un guion completo/);
});

test("sin clave de Anthropic, Faro lo dice en vez de inventar", async () => {
  await assert.rejects(() => escribirGuion("Un reel para el lanzamiento de la agencia", { por: "luna" }), /ANTHROPIC_API_KEY/);
  await assert.rejects(() => escribirGuion("corto", { por: "luna" }), /al menos una frase/);
});

test("Faro escribe, Luna aprueba, se graba y Corte lo lee: cada paso queda firmado", async () => {
  const pedidos: { system: string; texto: string }[] = [];
  const ia = createServer((req, res) => {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      const c = JSON.parse(b);
      pedidos.push({ system: c.system, texto: String(c.messages[0].content) });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "escribir_guion", input: { titulo: "Lanzamiento Unmake", gancho: "¿Y si tu agencia trabajara mientras duermes?", partes: [{ texto: "Somos dos y veintidós agentes.", toma: "Jay y Luna" }], cierre: "Escríbenos.", tomas: ["Estudio"] } }], usage: { input_tokens: 1, output_tokens: 1 } }));
    });
  }).listen(0);
  await new Promise((r) => ia.once("listening", r));
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(ia.address() as { port: number }).port}`;
  try {
    const g = await escribirGuion("Un reel para el lanzamiento de la agencia", { cliente: "Unmake", segundos: 60, por: "luna" });
    assert.ok(idGuionValido(g.id), g.id);
    assert.match(pedidos[0].system, /^Faro, contenido de Unmake/);
    assert.match(pedidos[0].texto, /## Cliente\nUnmake/);
    assert.match(pedidos[0].texto, /60 segundos: máximo 138 palabras/);
    assert.equal(g.estado, "borrador");
    await aprobarGuion(g.id, "luna");
    await unirGuionAVideo(g.id, "v-reel-ab12", "luna");
    const final = await leerGuion(g.id);
    assert.equal(final?.estado, "grabado");
    assert.equal(final?.video, "v-reel-ab12");
    assert.deepEqual(final?.historia.map((h) => `${h.quien}: ${h.que}`), ["luna: Pidió el video", "atlas: Se lo pasó a Faro", "faro: Escribió el guion", "luna: Aprobó el guion", "luna: Subió lo grabado"]);
    assert.equal((await listarGuiones()).length, 1);
    // Corte recibe el guion dentro de lo que lee para editar.
    const texto = mensajeAtlasVideo("corta lo que sobre", { nombre: "Reel", edicion: structuredClone(EDICION_INICIAL), guion: guionParaCorte(final!) });
    assert.match(texto, /## Guion de Faro[^\n]*\nDuración buscada: 60 s\nGancho: ¿Y si tu agencia trabajara mientras duermes\?\n1\. Somos dos y veintidós agentes\.\nCierre: Escríbenos\./);
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    ia.close();
  }
});

test("el guion se revisa solo: largo, gancho y un solo llamado (sistema/109)", async () => {
  const { revisarGuion, palabrasPara } = await import("../src/video/guiones.ts");
  assert.equal(palabrasPara(30), 69);
  const bien = { gancho: "Tu web te está costando pacientes", partes: [{ texto: "La mayoría busca en el celular y se va si tarda.", toma: "Celular en mano" }], cierre: "Escríbenos por WhatsApp." };
  assert.deepEqual(revisarGuion(bien, 30), []);
  const largo = { ...bien, partes: [{ texto: Array(90).fill("palabra").join(" "), toma: "x" }] };
  assert.match(revisarGuion(largo, 30)[0]!, /caben unas 69/);
  assert.match(revisarGuion({ ...bien, gancho: "Esta es una frase de gancho que tiene demasiadas palabras para tres segundos" }, 30).join(), /gancho tiene/);
  assert.match(revisarGuion({ ...bien, partes: [{ texto: "Síguenos para más.", toma: "x" }] }, 30).join(), /uno solo, en el cierre/);
});
