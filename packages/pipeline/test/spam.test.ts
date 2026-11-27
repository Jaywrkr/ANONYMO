// El spam del formulario (sistema/125): los que venden posicionamiento no llegan a «Te toca».
import { test } from "node:test";
import assert from "node:assert/strict";
import { esSpam } from "../src/solicitudes.ts";

test("esSpam: los tres que llegaron a unmake.studio son spam", () => {
  assert.ok(esSpam({ nombre: "Rose Hughes", correo: "rosehughes974@gmail.com", mensaje: "Hello http://unmake.studio,\n\nIf you're looking to boost your website's visibility, I can help you achieve top Google rankings...." }));
  assert.ok(esSpam({ nombre: "Elvin Duran", correo: "domains@search-unmake.studio", mensaje: "Hello\n\nList unmake.studio in Google's Search Index so it can show up in web search results!..." }));
  assert.ok(esSpam({ nombre: "Bakar Berete", correo: "mapmybiz.mkt@gmail.com", mensaje: "Hey team unmake.studio,\n\nI'd love to discuss your online visibility!..." }));
});

test("esSpam: un pedido de verdad pasa", () => {
  assert.equal(esSpam({ nombre: "Gabriela Abril", correo: "gabriela@gmail.com", mensaje: "Hola, necesito una web para mi consultorio dental en Cuenca, con citas en línea." }), undefined);
  assert.equal(esSpam({ nombre: "Ana", correo: "ana@empresa.com", mensaje: "Hi! We need a new website for our coffee shop, can you send a quote?" }), undefined);
  assert.equal(esSpam({ nombre: "Pedro", correo: "p@x.com", mensaje: "Quiero mejorar mi Instagram y mi página, ¿cuánto cuesta?" }), undefined);
});

test("apartarSpam: lo que ya llegó y es spam sale de la lista; lo de verdad queda", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, existsSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "spam-"));
  mkdirSync(join(dir, "_solicitudes"), { recursive: true });
  const s = (id: string, nombre: string, mensaje: string) => writeFileSync(join(dir, "_solicitudes", `${id}.json`), JSON.stringify({ id, fecha: "2026-11-27T10:00:00Z", tipo: "web", nombre, correo: "x@gmail.com", mensaje, origen: "web" }));
  s("a", "Rose Hughes", "Hello http://unmake.studio, I can help you achieve top Google rankings.");
  s("b", "Carmen", "Hola, necesito una web para mi panadería.");
  const { apartarSpam, listarSolicitudes, listarSpam } = await import("../src/solicitudes.ts");
  const { enCarpeta } = await import("../src/almacen.ts");
  enCarpeta(dir, () => {
    assert.equal(apartarSpam(), 1);
    assert.deepEqual(listarSolicitudes().map((x) => x.nombre), ["Carmen"]);
    assert.equal(listarSpam()[0]?.nombre, "Rose Hughes");
  });
  assert.ok(existsSync(join(dir, "_solicitudes", "spam", "a.json")));
});
