import { test } from "node:test";
import assert from "node:assert/strict";
import { conMaterial, corta, SISTEMA_DISENO, SISTEMA_JUICIO } from "../src/video/faro-disena.ts";

test("el material va como dirección, no pegado en el HTML", () => {
  const h = conMaterial(`<img src="material:core-1440.jpg"><div style="background:url('material:core-p1.jpg')">`, { "core-1440.jpg": "https://material.unmake.local/core-1440.jpg", "core-p1.jpg": "https://material.unmake.local/core-p1.jpg" });
  assert.match(h, /src="https:\/\/material\.unmake\.local\/core-1440\.jpg"/);
  assert.match(h, /url\('https:\/\/material\.unmake\.local\/core-p1\.jpg'\)/);
  assert.ok(h.length < 200);
});

test("corta nunca deja media palabra", () => {
  const t = "Muestro el diagrama de capas real de su web, ampliado y desvanecido hacia la capa de respaldo. No usé el camino de Nova porque usaba el fondo de la cuenta y no el del proyecto.";
  const c = corta(t, 120);
  assert.ok(c.length <= 121);
  assert.ok(c.endsWith(".") || c.endsWith("…"));
  assert.ok(!/\bna$/.test(c));
  assert.equal(corta("corto", 50), "corto");
});

test("Faro y Mira están de acuerdo en cómo se muestra el trabajo real", () => {
  assert.match(SISTEMA_DISENO, /borde limpio/);
  assert.match(SISTEMA_DISENO, /80 px/);
  assert.match(SISTEMA_JUICIO, /está BIEN/);
  assert.doesNotMatch(SISTEMA_JUICIO, /una captura de pantalla sin intervenir/);
});

test("Mira no castiga el logo del cliente ni lo que trae la web", () => {
  assert.match(SISTEMA_JUICIO, /logo DEL PROYECTO/);
  assert.match(SISTEMA_JUICIO, /versiones anteriores de esta misma pieza/);
  assert.match(SISTEMA_DISENO, /60%/);
  assert.match(SISTEMA_DISENO, /texto final, completo y quieto/);
});
