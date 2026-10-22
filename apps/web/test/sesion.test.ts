// Entrada al estudio en línea (sistema/21).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ESTUDIO_SECRETO = "s".repeat(40);
process.env.ESTUDIO_CLAVE_JAY = "clave-de-prueba-jay";
delete process.env.ESTUDIO_CLAVE_LUNA;
const { claveValida, crearSesion, leerSesion, sesionConfigurada, DURACION } = await import("../lib/sesion.ts");

test("solo entra quien tiene clave, y con la clave correcta", async () => {
  assert.equal(sesionConfigurada(), true);
  assert.equal(await claveValida("jay", "clave-de-prueba-jay"), true);
  assert.equal(await claveValida("jay", "otra"), false);
  assert.equal(await claveValida("luna", "clave-de-prueba-jay"), false); // Luna sin clave: no entra
});

test("la sesión firmada se reconoce, y una alterada o vencida no", async () => {
  const s = await crearSesion("jay");
  assert.equal(await leerSesion(s), "jay");
  assert.equal(await leerSesion(s.replace(/^jay/, "luna")), undefined);
  assert.equal(await leerSesion(s.slice(0, -2) + "xx"), undefined);
  assert.equal(await leerSesion(s, Date.now() + (DURACION + 60) * 1000), undefined);
});

test("cambiar la clave cierra las sesiones abiertas", async () => {
  const s = await crearSesion("jay");
  process.env.ESTUDIO_CLAVE_JAY = "clave-nueva-de-jay";
  assert.equal(await leerSesion(s), undefined);
  process.env.ESTUDIO_CLAVE_JAY = "clave-de-prueba-jay";
});

test("sin secreto largo no hay entrada posible", async () => {
  process.env.ESTUDIO_SECRETO = "corto";
  assert.equal(sesionConfigurada(), false);
  assert.equal(await claveValida("jay", "clave-de-prueba-jay"), false);
  process.env.ESTUDIO_SECRETO = "s".repeat(40);
});
