import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
const { construirCartera, idFicha, resumenFicha } = await import("../src/clientes/fichas.ts");
const { guardarFicha, leerFichas } = await import("../src/clientes/almacen-fichas.ts");
const { aplicarCambio, sumarLugares } = await import("../src/prospectos/almacen-prospectos.ts");

type Prospecto = Parameters<typeof construirCartera>[0]["prospectos"][number];
const pr = (x: Partial<Prospecto>): Prospecto => ({ id: "g1", nombre: "Sonrisa Sin Web", direccion: "Cuenca", ciudad: "Cuenca", rubro: "odontólogo", resenas: 95, estrellas: 4.8, telefono: "099 000 0003", mapa: "https://maps/x", estado: "nuevo", agregado: "2026-11-01T10:00:00Z", actualizado: "2026-11-01T10:00:00Z", ...x });
const proy = (x: Record<string, unknown> = {}) => ({ id: "sonrisa-sin-web", cliente: "Sonrisa Sin Web", tipo: "web", estado: "plan", creado: "2026-11-05T10:00:00Z", actualizado: "2026-11-05T11:00:00Z", ...x });

test("el id de la ficha sale del nombre sin tildes ni signos", () => {
  assert.equal(idFicha("Clínica Sonrisa"), "clinica-sonrisa");
  assert.equal(idFicha("  ANONYMO* "), "anonymo");
});

test("un prospecto en frío no abre ficha; uno que respondió sí", () => {
  const vacio = { proyectos: [], videos: [], kits: [], guardadas: [] };
  assert.equal(construirCartera({ ...vacio, prospectos: [pr({ estado: "contactado" })] }).length, 0);
  const [f] = construirCartera({ ...vacio, prospectos: [pr({ estado: "respondio" })] });
  assert.equal(f.id, "sonrisa-sin-web");
  assert.equal(f.contacto.telefono, "099 000 0003");
  assert.match(resumenFicha(f), /respondió/);
});

test("prospecto, proyecto, video y kit del mismo cliente quedan en una sola ficha con su historia", () => {
  const cartera = construirCartera({
    prospectos: [pr({ estado: "cliente", proyecto: "sonrisa-sin-web", historial: [{ cuando: "2026-11-01T10:00:00Z", que: "Imán lo encontró" }, { cuando: "2026-11-04T10:00:00Z", que: "Se convirtió en pedido" }] })],
    proyectos: [proy(), proy({ id: "otro", cliente: "Café Lento", tipo: "marca" }), proy({ id: "viejo", cliente: "Sonrisa Sin Web", papelera: true })],
    videos: [{ id: "v-reel-ab12", nombre: "Reel", cliente: "sonrisa sin web", estado: "analizado", formatos: 1, creado: "2026-11-06T10:00:00Z", actualizado: "2026-11-07T10:00:00Z" }],
    kits: [{ id: "m-sonrisa-1", nombre: "Sonrisa Sin Web", color: "#123456", actualizado: "2026-11-03T10:00:00Z" }],
    guardadas: [],
  });
  assert.deepEqual(cartera.map((f) => f.id), ["sonrisa-sin-web", "cafe-lento"]);
  const f = cartera[0];
  assert.equal(f.proyectos.length, 1, "el de la papelera no cuenta");
  assert.equal(f.videos.length, 1, "el video entra aunque el nombre esté en minúsculas");
  assert.equal(f.kits.length, 1);
  assert.equal(f.prospecto?.id, "g1");
  assert.equal(f.actualizado, "2026-11-07T10:00:00Z");
  assert.deepEqual(f.historia.map((h) => h.que), ["Video «Reel»", "Pedido nuevo: una web", "Se convirtió en pedido", "Imán lo encontró"]);
  assert.equal(f.historia[1].enlace, "/estudio/sonrisa-sin-web");
});

test("lo escrito a mano manda: nombre, contacto y alias que juntan otros nombres", () => {
  const [f, ...resto] = construirCartera({
    guardadas: [{ id: "sebastian-silva", nombre: "Sebastián Silva", telefono: "0991112222", alias: ["Dr. Silva"], creado: "2026-10-01T00:00:00Z", actualizado: "2026-10-02T00:00:00Z" }],
    proyectos: [proy({ id: "silva", cliente: "Dr. Silva" }), proy({ id: "silva-2", cliente: "Otro nombre", ficha: "sebastian-silva" })],
    videos: [], kits: [], prospectos: [],
  });
  assert.equal(resto.length, 0);
  assert.equal(f.nombre, "Sebastián Silva");
  assert.deepEqual(f.proyectos.map((p) => p.id), ["silva", "silva-2"]);
  assert.equal(f.contacto.telefono, "0991112222");
});

test("la ficha guardada se crea, se cambia sin perder lo anterior y valida", async () => {
  await guardarFicha("anonymo", { nombre: "ANONYMO", notas: "Nosotros mismos", alias: ["Anonymo*", "anonymo"] }, "jay");
  await guardarFicha("anonymo", { nombre: "ANONYMO", web: "https://anonymo.ec" }, "luna");
  const f = (await leerFichas()).fichas.anonymo;
  assert.equal(f.notas, "Nosotros mismos");
  assert.equal(f.web, "https://anonymo.ec");
  assert.deepEqual(f.alias, undefined, "los alias que son el mismo nombre no se guardan");
  assert.equal(f.por, "luna");
  await assert.rejects(() => guardarFicha("../x", { nombre: "x" }, "jay"));
  await assert.rejects(() => guardarFicha("x", { nombre: " " }, "jay"));
});

test("el prospecto guarda su historia: encontrado, cambios de estado y pedido", () => {
  const l = { actualizado: "", firma: "", prospectos: {} as Record<string, Prospecto> };
  sumarLugares(l, [{ id: "a", nombre: "A", direccion: "", resenas: 1 }], "spa", "Cuenca", "jay");
  aplicarCambio(l.prospectos.a, { estado: "contactado" }, "jay");
  aplicarCambio(l.prospectos.a, { estado: "contactado" }, "jay");
  aplicarCambio(l.prospectos.a, { estado: "cliente", proyecto: "a" }, "luna");
  assert.deepEqual(l.prospectos.a.historial?.map((h) => h.que), ["Imán lo encontró buscando «spa» en Cuenca", "Pasó a «Contactado»", "Pasó a «Cliente»", "Se convirtió en pedido"]);
});
