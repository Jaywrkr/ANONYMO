// El enfoque de la cuenta (sistema/121): Faro decide si muestra trabajo o conversa, y las plantillas de trabajo lo dibujan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerCalendarioIA, revisarPieza } from "../src/video/contenido.ts";
import { ESTILOS, laminasHTML } from "../src/video/artes-html.ts";

const fechas = ["2027-01-04", "2027-01-06"];
const fila = (n: number, plantilla: string, formato = "post") => ({ n, serie: plantilla, formato, hora: "18:00", ideaA: `Proyecto ${n}`, ideaB: "" });

test("leerCalendarioIA: lee el enfoque y por qué; sin enfoque, conversa", () => {
  const r = leerCalendarioIA({ enfoque: "portafolio", porQueEnfoque: "Es un estudio.", series: [{ nombre: "caso", para: "x", plantilla: "caso" }, { nombre: "detalle", para: "y", plantilla: "detalle" }], fechas: [fila(1, "caso", "carrusel"), fila(2, "detalle", "carrusel")] }, fechas);
  assert.equal(r.enfoque, "portafolio");
  assert.equal(r.porQueEnfoque, "Es un estudio.");
  assert.equal(r.filas[1]!.formato, "post", "un detalle es un post aunque pidan carrusel");
  assert.equal(leerCalendarioIA({ series: [{ nombre: "a", para: "", plantilla: "frase" }], fechas: [fila(1, "a"), fila(2, "a")] }, fechas).enfoque, "conversacion");
});

test("revisarPieza: una pieza de trabajo no pide pregunta ni sticker, pero sí su captura y poco texto", () => {
  const base = { formato: "post" as const, historias: [] };
  assert.deepEqual(revisarPieza({ ...base, texto: "Coresolutions\nWeb · 2026", plantilla: "detalle", lamina: { titulo: "Coresolutions", imagen: "a-1440.jpg" } }, "", "", "", "portafolio"), []);
  assert.match(revisarPieza({ ...base, texto: "Coresolutions", plantilla: "caso", lamina: { titulo: "x" } }, "", "", "", "portafolio").join(), /Falta la captura/);
  assert.match(revisarPieza({ ...base, texto: "a\nb\nc\nd\ne", plantilla: "espacio", lamina: { titulo: "x", imagen: "a-1440.jpg" } }).join(), /el texto sobra/);
  assert.match(revisarPieza({ ...base, texto: "Un consejo.", plantilla: "frase", lamina: { titulo: "x" } }).join(), /pregunta/);
});

test("laminasHTML: el caso son 5 láminas con la captura; detalle y espacio, una; el reel de un trabajo muestra el celular", () => {
  const p = { id: "p01", serie: "Casos", nSerie: 1, lamina: { titulo: "Coresolutions", imagen: "core-abc-1440.jpg", recorte: "medio" as const } };
  const caso = laminasHTML(ESTILOS.unmake!, { ...p, formato: "carrusel", plantilla: "caso" });
  assert.equal(caso.length, 5);
  assert.ok(caso[0]!.html.includes("/material/core-abc-1440.jpg") && caso[0]!.html.includes("/material/core-abc-390.jpg"));
  assert.equal(laminasHTML(ESTILOS.unmake!, { ...p, formato: "post", plantilla: "detalle" }).length, 1);
  assert.ok(laminasHTML(ESTILOS.unmake!, { ...p, formato: "post", plantilla: "espacio" })[0]!.html.includes("rotateY"));
  const reel = laminasHTML(ESTILOS.unmake!, { ...p, formato: "reel", plantilla: "portada" });
  assert.equal(reel[0]!.alto, 1920);
  assert.ok(reel[0]!.html.includes("/material/core-abc-390.jpg"));
});
