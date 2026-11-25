import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiarPieza, fechasDelMes, leerMesIA, mesDeTexto, mesPorDefecto, nombreMes, resumenMes, textoMesParaCliente, vecesPorSemana, type MesContenido } from "../src/index.ts";

test("cada cuánto publica sale de lo que dice la ficha", () => {
  assert.equal(vecesPorSemana("3 veces por semana"), 3);
  assert.equal(vecesPorSemana("dos a la semana"), 2);
  assert.equal(vecesPorSemana("Todos los días"), 7);
  assert.equal(vecesPorSemana("8 veces al mes"), 2);
  assert.equal(vecesPorSemana(""), 3, "sin dato, tres por semana");
  assert.equal(vecesPorSemana("20 por semana"), 7, "nunca más de una por día");
});

test("las fechas las pone el sistema, repartidas en la semana", () => {
  const f = fechasDelMes("2026-12", "3 veces por semana");
  assert.equal(f.length, 13, "diciembre 2026: lunes, miércoles y viernes");
  assert.equal(f[0], "2026-12-02");
  assert.ok(f.every((x) => [1, 3, 5].includes(new Date(`${x}T12:00:00Z`).getUTCDay())));
  assert.equal(fechasDelMes("2027-02", "una vez por semana").length, 4);
});

test("el mes que se planifica: el siguiente, o el que se nombra", () => {
  assert.equal(mesPorDefecto(new Date("2026-11-20T15:00:00Z")), "2026-12");
  assert.equal(mesPorDefecto(new Date("2026-12-31T20:00:00Z")), "2027-01");
  assert.equal(mesDeTexto("arma diciembre", new Date("2026-11-20T15:00:00Z")), "2026-12");
  assert.equal(mesDeTexto("el de enero", new Date("2026-11-20T15:00:00Z")), "2027-01", "enero ya pasó este año: es el próximo");
  assert.equal(mesDeTexto("sin mes", new Date()), undefined);
  assert.equal(nombreMes("2026-12"), "diciembre 2026");
});

test("lo que devuelve Faro se limpia, va una pieza por fecha y si falta mucho no sirve", () => {
  const fechas = ["2026-12-02", "2026-12-04", "2026-12-07"];
  const r = leerMesIA({ series: [{ nombre: "Antes y después", para: "x" }], piezas: [{ n: 2, serie: "Antes y después", formato: "reel", idea: "b", texto: "tb", visual: "v" }, { n: 1, serie: "", formato: "raro", idea: "a", texto: "ta", visual: "v" }, { n: 3, serie: "Antes y después", formato: "post", idea: "c", texto: "tc", visual: "" }, { n: 9, idea: "fuera", texto: "x" }] }, fechas);
  assert.deepEqual(r.piezas.map((p) => [p.fecha, p.formato, p.serie]), [["2026-12-02", "post", "Antes y después"], ["2026-12-04", "reel", "Antes y después"], ["2026-12-07", "post", "Antes y después"]]);
  assert.throws(() => leerMesIA({ series: [{ nombre: "S" }], piezas: [{ n: 1, idea: "a", texto: "t" }] }, fechas), /no devolvió el mes completo/);
});

const mes = (): MesContenido => ({ id: "c-anonymo-2026-12", cliente: "anonymo", nombre: "Unmake", mes: "2026-12", canales: "Instagram", frecuencia: "3", series: [{ nombre: "S", para: "" }], historia: [], creado: "", actualizado: "",
  piezas: [{ id: "p01", fecha: "2026-12-02", serie: "S", formato: "reel", idea: "Idea uno", texto: "Texto uno", visual: "v", estado: "propuesta" }, { id: "p02", fecha: "2026-12-04", serie: "S", formato: "post", idea: "Idea dos", texto: "Texto dos", visual: "v", estado: "propuesta" }] });

test("aprobar, pedir un cambio y corregir a mano, con su historia", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  mkdirSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista"), { recursive: true });
  writeFileSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista", "meses.json"), JSON.stringify({ actualizado: "", meses: { [mes().id]: mes() } }));
  await assert.rejects(cambiarPieza("c-anonymo-2026-12", "p01", { estado: "cambio" }, "jay"), /Cuenta qué hay que cambiar/);
  let m = await cambiarPieza("c-anonymo-2026-12", "p01", { estado: "cambio", nota: "Más corto" }, "luna");
  assert.deepEqual([m.piezas[0]!.estado, m.piezas[0]!.nota], ["cambio", "Más corto"]);
  m = await cambiarPieza("c-anonymo-2026-12", "p01", { texto: "Texto corto" }, "jay");
  assert.equal(m.piezas[0]!.estado, "propuesta", "corregida a mano, vuelve a estar por revisar");
  await assert.rejects(cambiarPieza("c-anonymo-2026-12", "p01", { texto: "  " }, "jay"), /No puede quedar vacía/);
  m = await cambiarPieza("c-anonymo-2026-12", "p01", { estado: "aprobada" }, "jay");
  assert.deepEqual(resumenMes(m), { total: 2, aprobadas: 1, cambios: 0, porRevisar: 1 });
  assert.equal(m.historia.length, 3);
  const t = textoMesParaCliente(m);
  assert.match(t, /miércoles 2 · Reel · S\nIdea uno\n«Texto corto»/);
  assert.ok(!t.includes("Idea dos"), "solo van las aprobadas");
});

