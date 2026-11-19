import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { clienteConFicha, contextoCliente, estadoTareas, guardarFicha, puedeHacer, saberDe, textoFaltan, leerFichas, type Ficha, type Prospecto } from "../src/index.ts";

const ficha = (x: Partial<Ficha>): Ficha => ({ id: "x", nombre: "X", proyectos: [], videos: [], kits: [], historia: [], contacto: {}, actualizado: "", ...x });
const prospecto = (x: object) => ({ id: "p1", nombre: "Clínica Dental Sonríe", rubro: "odontólogo", ciudad: "Cuenca", estado: "respondio", creado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z", ...x }) as never as Prospecto;

test("lo que trae Imán entra solo a lo que se sabe, y el color del rubro no cuenta como dato", () => {
  const f = ficha({ nombre: "Clínica Dental Sonríe", prospecto: prospecto({ telefono: "0991234567", direccion: "Av. Solano 1-23", web: "https://www.instagram.com/sonrie.cuenca/", horario: ["lunes: 9:00–18:00", "martes: 9:00–18:00", "miércoles: 9:00–18:00", "jueves: 9:00–18:00", "viernes: 9:00–18:00", "sábado: Cerrado", "domingo: Cerrado"] }) });
  const s = saberDe(f);
  assert.equal(s.rubro?.valor, "odontólogo");
  assert.equal(s.celular?.valor, "0991234567");
  assert.equal(s.instagram?.valor, "@sonrie.cuenca");
  assert.match(s.horario?.valor ?? "", /Lunes a viernes/);
  assert.equal(s.color, undefined, "sin color propio, no hay color");
  // Un fijo no sirve para WhatsApp.
  assert.equal(saberDe(ficha({ prospecto: prospecto({ telefono: "072812345" }) })).celular, undefined);
  // Con el color puesto a mano en su muestra y tres fotos, ya cuentan.
  const con = saberDe(ficha({ prospecto: prospecto({ color: "#0B5D5A", fotos: 3 }) }));
  assert.equal(con.color?.valor, "#0B5D5A");
  assert.match(con.fotos?.valor ?? "", /3 fotos/);
  assert.equal(saberDe(ficha({ prospecto: prospecto({ fotos: 2 }) })).fotos, undefined, "dos fotos no alcanzan");
});

test("cada tarea pide lo suyo: con solo un color no se puede hacer nada", () => {
  const soloColor = saberDe(ficha({ nombre: "", kits: [{ id: "k", nombre: "X", color: "#112233", actualizado: "" }] }));
  assert.deepEqual(Object.keys(soloColor), ["color"]);
  assert.ok(estadoTareas(soloColor).every((t) => !t.listo), "ninguna tarea sale con solo el color");
  // Con lo de Google Maps alcanza para la muestra y el mensaje, no para el guion ni la web.
  const s = saberDe(ficha({ nombre: "Clínica Dental Sonríe", prospecto: prospecto({ telefono: "0991234567" }) }));
  assert.ok(puedeHacer(s, "muestra").listo && puedeHacer(s, "mensaje").listo);
  const guion = puedeHacer(s, "guion");
  assert.equal(guion.listo, false);
  assert.deepEqual(guion.faltan, ["oferta", "publico", "canales"]);
  assert.match(textoFaltan(guion.faltan), /qué quiere vender \(preguntarle al cliente\); a quién le habla \(preguntarle al cliente\); dónde publica \(su Instagram o preguntarle al cliente\)/);
  assert.ok(puedeHacer(s, "web").faltan.includes("servicios") && puedeHacer(s, "web").faltan.includes("fotos"));
  // El mes de contenido pide más que un guion.
  assert.ok(puedeHacer(s, "contenido").faltan.length > guion.faltan.length);
});

test("lo escrito a mano se guarda por campo, manda sobre lo de Imán y llega al agente como texto", async () => {
  await guardarFicha("clinica-dental-sonrie", { nombre: "Clínica Dental Sonríe", saber: { oferta: "Ortodoncia invisible", publico: "Adultos de 25 a 45\nque no quieren brackets", canales: "Instagram", rubro: "Clínica de ortodoncia", inventado: "no entra" } }, "jay");
  // Otro guardado con un solo campo no borra los demás; uno vacío sí borra el suyo.
  await guardarFicha("clinica-dental-sonrie", { nombre: "Clínica Dental Sonríe", saber: { tono: "Cercano y sin tecnicismos", canales: "" } }, "luna");
  const g = (await leerFichas()).fichas["clinica-dental-sonrie"];
  assert.deepEqual(Object.keys(g.saber ?? {}).sort(), ["oferta", "publico", "rubro", "tono"]);
  const f = ficha({ id: g.id, nombre: g.nombre, guardada: g, prospecto: prospecto({ telefono: "0991234567" }) });
  const s = saberDe(f);
  assert.equal(s.rubro?.valor, "Clínica de ortodoncia");
  assert.equal(s.rubro?.origen, "mano");
  assert.deepEqual(puedeHacer(s, "guion").faltan, ["canales"]);
  const texto = contextoCliente(s, ["nombre", "rubro", "oferta", "publico", "canales", "tono"]);
  assert.equal(texto, "- Nombre: Clínica Dental Sonríe\n- A qué se dedica: Clínica de ortodoncia\n- Qué quiere vender: Ortodoncia invisible\n- A quién le habla: Adultos de 25 a 45; que no quieren brackets\n- Cómo habla la marca: Cercano y sin tecnicismos");
  // Un nombre suelto en un video no es un cliente con ficha: a ese no se le exigen mínimos.
  assert.equal(clienteConFicha(ficha({})), false);
  assert.equal(clienteConFicha(f), true);
});
