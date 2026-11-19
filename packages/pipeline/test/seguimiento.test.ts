// Seguimiento a los 3 días y propuesta con «Aceptar» (sistema/80).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANTILLAS_DE_RUBRO, colorDe, colorEnHtml, contraste, esColorDeMarca, paletaDe, pedidoDesdeProspecto, ORDEN_PLANTILLAS, COLOR_RUBRO, nombreCorto, nombreDe, mensajeInicial, anotarFoto, fotoValida, precioDe, precioValido, rutaFoto, agruparHorario, aplicarCambio, anotarPropuesta, contactadoEn, contenidoMuestra, mensajeCobro, mensajeSeguimiento, plantillaDe, resultadosPlantillas, tocaSeguimiento, type Prospecto } from "../src/index.ts";

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
  assert.ok(PLANTILLAS_DE_RUBRO.salud.includes(plantillaDe(p)));
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
  const r = resultadosPlantillas([a, b, c]);
  assert.deepEqual(r.sereno, { enviadas: 1, abiertas: 1, quieren: 1, aceptaron: 1 });
  assert.deepEqual(r.grafico, { enviadas: 1, abiertas: 1, quieren: 0, aceptaron: 0 });
  assert.deepEqual(Object.keys(r).sort(), ["grafico", "mosaico", "noche", "revista", "sereno"]);
});

test("el precio a mano manda en la propuesta y el cobro; fuera de rango no entra (sistema/82)", () => {
  const p = base();
  assert.equal(precioDe(p, 390), 390);
  aplicarCambio(p, { precio: 450 }, "jay");
  assert.equal(precioDe(p, 390), 450);
  assert.ok(p.historial!.some((h) => h.que === "Su propuesta pasó a USD 450"));
  assert.throws(() => aplicarCambio(p, { precio: 39000 }, "jay"), /entre 100 y 5000/);
  assert.ok(!precioValido(199.5) && !precioValido("390") && precioValido(100));
  aplicarCambio(p, { precio: null }, "jay");
  assert.equal(p.precio, undefined);
});

test("las fotos del negocio: solo JPEG de tamaño razonable, y la última de la tanda fija cuántas quedan (sistema/82)", () => {
  const jpg = new Uint8Array(5000); jpg.set([0xff, 0xd8, 0xff]);
  assert.ok(fotoValida(jpg));
  assert.ok(!fotoValida(new Uint8Array(5000)), "sin cabecera de JPEG no entra");
  assert.ok(!fotoValida(new Uint8Array(2_000_000).fill(0xff)), "muy pesada no entra");
  assert.equal(rutaFoto("notaria-vega-3baf66", 2), "_fotos/notaria-vega-3baf66/2.jpg");
  const p = base();
  assert.deepEqual(anotarFoto(p, 1, 3), { avisar: true });
  anotarFoto(p, 2, 3); anotarFoto(p, 3, 3);
  assert.equal(p.fotos, 3);
  assert.deepEqual(anotarFoto(p, 1, 1), { avisar: false });
  assert.equal(p.fotos, 1, "si vuelve a subir una sola, queda una");
  aplicarCambio(p, { quitarFotos: true }, "jay");
  assert.equal(p.fotos, undefined);
});

test("los nombres de Google se acortan para la muestra y los mensajes (sistema/83)", () => {
  const casos: [string, string][] = [
    ["Dr.JUAN CARLOS AVILA CARRERA. Medico, Psicologo Clinico, Master en Psicofarmacologia en Cuenca Ecuador", "Dr. Juan Carlos Avila Carrera"],
    ["SKIN CLINIC • DERMATOLOGÍA, MEDICINA ESTÉTICA AVANZADA Y LÁSER • TIENDA DERMATOLÓGICA•", "Skin Clinic"],
    ["Psicóloga María Agusta Vega | Psicoterapia individual", "Psicóloga María Agusta Vega"],
    ["Dra. Karina Díaz I Kadira I Medicina Estética", "Dra. Karina Díaz"],
    ["ZAHOFER | Ortodoncia en Cuenca", "Zahofer"],
    ["Pediatra Stephany Galindo - Cuenca", "Pediatra Stephany Galindo"],
    ['Cuenca "SMILE Factory" Odontología Integral Especializada', "Smile Factory"],
    ["Neumóloga pediatra Dra. Angela Pesántez Abril", "Dra. Angela Pesántez Abril"],
    ["Clínica de Especialidades ALELI", "Clínica de Especialidades Aleli"],
    ["Fisioterapia EN MOVIMIENTO", "Fisioterapia en Movimiento"],
    ["Dentalcenter Odontología Cuenca", "Dentalcenter Odontología"],
    // Los que ya están bien no se tocan.
    ["Barbería Don Bigote", "Barbería Don Bigote"], ["Dr. Paul Escalante Canto", "Dr. Paul Escalante Canto"], ["SPA Luna", "SPA Luna"], ["Notaría Vega", "Notaría Vega"],
  ];
  for (const [de, a] of casos) assert.equal(nombreCorto(de), a);
  assert.ok(casos.every(([de]) => nombreCorto(de).length <= 48));
  const p = base({ nombre: casos[0]![0] });
  assert.match(mensajeInicial(p, "Jay"), /Vi Dr\. Juan Carlos Avila Carrera en Google Maps/);
  assert.equal(contenidoMuestra(p).nombre, "Dr. Juan Carlos Avila Carrera");
  aplicarCambio(p, { alias: "  Dr. Juan Carlos Ávila " }, "jay");
  assert.equal(nombreDe(p), "Dr. Juan Carlos Ávila", "lo que escribe Jay manda");
  aplicarCambio(p, { alias: "" }, "jay");
  assert.equal(p.alias, undefined);
});