// — sistema/107: Faro como los planificadores de @jaywrkr y Coresolutions —
import { estiloPara, historiasHTML, laminasHTML, leerCalendarioIA, leerLamina, ESTILOS } from "../src/index.ts";

test("el calendario de Faro se limpia: plantilla fija por serie, reels con portada, hora válida y opciones A y B", () => {
  const fechas = ["2026-12-02", "2026-12-04", "2026-12-07", "2026-12-09"];
  const r = leerCalendarioIA({ series: [{ nombre: "Checklist", para: "x", plantilla: "lista" }, { nombre: "Frases", para: "y", plantilla: "inventada" }], fechas: [
    { n: 1, serie: "Checklist", formato: "post", hora: "8:30", ideaA: "a", ideaB: "b" },
    { n: 2, serie: "Frases", formato: "reel", hora: "25:00", ideaA: "c", ideaB: "d" },
    { n: 3, serie: "Checklist", formato: "carrusel", hora: "18:00", ideaA: "e", ideaB: "" },
    { n: 3, serie: "Checklist", formato: "carrusel", hora: "18:00", ideaA: "repetida", ideaB: "" },
    { n: 4, serie: "Frases", formato: "post", hora: "19:00", ideaA: "f", ideaB: "g" },
  ] }, fechas);
  assert.equal(r.series[1]!.plantilla, "frase", "una plantilla que no existe pasa a «frase»");
  assert.deepEqual(r.filas.map((f) => [f.formato, f.plantilla, f.hora]), [["carrusel", "lista", "08:30"], ["reel", "portada", "18:00"], ["carrusel", "lista", "18:00"], ["post", "frase", "19:00"]], "una lista no puede ser post: pasa a carrusel; la hora inválida queda en 18:00");
  assert.equal(r.filas[2]!.ideaA, "e", "una fecha repetida no pisa a la primera");
  assert.throws(() => leerCalendarioIA({ series: [{ nombre: "S", plantilla: "frase" }], fechas: [{ n: 1, ideaA: "a" }] }, fechas), /no devolvió el mes completo/);
});

test("lo que va en el arte se limpia: sin emojis, con límites y sin título no hay arte", () => {
  const l = leerLamina({ titulo: "Decisión. 🚀", tachado: "Excusa", items: [{ t: "uno ✨", d: "por qué" }, { t: "" }, ...Array.from({ length: 9 }, (_, i) => ({ t: `p${i}` }))], numero: "1234567890123456789" });
  assert.equal(l?.titulo, "Decisión.");
  assert.equal(l?.items?.length, 7, "hasta 7 puntos, sin vacíos");
  assert.equal(l?.items?.[0]?.t, "uno");
  assert.equal(l?.numero?.length, 16);
  assert.equal(leerLamina({ bajada: "sin título" }), undefined);
});

