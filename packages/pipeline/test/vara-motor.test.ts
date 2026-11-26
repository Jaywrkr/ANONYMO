// Los agentes de proyectos ven la vara del cliente como imágenes (sistema/120), no solo enlaces y notas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("el motor real manda las capturas de la vara antes que todo lo demás", async () => {
  let pedido = "";
  const srv = createServer((q, r) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { pedido ||= b; r.writeHead(400, { "content-type": "application/json" }); r.end(JSON.stringify({ error: { type: "invalid_request_error", message: "fin de la prueba" } })); }); });
  await new Promise<void>((ok) => srv.listen(0, "127.0.0.1", ok));
  process.env.ANONYMO_PROYECTOS = mkdtempSync(join(tmpdir(), "vara-"));
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  const { real } = await import("../src/motor.ts");
  await real.trabajar({
    pedido: { id: "p-vara", cliente: "Unmake", descripcion: "Una web para el estudio", creado: new Date().toISOString() } as never,
    tarea: "4.vector", lecturas: [], version: 1, preguntas: [], herramientas: [], cliente: [],
    vara: [{ archivo: "unmake-abc-1440.jpg", url: "https://coresolutions-web.vercel.app/", nota: "su web", trabajo: true, datos: "QUJD" }],
  }).catch(() => {});
  srv.close();
  const cuerpo = JSON.parse(pedido);
  const c = cuerpo.messages[0].content;
  assert.ok(Array.isArray(c), "el mensaje lleva bloques");
  assert.match(c[0].text, /Vara del cliente · su trabajo real · https:\/\/coresolutions-web\.vercel\.app\//);
  assert.equal(c[1].type, "image");
  assert.equal(c[1].source.data, "QUJD");
  assert.match(JSON.stringify(c), /tiene que estar a esa altura/);
});
