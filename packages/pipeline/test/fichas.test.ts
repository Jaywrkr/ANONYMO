// Las fichas de los agentes (sistema/124).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENTES } from "@anonymo/agentes";
import { FICHAS, consultaDirecta, leerRegistro, textoFicha } from "../src/fichas-agentes.ts";
import { leerSparring } from "../src/video/faro-disena.ts";

test("cada uno de los 22 agentes tiene su ficha completa", () => {
  assert.equal(AGENTES.length, 22);
  for (const a of AGENTES) {
    const f = FICHAS[a.id];
    assert.ok(f, `falta la ficha de ${a.nombre}`);
    assert.ok(f.lee.length && f.entrega.length && f.reglas.length && f.rapido, `ficha incompleta: ${a.nombre}`);
    const t = textoFicha(a.id);
    assert.match(t, /Lo que entregas, siempre en este orden/);
    assert.match(t, /No inventas datos/);
    assert.match(textoFicha(a.id, { rapido: true }), /Modo rápido/);
  }
});

test("consultaDirecta: «Nova: …», «@Mira, …», «Sonda rápido: …»; un nombre sin dos puntos no es consulta", () => {
  const n = AGENTES.map((a) => ({ id: a.id, nombre: a.nombre }));
  assert.deepEqual(consultaDirecta("Nova: discúteme esto", n), { agente: "nova", rapido: false, texto: "discúteme esto" });
  assert.deepEqual(consultaDirecta("@Mira, ¿va con la marca?", n), { agente: "mira", rapido: false, texto: "¿va con la marca?" });
  assert.deepEqual(consultaDirecta("Sonda rápido: radar de Core", n), { agente: "sonda", rapido: true, texto: "radar de Core" });
  assert.deepEqual(consultaDirecta("Imán: el mensaje", n)?.agente, "iman");
  assert.equal(consultaDirecta("Nova me dijo que sí", n), undefined);
  assert.equal(consultaDirecta("Gabriela: la web", n), undefined);
});

test("leerRegistro: la categoría sale de las palabras", () => {
  assert.equal(leerRegistro("registro: elegimos el azul y descartamos el verde")?.categoria, "decision");
  assert.equal(leerRegistro("Registro: nos inspiramos en la referencia de Pentagram")?.categoria, "referencia");
  assert.equal(leerRegistro("registro: subieron 30% las visitas")?.categoria, "resultado");
  assert.equal(leerRegistro("registro:   "), undefined);
  assert.equal(leerRegistro("hola"), undefined);
});

test("leerSparring: nunca elige un camino marcado como cliché", () => {
  const s = leerSparring({ caminos: [{ nombre: "Laptop", idea: "x", cliche: true }, { nombre: "Tramo", idea: "y", cliche: false }], elegido: 0, porQue: "z" });
  assert.equal(s?.elegido, 1);
  assert.equal(leerSparring({ caminos: [] }), undefined);
});