test("cada marca tiene su estilo, y una lista se dibuja como portada, un punto por lámina y cierre", () => {
  assert.equal(estiloPara("unmake").id, "unmake");
  assert.equal(estiloPara("coresolutions", "Coresolutions").id, "coresolutions");
  assert.equal(estiloPara("jay", "@jaywrkr").id, "jaywrkr");
  const otro = estiloPara("cafe-lento", "Café Lento", "Naranja quemado #C4511E");
  assert.equal(otro.acentos[0], "#C4511E", "los demás clientes usan el color de su ficha");
  const pieza = { id: "p01", formato: "carrusel" as const, plantilla: "lista" as const, serie: "Checklist", nSerie: 1, lamina: { titulo: "5 preguntas antes de renovar", items: [{ t: "Uno" }, { t: "Dos" }, { t: "Tres" }], cierre: "Guárdalo." }, historias: [{ texto: "Compártelo" }, { texto: "¿Cuándo vence?", sticker: "encuesta" as const, opciones: ["Este año", "En 2027"] }] };
  const ls = laminasHTML(ESTILOS.coresolutions!, pieza);
  assert.deepEqual(ls.map((a) => a.nombre), ["p01-01", "p01-02", "p01-03", "p01-04", "p01-05"]);
  assert.ok(ls.every((a) => a.ancho === 1080 && a.alto === 1350));
  assert.match(ls[0]!.html, /CORESOLUTIONS/);
  assert.match(ls[0]!.html, /01 \/ 05/);
  const hs = historiasHTML(ESTILOS.coresolutions!, pieza, "data:image/jpeg;base64,AAAA");
  assert.deepEqual(hs.map((a) => [a.nombre, a.alto]), [["p01-historia-1", 1920], ["p01-historia-sticker", 1920]]);
  assert.match(hs[1]!.html, /sticker de encuesta/);
  const reel = laminasHTML(ESTILOS.jaywrkr!, { ...pieza, formato: "reel", plantilla: "portada" });
  assert.deepEqual(reel.map((a) => [a.nombre, a.alto]), [["p01-portada", 1920]]);
  assert.ok(!laminasHTML(ESTILOS.unmake!, { ...pieza, lamina: { titulo: "<script>x</script>" } })[0]!.html.includes("<script>x"), "lo escrito no puede meter código");
});

test("elegir la opción B la intercambia con la A y vuelve a estar por revisar", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const m0 = mes();
  m0.id = "c-anonymo-2027-01";
  m0.piezas[0] = { ...m0.piezas[0]!, estado: "aprobada", lamina: { titulo: "A" }, artes: ["p01-01.jpg"], b: { idea: "Idea B", texto: "Texto B", visual: "v", lamina: { titulo: "B" } } };
  mkdirSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista"), { recursive: true });
  writeFileSync(join(process.env.ANONYMO_PROYECTOS!, "_contenido", "lista", "meses.json"), JSON.stringify({ actualizado: "", meses: { [m0.id]: m0 } }));
  const m = await cambiarPieza(m0.id, "p01", { elegirB: true }, "luna");
  const p = m.piezas[0]!;
  assert.deepEqual([p.idea, p.texto, p.lamina?.titulo, p.artes, p.estado], ["Idea B", "Texto B", "B", undefined, "propuesta"]);
  assert.deepEqual([p.b?.idea, p.b?.lamina?.titulo, p.b?.artes], ["Idea uno", "A", ["p01-01.jpg"]], "la A queda guardada, con su arte");
  await assert.rejects(cambiarPieza(m0.id, "p02", { elegirB: true }, "luna"), /no tiene opción B/);
  const t = await cambiarPieza(m0.id, "p01", { tituloArte: "Otro título" }, "jay");
  assert.equal(t.piezas[0]!.lamina?.titulo, "Otro título");
});

test("la revisión automática marca lo que los planificadores nunca dejaban pasar", async () => {
  const { revisarPieza } = await import("../src/index.ts");
  const bien = { texto: "Una palabra cambia el plan.\n¿Cuál tachas hoy?", formato: "post" as const, plantilla: "tachado" as const, lamina: { tachado: "Excusa", titulo: "Decisión." }, historias: [{ texto: "Compártelo" }, { texto: "¿Cuál?", sticker: "pregunta" as const }] };
  assert.deepEqual(revisarPieza(bien), []);
  assert.deepEqual(revisarPieza({ ...bien, texto: "Guárdalo para tu próxima renovación." }), [], "una acción al final también vale");
  const mal = revisarPieza({ ...bien, texto: "Un texto sin cierre.", historias: [{ texto: "una" }], lamina: { titulo: "Decisión." } });
  assert.equal(mal.length, 3);
  assert.match(revisarPieza({ ...bien, plantilla: "dato", lamina: { titulo: "x", numero: "87%" } }, "Atendemos a 120 empresas").join(), /87%.*no está en lo que sabemos/);
  assert.deepEqual(revisarPieza({ ...bien, plantilla: "dato", lamina: { titulo: "x", numero: "120" } }, "Atendemos a 120 empresas"), []);
  assert.match(revisarPieza({ ...bien, texto: "Una web desde USD 390.\n¿Te interesa?" }, "", "Sin precios.").join(), /precio/);
  assert.match(revisarPieza({ ...bien, formato: "reel", plantilla: "portada", lamina: { titulo: "x" } }).join(), /YouTube/);
});

test("el arte se lee aunque la IA lo mande como texto JSON o solo un título (sistema/112)", () => {
  assert.equal(leerLamina(JSON.stringify({ titulo: "Tu web vende mientras duermes" }))?.titulo, "Tu web vende mientras duermes");
  assert.equal(leerLamina("Solo el título")?.titulo, "Solo el título");
  assert.equal(leerLamina(""), undefined);
});