test("se respeta el color del negocio; si no se sabe, va el de su rubro (sistema/85)", () => {
  assert.ok(esColorDeMarca("#C2185B") && !esColorDeMarca("#FFFFFF") && !esColorDeMarca("#111111") && !esColorDeMarca("#808080") && !esColorDeMarca("rojo"));
  assert.equal(colorEnHtml('<meta name="theme-color" content="#c2185b">'), "#C2185B");
  assert.equal(colorEnHtml('<meta name="theme-color" content="#ffffff"><style>a{color:#0a7}b{background:#0a7}i{border-color:#00aa77}u{color:#333}</style>'), "#00AA77", "si el theme-color es blanco, el que más repite su CSS");
  assert.equal(colorEnHtml("<p>sin colores</p>"), undefined);
  const p = base();
  assert.deepEqual(colorDe(p, "salud"), { color: COLOR_RUBRO.salud, origen: "rubro" });
  p.revision = { estado: "ok", https: true, celular: true, titulo: "x", ms: 100, color: "#C2185B" };
  assert.deepEqual(colorDe(p, "salud"), { color: "#C2185B", origen: "web" });
  aplicarCambio(p, { color: "#ff6600" }, "jay");
  assert.deepEqual(colorDe(p, "salud"), { color: "#FF6600", origen: "mano" }, "lo que pone Jay manda");
  assert.throws(() => aplicarCambio(p, { color: "#ffffff" }, "jay"), /no sirve de marca/);
  assert.equal(contenidoMuestra(p).colorOrigen, "mano");
  aplicarCambio(p, { color: null }, "jay");
  assert.equal(colorDe(p, "salud").origen, "web");
});

test("cada plantilla saca de cualquier color una paleta que se lee (sistema/85)", () => {
  for (const color of ["#C2185B", "#FF6600", "#FFD400", "#00AA77", "#1E3FCF", "#6A1B9A", "#8B5A2B", COLOR_RUBRO.salud, COLOR_RUBRO.legal, COLOR_RUBRO.belleza, COLOR_RUBRO.otro]) {
    for (const pl of ORDEN_PLANTILLAS) {
      const k = paletaDe(pl, "salud", color);
      const donde = `${pl} con ${color}`;
      assert.ok(contraste(k.fondo, k.tinta) >= 7, `texto sobre fondo en ${donde}`);
      assert.ok(contraste(k.bloque, k.sobreBloque) >= 4.5, `texto sobre el color de marca en ${donde}: ${contraste(k.bloque, k.sobreBloque).toFixed(1)}`);
      assert.ok(contraste(k.acento, k.sobreAcento) >= 4.5, `texto sobre el botón en ${donde}: ${contraste(k.acento, k.sobreAcento).toFixed(1)}`);
      assert.ok(contraste(k.fondo, k.texto) >= 4.5, `texto secundario en ${donde}`);
    }
  }
  assert.notDeepEqual(paletaDe("grafico", "salud", "#C2185B"), paletaDe("grafico", "salud"), "con su color, la paleta cambia");
  assert.deepEqual(paletaDe("grafico", "salud", COLOR_RUBRO.salud), paletaDe("grafico", "salud"), "con el color del rubro, va la afinada a mano");
});

