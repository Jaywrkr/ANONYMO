import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiarPieza, fechasDelMes, leerMesIA, mesDeTexto, mesPorDefecto, nombreMes, resumenMes, textoMesParaCliente, vecesPorSemana, type MesContenido } from "../src/index.ts";

test("cada cuánto publica sale de lo que dice la ficha", () => {
  assert.equal(vecesPorSemana("3 veces por semana"), 3);
  assert.equal(vecesPorSemana("dos a la semana"), 2);
  assert.equal(vecesPorSemana("Todos los días"), 7);
  assert.equal(vecesPorSemana("8 veces al mes"), 2);
  assert.equal(vecesPorSemana(""), 3, "sin dato, tres por semana");
  assert.equal(vecesPorSemana("20 por semana"), 7, "nunca más de una por día");
});

test("las fechas las pone el sistema, repartidas en la semana", () => {
  const f = fechasDelMes("2026-12", "3 veces por semana");
  assert.equal(f.length, 13, "diciembre 2026: lunes, miércoles y viernes");
  assert.equal(f[0], "2026-12-02");
  assert.ok(f.every((x) => [1, 3, 5].includes(new Date(`${x}T12:00:00Z`).getUTCDay())));
  assert.equal(fechasDelMes("2027-02", "una vez por semana").length, 4);
});

test("el mes que se planifica: el siguiente, o el que se nombra", () => {
  assert.equal(mesPorDefecto(new Date("2026-11-20T15:00:00Z")), "2026-12");
  assert.equal(mesPorDefecto(new Date("2026-12-31T20:00:00Z")), "2027-01");
  assert.equal(mesDeTexto("arma diciembre", new Date("2026-11-20T15:00:00Z")), "2026-12");
  assert.equal(mesDeTexto("el de enero", new Date("2026-11-20T15:00:00Z")), "2027-01", "enero ya pasó este año: es el próximo");
  assert.equal(mesDeTexto("sin mes", new Date()), undefined);
  assert.equal(nombreMes("2026-12"), "diciembre 2026");
});

test("lo que devuelve Faro se limpia, va una pieza por fecha y si falta mucho no sirve", () => {
  const fechas = ["2026-12-02", "2026-12-04", "2026-12-07"];
  const r = leerMesIA({ series: [{ nombre: "Antes y después", para: "x" }], piezas: [{ n: 2, serie: "Antes y después", formato: "reel", idea: "b", texto: "tb", visual: "v" }, { n: 1, serie: "", formato: "raro", idea: "a", texto: "ta", visual: "v" }, { n: 3, serie: "Antes y después", formato: "post", idea: "c", texto: "tc", visual: "" }, { n: 9, idea: "fuera", texto: "x" }] }, fechas);
  assert.deepEqual(r.piezas.map((p) => [p.fecha, p.formato, p.serie]), [["2026-12-02", "post", "Antes y después"], ["2026-12-04", "reel", "Antes y después"], ["2026-12-07", "post", "Antes y después"]]);
  assert.throws(() => leerMesIA({ series: [{ nombre: "S" }], piezas: [{ n: 1, idea: "a", texto: "t" }] }, fechas), /no devolvió el mes completo/);
});

const mes = (): MesContenido => ({ id: "c-anonymo-2026-12", cliente: "anonymo", nombre: "Unmake", mes: "2026-12", canales: "Instagram", frecuencia: "3", series: [{ nombre: "S", para: "" }], historia: [], creado: "", actualizado: "",
  piezas: [{ id: "p01", fecha: "2026-12-02", serie: "S", formato: "reel", idea: "Idea uno", texto: "Texto uno", visual: "v", estado: "propuesta" }, { id: "p02", fecha: "2026-12-04", serie: "S", formato: "post", idea: "Idea dos", texto: "Texto dos", visual: "v", estado: "propuesta" }] });

test("aprobar, pedir un cambio y corregir a mano, con su historia", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  mkdirSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista"), { recursive: true });
  writeFileSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista", "meses.json"), JSON.stringify({ actualizado: "", meses: { [mes().id]: mes() } }));
  await assert.rejects(cambiarPieza("c-anonymo-2026-12", "p01", { estado: "cambio" }, "jay"), /Cuenta qué hay que cambiar/);
  let m = await cambiarPieza("c-anonymo-2026-12", "p01", { estado: "cambio", nota: "Más corto" }, "luna");
  assert.deepEqual([m.piezas[0]!.estado, m.piezas[0]!.nota], ["cambio", "Más corto"]);
  m = await cambiarPieza("c-anonymo-2026-12", "p01", { texto: "Texto corto" }, "jay");
  assert.equal(m.piezas[0]!.estado, "propuesta", "corregida a mano, vuelve a estar por revisar");
  await assert.rejects(cambiarPieza("c-anonymo-2026-12", "p01", { texto: "  " }, "jay"), /No puede quedar vacía/);
  m = await cambiarPieza("c-anonymo-2026-12", "p01", { estado: "aprobada" }, "jay");
  assert.deepEqual(resumenMes(m), { total: 2, aprobadas: 1, cambios: 0, porRevisar: 1 });
  assert.equal(m.historia.length, 3);
  const t = textoMesParaCliente(m);
  assert.match(t, /miércoles 2 · Reel · S\nIdea uno\n«Texto corto»/);
  assert.ok(!t.includes("Idea dos"), "solo van las aprobadas");
});
