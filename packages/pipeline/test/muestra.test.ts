// La muestra de cada prospecto y el aviso cuando la abre (sistema/72).
import { test } from "node:test";
import assert from "node:assert/strict";
import { anotarQuiere, anotarVista, buscarPorMuestra, contenidoMuestra, idMuestra, idMuestraValido, mensajeInicial, OFERTA, precio, PAUSA_VISITA_MS, suscripcionValida, tonoDe, type Prospecto } from "../src/index.ts";

const base = (x: Partial<Prospecto> = {}): Prospecto => ({
  id: "lugar-1", nombre: "Clínica Dental Sonrisa", direccion: "Av. Solano 1-23", ciudad: "Cuenca", rubro: "odontólogo",
  estrellas: 4.8, resenas: 95, telefono: "099 000 0003", estado: "nuevo", agregado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z", ...x,
});

test("el id de la muestra sale siempre igual, legible y válido", () => {
  const id = idMuestra(base());
  assert.match(id, /^clinica-dental-sonrisa-[0-9a-f]{6}$/);
  assert.equal(idMuestra(base()), id);
  assert.notEqual(idMuestra(base({ id: "lugar-2" })), id, "dos negocios con el mismo nombre no comparten muestra");
  assert.ok(idMuestraValido(id));
  assert.ok(!idMuestraValido("../x"));
  assert.equal(buscarPorMuestra({ a: base() }, id)?.id, "lugar-1");
});

test("el tono sale del rubro", () => {
  assert.equal(tonoDe("odontólogo"), "salud");
  assert.equal(tonoDe("notaría"), "legal");
  assert.equal(tonoDe("barbería"), "belleza");
  assert.equal(tonoDe("ferretería"), "otro");
});

test("la muestra usa lo que el negocio dice de sí mismo y completa con ejemplos", () => {
  const sin = contenidoMuestra(base());
  assert.equal(sin.tono, "salud");
  assert.equal(sin.propia, false);
  assert.match(sin.bajada, /Odontólogo en Cuenca/);
  assert.equal(sin.servicios.length, 4);
  const con = contenidoMuestra(base({ revision: { estado: "ok", https: true, celular: false, titulo: "x", ms: 900, sonda: { descripcion: "Odontología familiar desde 1998", secciones: ["Inicio", "Ortodoncia", "Implantes", "Contacto"], redes: [] } } }));
  assert.equal(con.bajada, "Odontología familiar desde 1998");
  assert.equal(con.propia, true);
  assert.deepEqual(con.servicios.slice(0, 2), ["Ortodoncia", "Implantes"], "sin «Inicio» ni «Contacto»");
});

test("el primer mensaje lleva el enlace a la muestra", () => {
  const m = mensajeInicial(base(), "Jay · ANONYMO", new Date(), "https://estudio.anonymo.ec/m/clinica-x");
  assert.match(m, /sin compromiso: https:\/\/estudio\.anonymo\.ec\/m\/clinica-x/);
  assert.doesNotMatch(m, /¿Se la puedo enviar/);
  assert.match(mensajeInicial(base(), "Jay"), /¿Se la puedo enviar por aquí\?/, "sin enlace, como antes");
});

test("abrir la muestra se anota y avisa solo si es una visita nueva", () => {
  const p = base();
  const t0 = new Date("2026-11-11T15:00:00Z");
  assert.deepEqual(anotarVista(p, t0), { avisar: true, primera: true });
  assert.equal(anotarVista(p, new Date(t0.getTime() + 60_000)).avisar, false, "recargar no vuelve a avisar");
  const r = anotarVista(p, new Date(t0.getTime() + PAUSA_VISITA_MS + 120_000));
  assert.deepEqual(r, { avisar: true, primera: false });
  assert.equal(p.muestra?.vistas, 3);
  assert.deepEqual(p.historial?.map((h) => h.que), ["Abrió su muestra", "Volvió a ver su muestra"]);
  assert.equal(anotarQuiere(p).avisar, true);
  assert.equal(anotarQuiere(p).avisar, false, "«Quiero esta web» avisa una sola vez");
  assert.equal(p.historial?.at(-1)?.que, "Tocó «Quiero esta web» en su muestra");
});

test("la oferta dice el precio con IVA", () => {
  assert.equal(precio(OFERTA.web.precio), "USD 390 + IVA");
  assert.equal(OFERTA.plan.precio, 19);
});

test("solo se aceptan suscripciones https (http local solo en el estudio de prueba)", () => {
  const keys = { p256dh: "a", auth: "b" };
  assert.ok(suscripcionValida({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys }));
  assert.ok(!suscripcionValida({ endpoint: "http://127.0.0.1:45999/push", keys }));
  assert.ok(!suscripcionValida({ endpoint: "https://x" }));
  process.env.ANONYMO_AVISOS_PRUEBA = "1";
  assert.ok(suscripcionValida({ endpoint: "http://127.0.0.1:45999/push", keys }));
  assert.ok(!suscripcionValida({ endpoint: "http://10.0.0.1/push", keys }));
  delete process.env.ANONYMO_AVISOS_PRUEBA;
});