test("el pedido parte de la muestra que el cliente ya vio (sistema/85)", () => {
  const p = base({ plantilla: "revista", color: "#C2185B", fotos: 2, precio: 450, horario: Array(7).fill("x: 9:00–18:00"), propuesta: { vistas: 1, acepto: "2026-11-03T00:00:00Z" }, mapa: "https://maps.google.com/?cid=1" });
  const t = pedidoDesdeProspecto(p, new Date("2026-11-16T17:00:00Z"), "https://estudio.example");
  for (const parte of ["PARTE DE SU MUESTRA", "Plantilla «Revista»", "titular condensado", "el color de su marca", "Ortodoncia", "Lunes a domingo 9:00 – 18:00", "https://estudio.example/m/clinica-dental-sonrisa-", "/fotos/1 , https://estudio.example/m/", "450 dólares + IVA", "Ya aceptó la propuesta", "Av. Solano 1-23"]) assert.ok(t.includes(parte), `falta «${parte}» en:\n${t}`);
  const sin = pedidoDesdeProspecto(base());
  assert.match(sin, /todavía no sabemos su color/);
  assert.match(sin, /pídele 3/);
  assert.match(sin, /de ejemplo: pídeselo/);
  assert.ok(sin.length < 1900, "cabe en la dirección del pedido");
});

test("a cada rubro le tocan solo las plantillas que le sirven (sistema/86)", () => {
  const cuenta = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const pl = plantillaDe({ id: `lugar-${i}`, rubro: "pediatra" });
    assert.ok(PLANTILLAS_DE_RUBRO.salud.includes(pl), `a un pediatra no le toca «${pl}»`);
    cuenta.add(pl);
    assert.ok(PLANTILLAS_DE_RUBRO.legal.includes(plantillaDe({ id: `lugar-${i}`, rubro: "notaría" })));
    assert.ok(PLANTILLAS_DE_RUBRO.belleza.includes(plantillaDe({ id: `lugar-${i}`, rubro: "barbería" })));
  }
  assert.equal(cuenta.size, 3, "se reparten entre todas las de su rubro");
  assert.equal(plantillaDe({ id: "x", rubro: "pediatra", plantilla: "noche" }), "noche", "lo que elige Jay manda, aunque no sea de su rubro");
});

// sistema/87: el asistente de demostración y las fotos que pone el estudio.
import { PREGUNTAS_DEMO, responderDemo } from "../src/prospectos/asistente-demo.ts";
import { anotarChat as anotarChat87, anotarFoto as anotarFoto87, contenidoMuestra as contenido87 } from "../src/prospectos/muestra.ts";

