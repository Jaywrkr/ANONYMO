import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerCaja, marcaEnCurso, ponerSugerencia, clientesDe, agenteDe, accionDe } from "../src/index.ts";

const C = [
  { id: "clinica-sonrisa", nombre: "Clínica Sonrisa" },
  { id: "clinica-luz", nombre: "Clínica Luz", alias: ["Dra. Luz"] },
  { id: "anonymo", nombre: "ANONYMO" },
];

test("entiende @agente, #cliente y /acción, y lo demás es el pedido", () => {
  const l = leerCaja("@faro #anonymo /guion un reel de por qué una web vende más", C);
  assert.deepEqual([l.agente, l.cliente, l.accion, l.texto, l.dudas.length], ["faro", "anonymo", "guion", "un reel de por qué una web vende más", 0]);
});

test("sin acción, hace lo que su agente hace siempre; sin agente, sale de la acción", () => {
  assert.equal(leerCaja("@Faro algo sobre blanqueamiento", C).accion, "guion");
  assert.equal(leerCaja("@imán #clinica-sonrisa", C).accion, "muestra");
  assert.equal(leerCaja("/mensaje #clinica-sonrisa", C).agente, "iman");
  assert.deepEqual([leerCaja("#clinica-sonrisa /cambio otro color", C).accion, leerCaja("#clinica-sonrisa /cambio otro color", C).agente], ["cambio", "atlas"]);
  assert.equal(leerCaja("/datos #anonymo", C).como, "escrita");
});

test("adivina por las palabras solo si es claro, y lo dice", () => {
  const l = leerCaja("#anonymo un reel para el lunes", C);
  assert.deepEqual([l.accion, l.como], ["guion", "palabras"]);
  assert.equal(leerCaja("hola, ¿qué tal?", C).accion, undefined, "sin pistas no inventa nada");
});

test("nombres a medias, nombres repetidos y nombres que no existen", () => {
  assert.deepEqual(clientesDe("sonr", C).map((c) => c.id), ["clinica-sonrisa"]);
  assert.deepEqual(clientesDe("Dra-Luz", C).map((c) => c.id), ["clinica-luz"], "también por su otro nombre");
  const dos = leerCaja("#clinica /muestra", C);
  assert.equal(dos.cliente, undefined);
  assert.match(dos.dudas[0]!, /puede ser Clínica Sonrisa, Clínica Luz/);
  assert.match(leerCaja("#panaderia /muestra", C).dudas[0]!, /No encontré el cliente/);
  assert.match(leerCaja("@vector /guion", C).dudas[0]!, /No conozco a «@vector»/);
  assert.match(leerCaja("/volar", C).dudas[0]!, /No conozco «\/volar»/);
  assert.equal(agenteDe("ima"), "iman");
  assert.equal(accionDe("gui"), "guion");
  assert.equal(accionDe("reel"), "guion");
});

test("si el agente no hace esa acción, manda la acción y lo avisa", () => {
  const l = leerCaja("@faro /muestra #clinica-sonrisa", C);
  assert.equal(l.agente, "iman");
  assert.match(l.dudas[0]!, /Faro no hace «Ver su muestra»: lo hace Imán/);
});

test("el cliente de la última vez se mantiene si no se nombra otro", () => {
  assert.equal(leerCaja("/mensaje", C, "clinica-luz").cliente, "clinica-luz");
  assert.equal(leerCaja("/mensaje #anonymo", C, "clinica-luz").cliente, "anonymo");
  assert.equal(leerCaja("/mensaje", C, "ya-no-existe").cliente, undefined);
});

test("las sugerencias se ponen en lugar de lo que se está escribiendo", () => {
  assert.deepEqual(marcaEnCurso("@faro #cli", 10), { marca: "#", palabra: "cli", desde: 6 });
  assert.equal(marcaEnCurso("hola mundo", 10), undefined);
  assert.equal(marcaEnCurso("correo@dominio", 14), undefined, "una arroba en medio de una palabra no es un agente");
  const r = ponerSugerencia("@faro #cli un reel", 10, "#clinica-sonrisa");
  assert.equal(r.texto, "@faro #clinica-sonrisa un reel");
  assert.equal(r.cursor, 23);
});
