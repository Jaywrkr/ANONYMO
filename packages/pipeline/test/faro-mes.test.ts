import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXTO_FORMATO, esVertical, leerDiseno, medidasFaro } from "../src/video/faro-disena.ts";

const lam = (t: string) => ({ html: `<html><body><div>${t}</div></body></html>` });

test("un reel es una sola portada vertical", () => {
  const d = leerDiseno({ laminas: [lam("a"), lam("b")], texto: "x", porQue: "y" }, "reel");
  assert.equal(d.formato, "reel");
  assert.equal(d.html.length, 1);
  assert.deepEqual(medidasFaro("reel"), { ancho: 1080, alto: 1920 });
  assert.ok(esVertical("historia"));
});

test("post y carrusel siguen como antes", () => {
  assert.equal(leerDiseno({ laminas: [lam("a"), lam("b")], texto: "x" }).formato, "carrusel");
  assert.equal(leerDiseno({ laminas: [lam("a")], texto: "x" }, "carrusel").formato, "post");
  assert.deepEqual(medidasFaro("post"), { ancho: 1080, alto: 1350 });
});

test("cada formato le dice a Faro su tamaño", () => {
  assert.match(TEXTO_FORMATO.reel, /1080×1920/);
  assert.match(TEXTO_FORMATO.reel, /franja central/);
  assert.match(TEXTO_FORMATO.historia, /250 px/);
  assert.match(TEXTO_FORMATO.post, /1080×1350/);
});