test("el asistente de la muestra contesta con los datos del negocio y reconoce a quien quiere una cita", () => {
  const p = { id: "x1", nombre: "Clínica Dental Sonríe", rubro: "odontólogo", ciudad: "Cuenca", direccion: "Av. Solano 1-23", telefono: "0991234567", mapa: "https://maps.google.com/?cid=1", estrellas: 4.9, resenas: 120, estado: "nuevo", creado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z", horario: ["lunes: 9:00–18:00", "martes: 9:00–18:00", "miércoles: 9:00–18:00", "jueves: 9:00–18:00", "viernes: 9:00–18:00", "sábado: Cerrado", "domingo: Cerrado"] } as never;
  const c = contenido87(p, new Date("2026-11-18T15:00:00Z"));
  const cita = responderDemo(c, "Hola, quiero una cita para mañana");
  assert.equal(cita.tema, "cita");
  assert.match(cita.aviso ?? "", /Quiere agendar.*quiero una cita para mañana/);
  assert.equal(responderDemo(c, "¿Qué horario tienen?").tema, "horario");
  assert.match(responderDemo(c, "¿Qué horario tienen?").texto, /Lunes a viernes/);
  const lugar = responderDemo(c, "¿Dónde quedan?");
  assert.match(lugar.texto, /Av\. Solano 1-23/);
  assert.equal(lugar.enlace?.url, "https://maps.google.com/?cid=1");
  assert.equal(responderDemo(c, "cuánto cuesta una limpieza").tema, "precio");
  assert.equal(responderDemo(c, "¿Qué servicios tienen?").tema, "servicio");
  // No da diagnósticos: manda a la persona con el profesional.
  const duele = responderDemo(c, "me duele una muela, que me tomo?");
  assert.equal(duele.tema, "consejo");
  assert.match(duele.texto, /no doy diagnósticos/);
  // Lo que no sabe, lo dice y lo pasa al dueño: no inventa.
  assert.equal(responderDemo(c, "aceptan criptomonedas").tema, "otro");
  assert.equal(responderDemo(c, "").tema, "otro");
  for (const q of PREGUNTAS_DEMO) assert.notEqual(responderDemo(c, q).tema, "otro", q);
  const legal = contenido87({ ...(p as object), id: "x2", nombre: "Estudio Jurídico Vega", rubro: "abogado" } as never);
  assert.match(responderDemo(legal, "me despidieron, tengo derecho a algo?").texto, /no doy consejos legales/);
});

test("probar el asistente se anota una vez, y las fotos del estudio no cuentan como señal del negocio", () => {
  const p = { id: "x3", nombre: "Barbería Central", rubro: "barbería", ciudad: "Cuenca", estado: "nuevo", creado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z" } as never as import("../src/prospectos/tipos.ts").Prospecto;
  assert.equal(anotarChat87(p).primera, true);
  assert.equal(anotarChat87(p).primera, false);
  assert.equal(p.historial?.filter((h) => h.que === "Probó el asistente en su muestra").length, 1);
  assert.equal(anotarFoto87(p, 1, 2, new Date(), "jay").avisar, false);
  assert.equal(anotarFoto87(p, 2, 2, new Date(), "jay").avisar, false);
  assert.equal(p.fotos, 2);
  assert.equal(p.fotosEstudio, true);
  assert.equal(p.historial?.filter((h) => h.que === "El estudio le puso fotos a su muestra").length, 1);
  assert.ok(!p.historial?.some((h) => h.que === "Subió fotos a su muestra"));
  // Si después el negocio sube las suyas, ya son suyas.
  anotarFoto87(p, 1, 1);
  assert.equal(p.fotosEstudio, undefined);
  assert.equal(p.fotos, 1);
});

// sistema/89: el embudo y el marcador de la semana.
import { etapaDe, lunesDe, marcadorSemana, metaValida } from "../src/prospectos/embudo.ts";

test("cada negocio cae en su etapa y avanza solo con lo que hace", () => {
  assert.equal(etapaDe({ estado: "nuevo" }), "nuevo");
  assert.equal(etapaDe({ estado: "contactado" }), "escrito");
  assert.equal(etapaDe({ estado: "contactado", muestra: { vistas: 2 } }), "abrio");
  assert.equal(etapaDe({ estado: "respondio", muestra: { vistas: 2 } }), "respondio");
  assert.equal(etapaDe({ estado: "reunion" }), "respondio");
  assert.equal(etapaDe({ estado: "contactado", muestra: { vistas: 1, quiere: "2026-11-18T15:00:00Z" } }), "quiere");
  assert.equal(etapaDe({ estado: "respondio", propuesta: { vistas: 1, acepto: "2026-11-18T15:00:00Z" } as never }), "quiere");
  assert.equal(etapaDe({ estado: "cliente", muestra: { vistas: 1, quiere: "x" } }), "cliente");
  assert.equal(etapaDe({ estado: "descartado" }), undefined);
});

test("el marcador cuenta la semana desde el lunes, en hora de Cuenca, y lleva la racha", () => {
  // Jueves 19 nov 2026, 12:00 en Cuenca.
  const ahora = new Date("2026-11-19T17:00:00Z");
  assert.equal(lunesDe(ahora), "2026-11-16");
  // Domingo 22 a las 23:30 de Cuenca todavía es la semana del 16.
  assert.equal(lunesDe(new Date("2026-11-23T04:30:00Z")), "2026-11-16");
  const p = (id: string, x: object) => ({ id, nombre: id, rubro: "odontólogo", ciudad: "Cuenca", estado: "contactado", creado: "2026-11-01T00:00:00Z", actualizado: "2026-11-01T00:00:00Z", ...x }) as never as Prospecto;
  const escrito = (cuando: string) => [{ cuando, que: "Pasó a «Contactado»" }];
  const lista = [
    p("a", { historial: escrito("2026-11-19T15:00:00Z"), muestra: { vistas: 1, primera: "2026-11-19T16:00:00Z" } }),
    p("b", { historial: escrito("2026-11-18T15:00:00Z") }),
    p("c", { historial: escrito("2026-11-17T15:00:00Z") }),
    // El viernes pasado: no cuenta para esta semana, pero el lunes 16 sin enviar corta la racha antes.
    p("d", { historial: escrito("2026-11-13T15:00:00Z") }),
    p("e", { estado: "cliente", precio: 450, historial: [...escrito("2026-11-10T15:00:00Z"), { cuando: "2026-11-18T20:00:00Z", que: "Pasó a «Respondió»" }, { cuando: "2026-11-19T14:00:00Z", que: "Pasó a «Cliente»" }] }),
  ];
  const m = marcadorSemana(lista, 390, ahora);
  assert.deepEqual({ enviados: m.enviados, abrieron: m.abrieron, respondieron: m.respondieron, clientes: m.clientes, dolares: m.dolares, racha: m.racha }, { enviados: 3, abrieron: 1, respondieron: 1, clientes: 1, dolares: 450, racha: 3 });
  // El fin de semana no corta la racha: viernes y lunes seguidos cuentan 2.
  const finde = [p("f", { historial: escrito("2026-11-13T15:00:00Z") }), p("g", { historial: escrito("2026-11-16T15:00:00Z") })];
  assert.equal(marcadorSemana(finde, 390, new Date("2026-11-16T22:00:00Z")).racha, 2);
  assert.equal(marcadorSemana([], 390, ahora).racha, 0);
  assert.ok(metaValida(50) && !metaValida(2) && !metaValida(500) && !metaValida(12.5) && !metaValida("50"));
});
