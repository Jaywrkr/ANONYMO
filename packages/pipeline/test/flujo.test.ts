import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
const { nuevo, aprobar, cambiar, parar, reanudar, cambiarPausas, restaurar } = await import("../src/correr.ts");
const { leerProyecto, leerEntrega, versiones } = await import("../src/almacen.ts");
const { simulado } = await import("../src/motor.ts");
const { anotar } = await import("../src/cliente.ts");
const { tokenPortal, tokenValido, comentarioPortal } = await import("../src/portal.ts");
const { guardarArchivo, rutaArchivo } = await import("../src/archivos.ts");
const { responder } = await import("../src/cuestionario.ts");
const { buscar } = await import("../src/buscar.ts");

const silencio = () => {};
const pedido = (id: string, extra = {}) => ({ id, cliente: id, tipo: "web" as const, descripcion: "Web de prueba", creado: new Date().toISOString(), ...extra });

test("flujo completo: pausa, cambio, aprobar, terminar", async () => {
  let p = await nuevo(pedido("flujo"), simulado, silencio);
  assert.equal(p.estado, "esperando");
  assert.equal(p.faseActual, 1);
  p = await cambiar("flujo", "jay", "más cálido", "nova", simulado, silencio);
  assert.equal(leerEntrega("flujo", "1.nova")?.version, 2);
  assert.deepEqual(versiones("flujo", "1.nova"), [1]);
  p = await aprobar("flujo", "jay", undefined, simulado, silencio);
  assert.equal(p.faseActual, 4);
  p = await aprobar("flujo", "jay", undefined, simulado, silencio);
  assert.ok(["listo", "esperando"].includes(p.estado));
});

test("roles: la fase de Luna no la aprueba Jay sin forzar", async () => {
  await nuevo(pedido("roles", { tipo: "marca", pausas: [2] }), simulado, silencio);
  await assert.rejects(() => aprobar("roles", "jay", undefined, simulado, silencio), /Luna/);
  const p = await aprobar("roles", "jay", undefined, simulado, silencio, true);
  assert.notEqual(p.faseActual, 2);
});

test("parar, reanudar y cambiar pausas", async () => {
  await nuevo(pedido("pausas"), simulado, silencio);
  assert.equal(parar("pausas", "jay").estado, "parado");
  assert.equal(reanudar("pausas").estado, "esperando");
  cambiarPausas("pausas", "nunca");
  assert.equal(leerProyecto("pausas").estado, "en-curso");
});

test("voz del cliente: se registra, reparte y los agentes la leen", async () => {
  await nuevo(pedido("voz", { pausas: "nunca" }), simulado, silencio);
  const r = anotar("voz", "más elegante", "jay");
  assert.ok(r.base.includes("4.orla"));
  assert.equal(leerProyecto("voz").tareas["4.orla"], "rehacer");
});

test("volver a una versión anterior", async () => {
  await nuevo(pedido("volver"), simulado, silencio);
  await cambiar("volver", "jay", "otra cosa", "sonda", simulado, silencio);
  const r = restaurar("volver", "1.sonda", 1);
  assert.equal(r.nueva, 3);
  assert.equal(leerEntrega("volver", "1.sonda")?.version, 3);
});

test("portal: token válido, inválido y comentario pendiente", async () => {
  await nuevo(pedido("portal"), simulado, silencio);
  const t = tokenPortal("portal");
  assert.ok(tokenValido("portal", t));
  assert.ok(!tokenValido("portal", "x".repeat(t.length)));
  assert.ok(!tokenValido("portal", undefined));
  await comentarioPortal("portal", "me gusta");
  assert.equal(leerProyecto("portal").pendientesCliente?.length, 1);
});

test("archivos: nombres seguros, sin salirse de la carpeta, tipos permitidos", async () => {
  await nuevo(pedido("archivos"), simulado, silencio);
  const a = guardarArchivo("archivos", "../../Foto Consultorio.JPG", Buffer.from("x"));
  assert.equal(a.nombre, "foto-consultorio.jpg");
  assert.equal(rutaArchivo("archivos", "../estado.json"), undefined);
  assert.throws(() => guardarArchivo("archivos", "virus.exe", Buffer.from("x")), /no permitido/);
});

test("cuestionario: responder quita la pregunta", async () => {
  const p = await nuevo(pedido("preguntas"), simulado, silencio);
  const q = p.plan.preguntas[0];
  responder("preguntas", { [q]: "Jóvenes" }, "cliente");
  assert.ok(!leerProyecto("preguntas").plan.preguntas.includes(q));
});

test("buscar encuentra entregas sin importar tildes", () => {
  assert.ok(buscar("investigacion").length > 0);
});
