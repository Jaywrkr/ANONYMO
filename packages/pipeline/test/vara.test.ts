// La revisión contra la vara (sistema/120): lo que devuelve la IA se limpia y lo reescrito nunca rompe la lámina.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarLamina, leerRevisionVara, NOTA_VARA } from "../src/video/vara.ts";
import { bloquesVara } from "../src/clientes/material.ts";

test("leerRevisionVara: nota válida, hasta 3 motivos y solo campos de la lámina", () => {
  const r = leerRevisionVara({ nota: "6.44", motivos: ["a", "", "b", "c", "d"], lamina: { titulo: "  Nuevo   título ", imagen: "x.jpg", items: [{ t: "uno" }, { t: "dos" }] }, texto: "" });
  assert.equal(r?.nota, 6.4);
  assert.deepEqual(r?.motivos, ["a", "b", "c"]);
  assert.deepEqual(r?.lamina, { titulo: "Nuevo título" });
  assert.equal(r?.texto, undefined);
  assert.equal(leerRevisionVara({ nota: 11, motivos: [] }), undefined);
  assert.equal(leerRevisionVara({ motivos: [] }), undefined);
  assert.equal(NOTA_VARA, 7);
});

test("aplicarLamina: guarda la captura del trabajo y no deja el título vacío", () => {
  const l = { titulo: "Antes", bajada: "b", imagen: "unmake-abc-1440.jpg" };
  assert.deepEqual(aplicarLamina(l, { titulo: "", bajada: "nueva" }), { titulo: "Antes", bajada: "nueva", imagen: "unmake-abc-1440.jpg" });
  assert.deepEqual(aplicarLamina(l, { titulo: "Después", imagen: "otra.jpg" }), { titulo: "Después", bajada: "b", imagen: "unmake-abc-1440.jpg" });
  assert.equal(aplicarLamina(l, undefined), l);
});

test("bloquesVara: cada captura va con lo que muestra y después la imagen", () => {
  const b = bloquesVara([{ archivo: "a-1440.jpg", url: "https://x.com", nota: "su web", trabajo: true, datos: "QUJD" }]);
  assert.equal(b.length, 2);
  assert.match(String(b[0]!.text), /su trabajo real · https:\/\/x\.com — su web/);
  assert.equal(b[1]!.type, "image");
});
