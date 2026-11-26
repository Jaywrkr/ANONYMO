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

test("laminasHTML: el trabajo va a pantalla completa, sin aparatos ni marca del estudio", () => {
  const L = { titulo: "Coresolutions", imagen: "core-abc-1440.jpg", fondo: "#01095c", vistas: ["core-abc-p1.jpg", "core-abc-p2.jpg", "core-abc-p3.jpg"], logo: "core-abc-logo.png" };
  const p = { id: "p01", serie: "Casos", nSerie: 1, lamina: L };
  const caso = laminasHTML(ESTILOS.unmake!, { ...p, formato: "carrusel", plantilla: "caso" });
  assert.equal(caso.length, 4, "tres tramos y el logo");
  assert.ok(caso[1]!.html.includes("/material/core-abc-p2.jpg") && caso[3]!.html.includes("/material/core-abc-logo.png"));
  assert.ok(caso.every((d) => d.html.includes("#01095c") && !/unmake\.|Nº|desliza|Coresolutions|border-radius/.test(d.html)), "sin firma, serie, contador, rótulo ni aparatos");
  const detalle = laminasHTML(ESTILOS.unmake!, { ...p, lamina: { ...L, vistas: ["core-abc-p2.jpg"], logo: undefined }, formato: "post", plantilla: "detalle" });
  assert.ok(detalle.length === 1 && detalle[0]!.html.includes("object-fit:cover") && detalle[0]!.html.includes("core-abc-p2.jpg"));
  const logo = laminasHTML(ESTILOS.unmake!, { ...p, lamina: { ...L, vistas: undefined }, formato: "post", plantilla: "logo" });
  assert.ok(logo.length === 1 && logo[0]!.html.includes("core-abc-logo.png") && !logo[0]!.html.includes("-p1.jpg"));
  const reel = laminasHTML(ESTILOS.unmake!, { ...p, lamina: { ...L, vistas: ["core-abc-v.jpg"], video: "core-abc-v.mp4" }, formato: "reel", plantilla: "portada" });
  assert.ok(reel[0]!.alto === 1920 && reel[0]!.html.includes("core-abc-v.jpg"));
});
