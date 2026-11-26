import { test } from "node:test";
import assert from "node:assert/strict";
import { aprobarPropuesta, direccionVacia, editarDireccion, anotarAprendido, marcaDeWeb, textoDireccionCliente, estadoDireccion, direccionDe } from "../src/clientes/direccion.ts";
import { estiloPara } from "../src/video/artes-html.ts";

const HTML = `<html><head><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter&display=swap" rel="stylesheet">
<link rel="apple-touch-icon" href="/icono.png"></head><body><header><img class="logo" src="/img/logo.svg" alt="Marca"></header></body></html>`;
const CSS = `body{background:#ffffff;color:#111111;font-family:Inter, sans-serif} h1{font-family:"Space Grotesk",system-ui;color:#e4572e} .btn{background:#e4572e} a{color:#e4572e} .b{border-color:#2a9d8f} p{color:#111}`;

test("de una web salen sus colores, sus letras y su logo, sin IA", () => {
  const m = marcaDeWeb(HTML, [CSS], "https://ejemplo.ec/");
  assert.equal(m.colores[0]!.hex, "#e4572e", "el acento que más se repite va primero");
  assert.ok(m.colores.some((c) => c.hex === "#111111" && c.nombre === "tinta"));
  assert.ok(m.colores.some((c) => c.hex === "#ffffff" && c.nombre === "fondo"));
  assert.deepEqual(m.letras.map((l) => l.familia).sort(), ["Inter", "Space Grotesk"]);
  assert.equal(m.logo, "https://ejemplo.ec/img/logo.svg");
});

test("la guía manda; la web solo llena lo que falta", () => {
  let d = direccionVacia();
  d = { ...d, propuesta: { desde: "guia", cuando: "", colores: [{ hex: "#01095c", nombre: "navy" }], letras: [{ familia: "IBM Plex Sans", uso: "títulos" }], palabras: ["claro"], si: [], no: ["No deformar el logo"] } };
  d = aprobarPropuesta(d, "jay");
  assert.equal(d.propuesta, undefined);
  assert.equal(d.colores[0]!.origen, "guia");
  d = { ...d, propuesta: { desde: "web", cuando: "", colores: [{ hex: "#ff0000" }], letras: [{ familia: "Arial Black" }], logo: "https://x.ec/logo.png", palabras: [], si: [], no: [] } };
  d = aprobarPropuesta(d, "jay");
  assert.deepEqual(d.colores.map((c) => c.hex), ["#01095c"], "los colores de la web no pisan los de la guía");
  assert.deepEqual(d.letras.map((l) => l.familia), ["IBM Plex Sans"]);
  assert.equal(d.logo?.url, "https://x.ec/logo.png", "el logo sí llena lo que faltaba");
});

test("lo de ustedes se escribe una línea por cosa y no borra lo de la guía", () => {
  let d = aprobarPropuesta({ ...direccionVacia(), propuesta: { desde: "guia", cuando: "", colores: [], letras: [], palabras: [], si: ["Logo sobre blanco"], no: [] } }, "jay");
  d = editarDireccion(d, { si: "Mucho aire\nFotos reales", referencias: "https://notfound.es — cómo muestran el trabajo\nsin enlace", colores: "#0E0C0C tinta\nnada" }, "luna");
  assert.deepEqual(d.si.map((x) => x.texto), ["Logo sobre blanco", "Mucho aire", "Fotos reales"]);
  assert.equal(d.referencias.length, 1);
  assert.equal(d.referencias[0]!.nota, "cómo muestran el trabajo");
  assert.deepEqual(d.colores, [{ hex: "#0e0c0c", nombre: "tinta", origen: "ustedes" }]);
  d = editarDireccion(d, { si: "" }, "luna");
  assert.deepEqual(d.si.map((x) => x.texto), ["Logo sobre blanco"], "vaciar lo suyo no borra lo de la guía");
});

test("todos los agentes leen lo mismo, con lo aprendido al revisar", () => {
  let d = editarDireccion(direccionVacia(), { palabras: "simple\ndirecto", no: "Sin precios" }, "jay");
  d = anotarAprendido(d, "mucho texto en el arte", "luna", "contenido 2027-01");
  const t = textoDireccionCliente(d);
  assert.match(t, /Cómo debe sentirse: simple, directo/);
  assert.match(t, /- Sin precios/);
  assert.match(t, /mucho texto en el arte/);
  assert.equal(textoDireccionCliente(undefined), "");
  assert.deepEqual(estadoDireccion(d), { marca: false, bueno: true, pendiente: false });
});

test("el arte usa los colores y las letras de la Dirección", () => {
  const d = editarDireccion(direccionVacia(), { colores: "#FAF7F0 fondo\n#1B1B1B tinta\n#E4572E", letras: "Space Grotesk\nInter" }, "jay");
  const e = estiloPara("peluqueria-sol", "Peluquería Sol", "", d);
  assert.equal(e.fondo, "#faf7f0");
  assert.equal(e.tinta, "#1b1b1b");
  assert.deepEqual(e.acentos, ["#e4572e"]);
  assert.match(e.titulo, /^'Space Grotesk'/);
  assert.deepEqual(e.fuentes, ["Space Grotesk", "Inter"]);
  assert.equal(estiloPara("peluqueria-sol", "Peluquería Sol").fuentes, undefined, "sin Dirección, como antes");
});

test("una Dirección guardada mal formada se lee sin romper", () => {
  const d = direccionDe({ colores: [{ hex: "rojo" }, { hex: "#123456", origen: "web" }], si: "no es lista" });
  assert.equal(d!.colores.length, 1);
  assert.deepEqual(d!.si, []);
  assert.equal(direccionDe(null), undefined);
});

test("la guía reemplaza los colores que venían de la web", () => {
  let d = aprobarPropuesta({ ...direccionVacia(), propuesta: { desde: "web", cuando: "", colores: [{ hex: "#e4572e" }, { hex: "#1b1b1b" }], letras: [{ familia: "Inter" }], palabras: [], si: [], no: [] } }, "jay");
  d = aprobarPropuesta({ ...d, propuesta: { desde: "guia", cuando: "", colores: [{ hex: "#01095c" }], letras: [], palabras: [], si: [], no: [] } }, "jay");
  assert.deepEqual(d.colores.map((c) => c.hex), ["#01095c"]);
  assert.deepEqual(d.letras.map((l) => l.familia), ["Inter"], "si la guía no dice letras, quedan las de la web");
});
