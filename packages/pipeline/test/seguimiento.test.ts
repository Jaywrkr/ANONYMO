// Seguimiento a los 3 días y propuesta con «Aceptar» (sistema/80).
import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparHorario, aplicarCambio, anotarPropuesta, contactadoEn, contenidoMuestra, mensajeCobro, mensajeSeguimiento, plantillaDe, resultadosPlantillas, tocaSeguimiento, type Prospecto } from "../src/index.ts";

const dia = 24 * 60 * 60 * 1000;
const base = (x: Partial<Prospecto> = {}): Prospecto => ({
  id: "lugar-1", nombre: "Clínica Dental Sonrisa", direccion: "Av. Solano 1-23", ciudad: "Cuenca", rubro: "odontólogo", resenas: 10, telefono: "099 000 0003",
  estado: "contactado", agregado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z",
  historial: [{ cuando: "2026-11-01T15:00:00Z", que: "Pasó a «Contactado»" }], ...x,
});
const t0 = Date.parse("2026-11-01T15:00:00Z");

test("el seguimiento toca a los 3 días, una sola vez y solo si no respondió", () => {
  assert.equal(contactadoEn(base()), "2026-11-01T15:00:00Z");
  assert.ok(!tocaSeguimiento(base(), new Date(t0 + 2 * dia)), "a los 2 días todavía no");
  assert.ok(tocaSeguimiento(base(), new Date(t0 + 3 * dia)), "a los 3 días sí");
  assert.ok(!tocaSeguimiento(base({ estado: "respondio" }), new Date(t0 + 5 * dia)), "si respondió, no");
  assert.ok(!tocaSeguimiento(base({ muestra: { vistas: 1, quiere: "2026-11-02T00:00:00Z" } }), new Date(t0 + 5 * dia)), "si pidió la web, no");
  assert.ok(!tocaSeguimiento(base({ historial: [] }), new Date(t0 + 5 * dia)), "sin fecha de contacto, no");
  const p = base();
  aplicarCambio(p, { seguimiento: true }, "jay");
  assert.ok(p.seguimiento && p.historial!.some((h) => h.que === "Se le mandó el seguimiento"));
  assert.ok(!tocaSeguimiento(p, new Date(t0 + 9 * dia)), "una sola vez");
  const antes = p.seguimiento;
  aplicarCambio(p, { seguimiento: true }, "jay");
  assert.equal(p.seguimiento, antes, "marcarlo de nuevo no cambia la fecha");
});

test("el mensaje de seguimiento lleva la propuesta y no presiona", () => {
  const m = mensajeSeguimiento(base(), "Jay, ANONYMO", "https://x/m/a", "https://x/p/a");
  assert.match(m, /https:\/\/x\/m\/a/);
  assert.match(m, /https:\/\/x\/p\/a/);
  assert.match(m, /no es el momento/);
  assert.match(mensajeSeguimiento(base({ muestra: { vistas: 2 } }), "J", "https://x/m/a", "https://x/p/a"), /alcanzaron a abrir/);
});

test("abrir y aceptar la propuesta queda anotado; aceptar pasa a «Respondió» y avisa una vez", () => {
  const p = base();
  assert.deepEqual(anotarPropuesta(p, "vista", new Date(t0)), { avisar: true });
  assert.deepEqual(anotarPropuesta(p, "vista", new Date(t0 + 60_000)), { avisar: false });
  assert.equal(p.propuesta?.vistas, 2);
  assert.deepEqual(anotarPropuesta(p, "acepto", new Date(t0 + 120_000)), { avisar: true });
  assert.equal(p.estado, "respondio");
  assert.deepEqual(anotarPropuesta(p, "acepto", new Date(t0 + 180_000)), { avisar: false });
  assert.equal(p.historial!.filter((h) => h.que === "Aceptó la propuesta").length, 1);
  const c = base({ estado: "reunion" });
  anotarPropuesta(c, "acepto");
  assert.equal(c.estado, "reunion", "si ya estaba más adelante, no retrocede");
  assert.ok(["sereno", "grafico"].includes(plantillaDe(p)));
});

test("el horario de Google se agrupa y la muestra dice lo de hoy (sistema/81)", () => {
  const g = ["lunes: 9:00–13:00, 15:00–19:00", "martes: 9:00–13:00, 15:00–19:00", "miércoles: 9:00–13:00, 15:00–19:00", "jueves: 9:00–13:00, 15:00–19:00", "viernes: 9:00–13:00, 15:00–19:00", "sábado: 9:00–13:00", "domingo: Cerrado"];
  assert.deepEqual(agruparHorario(g), [["Lunes a viernes", "9:00 – 13:00 y 15:00 – 19:00"], ["Sábado", "9:00 – 13:00"]]);
  assert.equal(agruparHorario(["lunes: Cerrado"]), undefined, "si no vienen los 7 días, no se usa");
  assert.equal(agruparHorario(Array(7).fill("x: Cerrado")), undefined);
  // 15 nov 2026 es domingo en Cuenca; el 16, lunes.
  const dom = contenidoMuestra(base({ horario: g }), new Date("2026-11-15T17:00:00Z"));
  assert.equal(dom.hoy, "Cerrado");
  assert.ok(dom.horarioReal);
  assert.equal(contenidoMuestra(base({ horario: g }), new Date("2026-11-16T17:00:00Z")).hoy, "9:00 – 13:00 y 15:00 – 19:00");
  const sin = contenidoMuestra(base());
  assert.ok(!sin.horarioReal && sin.horario.length === 2, "sin horario de Google va el de ejemplo, y se dice");
});

test("el cobro pide la mitad y la tabla de plantillas cuenta solo lo enviado (sistema/81)", () => {
  assert.match(mensajeCobro("Notaría Vega", "Jay", 390, true), /USD 195 \+ IVA \(50 %\)/);
  const a = base({ id: "a", plantilla: "sereno", muestra: { vistas: 2, quiere: "2026-11-02T00:00:00Z" }, propuesta: { vistas: 1, acepto: "2026-11-03T00:00:00Z" } });
  const b = base({ id: "b", plantilla: "grafico", muestra: { vistas: 1 } });
  const c = base({ id: "c", plantilla: "grafico", estado: "nuevo", historial: [] });
  assert.deepEqual(resultadosPlantillas([a, b, c]), { sereno: { enviadas: 1, abiertas: 1, quieren: 1, aceptaron: 1 }, grafico: { enviadas: 1, abiertas: 1, quieren: 0, aceptaron: 0 } });
});
