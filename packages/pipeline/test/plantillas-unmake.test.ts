import { test } from "node:test";
import assert from "node:assert/strict";
import { ajustar, ejemplosUnmake, laminasUnmake, lineas, PLANTILLAS_UNMAKE } from "../src/video/plantillas-unmake.ts";

test("las líneas se cuentan cortando por palabras", () => {
  assert.equal(lineas("hola mundo", 1000, 50, 0.5), 1);
  assert.equal(lineas("hola mundo", 200, 50, 0.5), 2);
  assert.equal(lineas("palabramuylargaquenoentra", 200, 50, 0.5), Infinity);
});

test("el texto se achica hasta entrar, y avisa si ni al mínimo entra", () => {
  const corto = ajustar("si hay que explicarlo", 900, 400, 104, 60);
  assert.ok(corto.ok);
  assert.equal(corto.size, 104, "un texto corto va al tamaño más grande");
  const medio = ajustar("una frase bastante más larga que obliga a bajar la letra para que entre bien", 900, 400, 104, 60);
  assert.ok(medio.ok && medio.size < 104);
  assert.equal(ajustar("x ".repeat(400), 900, 200, 104, 60).ok, false);
});

test("los ejemplos de la galería salen sin avisos y con su número de láminas", () => {
  for (const p of ejemplosUnmake()) {
    const l = laminasUnmake(p);
    assert.deepEqual(l.flatMap((x) => x.avisos), [], `${p.plantilla} no debería tener avisos`);
    if (["frase", "lista", "dato"].includes(p.plantilla)) assert.ok(l.every((x, i) => i > 0 && p.plantilla === "lista" ? true : x.html.includes(">unmake.<")), "las piezas de texto llevan la firma");
    if (PLANTILLAS_UNMAKE[p.plantilla].formato === "carrusel") assert.ok(l.length >= 3);
    else assert.equal(l.length, 1);
  }
  assert.equal(laminasUnmake(ejemplosUnmake().find((p) => p.plantilla === "caso")!).length, 5);
  assert.equal(laminasUnmake(ejemplosUnmake().find((p) => p.plantilla === "portada")!)[0]!.alto, 1920);
});

test("si falta la imagen o el texto no entra, la lámina lo marca", () => {
  const sinImagen = laminasUnmake({ id: "x", plantilla: "detalle", serie: "Detalles", nSerie: 1, lamina: { titulo: "un detalle" } });
  assert.ok(sinImagen[0]!.avisos.some((a) => /imagen/.test(a)));
  assert.match(sinImagen[0]!.html, /falta la imagen/);
  const largo = laminasUnmake({ id: "y", plantilla: "frase", serie: "Postura", nSerie: 1, lamina: { titulo: "muy larga ".repeat(40) } });
  assert.ok(largo[0]!.avisos.some((a) => /no entra/.test(a)));
  assert.match(largo[0]!.html, /outline:4px solid/);
});

test("el texto se escapa", () => {
  const l = laminasUnmake({ id: "z", plantilla: "frase", serie: "S", nSerie: 1, lamina: { titulo: "<b>hola</b>" } });
  assert.ok(!l[0]!.html.includes("<b>hola"));
});
