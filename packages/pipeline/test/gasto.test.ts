import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { TopeDeGasto, alAvisarGasto, anotarGasto, cambiarTopes, costoLlamada, estadoGasto, exigirPresupuesto, leerMes, precioModelo, resumenGasto, topeValido, type AvisoGasto } from "../src/gasto.ts";

test("el costo sale del modelo que respondió, con los precios vigentes", () => {
  assert.equal(precioModelo("claude-sonnet-5-5").entrada, 2);
  assert.equal(precioModelo("claude-haiku-5-5").salida, 0.5);
  assert.equal(precioModelo("claude-opus-5-5").salida, 20);
  assert.equal(precioModelo("claude-fable-5-2").entrada, 8);
  assert.equal(precioModelo("otro-modelo").conocido, false);
  // 10.000 de entrada y 4.000 de salida con Sonnet 5.5: 0,02 + 0,04.
  assert.equal(costoLlamada("claude-sonnet-5-5", { entrada: 10_000, salida: 4_000 }), 0.06);
  // Lo mismo con Haiku 5.5 cuesta veinte veces menos.
  assert.equal(costoLlamada("claude-haiku-5-5", { entrada: 10_000, salida: 4_000 }), 0.003);
  // Leer del caché cuesta la vigésima parte de la entrada normal, y cada búsqueda web se suma.
  assert.equal(costoLlamada("claude-sonnet-5-5", { entrada: 0, salida: 0, cacheL: 1_000_000, busquedas: 2 }), 0.12);
});

test("cada llamada queda anotada, se suma por día y por mes, y avisa al 50, 80 y 100 % del tope", async () => {
  const avisos: AvisoGasto[] = [];
  alAvisarGasto((a) => { avisos.push(a); });
  const hoy = new Date("2026-11-19T15:00:00Z");
  await cambiarTopes({ diario: 1, mensual: 10 }, "jay", hoy);
  // 200.000 de salida con Sonnet = USD 2 → no; se usan llamadas de USD 0,30: 30.000 de salida.
  const una = () => anotarGasto({ origen: "vector", tarea: "4.vector", proyecto: "clinica-x", modelo: "claude-sonnet-5-5", entrada: 0, salida: 30_000 }, hoy);
  assert.equal(await una(), 0.3);
  assert.equal(avisos.length, 0, "con 30 % no avisa");
  await una();
  assert.deepEqual(avisos.map((a) => [a.alcance, a.nivel]), [["dia", 50]]);
  await una();
  assert.deepEqual(avisos.map((a) => [a.alcance, a.nivel]), [["dia", 50], ["dia", 80]]);
  await exigirPresupuesto(false, hoy); // 0,90 de 1: todavía pasa
  await una();
  assert.deepEqual(avisos.at(-1), { alcance: "dia", nivel: 100, gastado: 1.2, tope: 1 });
  // Con el tope del día alcanzado no se llama a la IA, ni a mano ni automático.
  await assert.rejects(exigirPresupuesto(false, hoy), (e: Error) => e instanceof TopeDeGasto && /tope de gasto en IA de hoy \(USD 1\.00\)/.test(e.message));
  await assert.rejects(exigirPresupuesto(true, hoy), /sigue mañana/);
  // Jay da permiso para USD 2 más hoy: lo lanzado a mano sigue, lo automático no.
  await cambiarTopes({ extra: 2 }, "jay", hoy);
  await exigirPresupuesto(false, hoy);
  await assert.rejects(exigirPresupuesto(true, hoy), TopeDeGasto);
  // Mañana el permiso ya no vale y el día empieza en cero.
  const manana = new Date("2026-11-20T15:00:00Z");
  assert.equal((await estadoGasto(manana)).hoy, 0);
  assert.equal((await estadoGasto(manana)).extra, 0);
  await exigirPresupuesto(true, manana);
  // Las 23:30 de Cuenca del 19 todavía son el 19, aunque en UTC ya sea 20.
  await anotarGasto({ origen: "atlas", modelo: "claude-haiku-5-5", entrada: 1000, salida: 1000 }, new Date("2026-11-20T04:30:00Z"));
  assert.equal((await estadoGasto(hoy)).hoy, 1.2006);
  const m = await leerMes("2026-11");
  assert.equal(m.llamadas.length, 5);
  assert.equal(m.llamadas[0].proyecto, "clinica-x");
});

test("el resumen separa por agente, por modelo y por proyecto, y descuenta el saldo", async () => {
  const hoy = new Date("2026-11-19T16:00:00Z");
  await cambiarTopes({ saldo: 269.06 }, "jay", new Date("2026-11-19T15:30:00Z"));
  await anotarGasto({ origen: "juez", proyecto: "clinica-x", modelo: "claude-opus-5-5", entrada: 10_000, salida: 5_000, auto: true }, hoy);
  const r = await resumenGasto(hoy);
  assert.equal(r.mes.llamadas, 6);
  assert.equal(r.porOrigen[0].nombre, "vector");
  assert.deepEqual(r.porModelo.map((x) => x.nombre).sort(), ["Haiku 5.5", "Opus 5.5", "Sonnet 5.5"]);
  assert.equal(r.porProyecto[0].nombre, "clinica-x");
  assert.equal(r.automatico, 0.14);
  // Solo descuenta lo gastado después de anotar el saldo: la llamada del juez (0,14).
  assert.equal(r.saldo?.queda, 268.92);
  assert.equal(r.semana.desde, "2026-11-16");
  assert.ok(topeValido(8) && !topeValido(0) && !topeValido(9999) && !topeValido("8"));
});

test("un tope del mes alcanzado frena todo, aunque el día vaya bien", async () => {
  const hoy = new Date("2026-11-21T15:00:00Z");
  await cambiarTopes({ diario: 100, mensual: 1 }, "jay", hoy);
  await assert.rejects(exigirPresupuesto(false, hoy), /de este mes \(USD 1\.00\)/);
  await cambiarTopes({ diario: 8, mensual: 60 }, "jay", hoy);
  await exigirPresupuesto(false, hoy);
});
