import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { COLORES_PRUEBA, NEUTRAS, anotarColor, aplicarCambio, colorDe, colorDeImagen, contenidoMuestra, contraste, esColorDeMarca, paletaMuestra, type Prospecto } from "../src/index.ts";
import { ORDEN_PLANTILLAS } from "../src/prospectos/tipos.ts";

const p = (x: Partial<Prospecto> = {}) => ({ id: "ChIJ1", nombre: "Consultorio Luz", rubro: "odontólogo", ciudad: "Cuenca", direccion: "Calle Larga", resenas: 40, estado: "nuevo", agregado: "", actualizado: "", ...x }) as Prospecto;

test("sin saber su color, la muestra va en blanco y negro, no con el color del rubro", () => {
  const c = contenidoMuestra(p());
  assert.equal(c.colorOrigen, "rubro");
  assert.equal(c.color, undefined);
  assert.deepEqual(c.paleta, NEUTRAS[c.plantilla]);
  // Con su color de la web, va su color.
  const w = contenidoMuestra(p({ revision: { estado: "ok", https: true, celular: true, titulo: "", ms: 1, color: "#1E5BC6" } }));
  assert.equal(w.colorOrigen, "web");
  assert.notDeepEqual(w.paleta, NEUTRAS[w.plantilla]);
});

test("lo que elige el negocio manda, y si Jay pone uno a mano, manda el de Jay", () => {
  const x = p({ color: "#0B6E69", colorCliente: "#1E5BC6" });
  assert.deepEqual(colorDe(x, "salud"), { color: "#1E5BC6", origen: "cliente" });
  assert.equal(contenidoMuestra(x).color, "#1E5BC6");
});

test("elegir su color se anota en su historial y avisa solo la primera vez", () => {
  const x = p();
  assert.deepEqual(anotarColor(x, "#1e5bc6"), { avisar: true });
  assert.equal(x.colorCliente, "#1E5BC6");
  assert.deepEqual(anotarColor(x, "#C62F2F"), { avisar: false });
  assert.deepEqual(anotarColor(x, "#C62F2F"), { avisar: false }, "el mismo color no se anota dos veces");
  assert.deepEqual(anotarColor(x, null), { avisar: false });
  assert.equal(x.colorCliente, undefined);
  assert.equal(x.historial?.length, 3);
  assert.match(x.historial![2]!.que, /blanco y negro/);
});

test("al ponerle un color a mano, se borra el que eligió el negocio", async () => {
  // cambiarProspecto aplica el cambio sobre una copia en memoria.
  const x = p({ colorCliente: "#1E5BC6" });
  aplicarCambio(x, { color: "#0B6E69" }, "jay");
  assert.equal(x.color, "#0B6E69");
  assert.equal(x.colorCliente, undefined);
});

test("los colores para probar sirven en las cinco plantillas y todo texto se lee", () => {
  for (const { color } of COLORES_PRUEBA) {
    assert.ok(esColorDeMarca(color), `${color} sirve de marca`);
    for (const pl of ORDEN_PLANTILLAS) {
      const k = paletaMuestra(pl, "salud", color);
      assert.ok(contraste(k.fondo, k.tinta) >= 4.5, `${pl} ${color}: texto sobre el fondo`);
      assert.ok(contraste(k.bloque, k.sobreBloque) >= 4.5, `${pl} ${color}: texto sobre el bloque`);
      assert.ok(contraste(k.acento, k.sobreAcento) >= 4.5, `${pl} ${color}: botón`);
    }
  }
  for (const pl of ORDEN_PLANTILLAS) {
    const k = NEUTRAS[pl];
    assert.ok(contraste(k.fondo, k.tinta) >= 7 && contraste(k.bloque, k.sobreBloque) >= 4.5 && contraste(k.acento, k.sobreAcento) >= 4.5, `la neutra de ${pl} se lee`);
  }
});

test("el color de un logo es el que más se repite entre los que tienen color", () => {
  const px: number[] = [];
  const pon = (n: number, r: number, g: number, b: number, a = 255) => { for (let i = 0; i < n; i++) px.push(r, g, b, a); };
  pon(500, 255, 255, 255); // fondo blanco
  pon(200, 20, 20, 20); // letras negras
  pon(120, 30, 90, 200); // el azul del logo
  pon(30, 220, 40, 40); // un detalle rojo
  pon(400, 0, 0, 0, 0); // transparente
  const c = colorDeImagen(px)!;
  assert.ok(esColorDeMarca(c));
  const n = parseInt(c.slice(1), 16);
  assert.ok((n & 255) > ((n >> 16) & 255), `sale el azul (${c})`);
  assert.equal(colorDeImagen(Array.from({ length: 4000 }, (_, i) => (i % 4 === 3 ? 255 : 240))), undefined, "un logo en blanco y negro no da color");
});
