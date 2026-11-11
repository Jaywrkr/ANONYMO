import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { calcularCortes, tramosConservados, aEditado, aOriginal, planEdicion, partesDesdeSilencios, edicionSegura, textoHuella, zoomDeTramos, duracionFinal } = await import("../src/video/edicion.ts");
const { filtrosRender, leerMedida, leerSilencios, umbralSilencio, medirVideo, renderizar, rutaFfmpeg, detectarSilencios, volumenMedio, hojaDeCuadros } = await import("../src/video/ffmpeg.ts");
const { EDICION_INICIAL } = await import("../src/video/tipos.ts");

const ed = (x: Partial<typeof EDICION_INICIAL> = {}) => ({ ...structuredClone(EDICION_INICIAL), ...x });
// Tres partes con voz: silencio al inicio, una pausa larga en medio, una corta y silencio al final.
const an = { umbralDb: -38, partes: [{ inicio: 1.0, fin: 2.2 }, { inicio: 4.0, fin: 4.9 }, { inicio: 5.2, fin: 5.6 }] };

test("las partes salen de los silencios: sin golpes sueltos y uniendo lo que queda pegado", () => {
  const p = partesDesdeSilencios([{ inicio: 0, fin: 1 }, { inicio: 2.2, fin: 2.25 }, { inicio: 2.3, fin: 4 }, { inicio: 4.05, fin: 4.12 }, { inicio: 6, fin: Infinity }], 7);
  // 2,2–2,25 y 4,05–4,12 son silencios tan cortos que lo de los lados queda como una sola parte.
  assert.deepEqual(p, [{ inicio: 1, fin: 2.3 }, { inicio: 4, fin: 6 }]);
  // Un golpe suelto entre silencios largos se descarta.
  assert.deepEqual(partesDesdeSilencios([{ inicio: 0, fin: 1 }, { inicio: 1.05, fin: 3 }], 4), [{ inicio: 3, fin: 4 }]);
  assert.deepEqual(partesDesdeSilencios([], 3), [{ inicio: 0, fin: 3 }]);
});

test("lee los silencios que escribe FFmpeg, también el que llega hasta el final", () => {
  const s = leerSilencios("[silencedetect @ 0x1] silence_start: 0\n[silencedetect @ 0x1] silence_end: 0.900023 | silence_duration: 0.9\nframe\n[silencedetect @ 0x1] silence_start: 7.9\n");
  assert.deepEqual(s, [{ inicio: 0, fin: 0.900023 }, { inicio: 7.9, fin: Infinity }]);
  assert.equal(umbralSilencio(-20), -32);
  assert.equal(umbralSilencio(-80), -50);
  assert.equal(umbralSilencio(-5), -26);
});

test("corta el silencio del inicio, la pausa larga y el final; deja la pausa corta", () => {
  const c = calcularCortes(an, ed(), 7);
  assert.deepEqual(c.map((x) => x.motivo), ["inicio", "silencio", "final"]);
  assert.deepEqual([c[1].inicio, c[1].fin], [2.32, 3.88]);
  assert.ok(c[2].inicio > 5.6 && c[2].fin === 7);
  assert.equal(tramosConservados(c, 7).length, 2);
});

test("quitar una parte la corta entera; sin quitar silencios no se corta nada; si se quita todo, nada", () => {
  assert.deepEqual(calcularCortes(an, ed({ silencios: false }), 7), []);
  const c = calcularCortes(an, ed({ silencios: false, quitadas: [1] }), 7);
  assert.equal(c.length, 1);
  assert.equal(c[0].motivo, "parte");
  assert.ok(c[0].inicio >= 2.2 && c[0].inicio < 4 && c[0].fin > 4.9 && c[0].fin <= 5.2);
  assert.equal(calcularCortes(an, ed({ quitadas: [0] }), 7)[0].motivo, "parte");
  assert.deepEqual(calcularCortes(an, ed({ quitadas: [0, 1, 2] }), 7), []);
});

test("los tiempos van y vuelven entre el original y el video cortado", () => {
  const tramos = tramosConservados(calcularCortes(an, ed(), 7), 7);
  for (const t of [1.0, 2.0, 4.1, 5.5]) assert.ok(Math.abs(aOriginal(aEditado(t, tramos), tramos) - t) < 1e-9, String(t));
  assert.equal(aEditado(3, tramos), aEditado(2.32, tramos));
  const p = planEdicion(an, ed(), 7);
  assert.ok(p.duracion > 2 && p.duracion < 4);
  assert.equal(p.resumen.cortes, 3);
});

test("la edición que llega del navegador o de Atlas se limpia", () => {
  const e = edicionSegura({ pausaMax: 99, quitadas: [3, 3, -1, 1.5, 2], audio: { normalizar: "sí" } }, EDICION_INICIAL);
  assert.equal(e.pausaMax, 3);
  assert.deepEqual(e.quitadas, [2, 3]);
  assert.equal(e.audio.normalizar, true);
  assert.deepEqual(Object.keys(e), ["silencios", "pausaMax", "quitadas", "audio", "motion", "marca"]);
  // La huella no depende del orden en que llegan los campos, y cambia si cambia la marca o su kit.
  const h = (x: object) => textoHuella({ edicion: e, analisis: an, duracion: 7, ...x }, "9:16");
  assert.equal(textoHuella({ edicion: { marca: e.marca, motion: e.motion, audio: e.audio, quitadas: e.quitadas, pausaMax: 3, silencios: true }, analisis: an, duracion: 7 }, "9:16"), h({}));
  assert.notEqual(h({ marca: "m-silva-1a2b" }), h({}));
  assert.notEqual(h({ marca: "m-silva-1a2b", kit: "2026-11-10" }), h({ marca: "m-silva-1a2b" }));
});

test("un video de antes de la fase 3 sale con motion y marca apagados", () => {
  const vieja = { silencios: true, pausaMax: 0.6, quitadas: [1], audio: { normalizar: true, limpiarRuido: false } } as unknown as typeof EDICION_INICIAL;
  const e = edicionSegura(vieja, vieja);
  assert.deepEqual(e.motion, EDICION_INICIAL.motion);
  assert.deepEqual(e.marca, EDICION_INICIAL.marca);
  assert.deepEqual(e.quitadas, [1]);
  const m = edicionSegura({ motion: { transicion: "girar", zoomPartes: [2, -1] }, marca: { cierreSegundos: 30, volumenMusica: 2 } }, e);
  assert.equal(m.motion.transicion, "corte");
  assert.deepEqual(m.motion.zoomPartes, [2]);
  assert.equal(m.marca.cierreSegundos, 5);
  assert.equal(m.marca.volumenMusica, 0.5);
});

test("zoom alterno y por partes, y la duración final con fundidos y cierre", () => {
  const tramos = [{ inicio: 0.9, fin: 2.3 }, { inicio: 3.9, fin: 4.9 }, { inicio: 5.1, fin: 6.0 }];
  assert.deepEqual(zoomDeTramos(tramos, an, ed({ motion: { zoomAlterno: true, zoomPartes: [], transicion: "corte" } })), [false, true, false]);
  assert.deepEqual(zoomDeTramos(tramos, an, ed({ motion: { zoomAlterno: false, zoomPartes: [0, 2], transicion: "corte" } })), [true, false, true]);
  const conTodo = ed({ motion: { zoomAlterno: false, zoomPartes: [], transicion: "fundido" }, marca: { ...EDICION_INICIAL.marca, cierre: true, cierreSegundos: 2 } });
  // 3,3 s de tramos − 2 fundidos de 0,25 s + 2 s de cierre.
  assert.equal(duracionFinal(tramos, conTodo, true), 4.8);
  assert.equal(duracionFinal(tramos, conTodo, false), 2.8);
});

test("lee la medida de un video girado de celular", () => {
  const m = leerMedida("Duration: 00:00:12.48, start\n  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps\n    side data:\n      displaymatrix: rotation of -90.00 degrees\n  Stream #0:1: Audio: aac");
  assert.deepEqual([m.duracion, m.ancho, m.alto, m.audio], [12.48, 1080, 1920, true]);
  assert.throws(() => leerMedida("basura"), /No parece un video/);
});

test("los filtros cortan cada tramo con fundido, llevan al formato y normalizan el volumen", () => {
  const f = filtrosRender([{ inicio: 0, fin: 1 }, { inicio: 2, fin: 3.5 }], "1:1", EDICION_INICIAL, { audio: true }).filtros;
  assert.match(f, /concat=n=2:v=1:a=1/);
  assert.match(f, /crop=1080:1080/);
  assert.match(f, /afade=t=out:st=1\.488/);
  assert.match(f, /loudnorm=I=-14/);
  assert.doesNotMatch(f, /ass=/);
});

test("los filtros de motion y marca: zoom, fundido, logo, cierre y música que baja con la voz", () => {
  const conTodo = ed({ motion: { zoomAlterno: true, zoomPartes: [], transicion: "fundido" }, marca: { logoEsquina: true, cierre: true, cierreSegundos: 2, musica: true, volumenMusica: 0.2 } });
  const r = filtrosRender([{ inicio: 0, fin: 1 }, { inicio: 2, fin: 3.5 }], "9:16", conTodo, { audio: true, zooms: [false, true], marca: { logo: "/l.png", musica: "/m.mp3", color: "#1d3557", texto: "#ffffff", nombre: "Silva" } });
  assert.match(r.filtros, /crop=1080:1920,scale=1274:2266:flags=lanczos,crop=1080:1920/);
  assert.match(r.filtros, /xfade=transition=fade:duration=0\.250:offset=0\.750/);
  assert.match(r.filtros, /acrossfade=d=0\.250/);
  assert.match(r.filtros, /\[1:v\]format=rgba,split=2\[le0\]\[lc0\]/);
  assert.match(r.filtros, /overlay=W-w-54:115/);
  assert.match(r.filtros, /color=c=0x1d3557:s=1080x1920:r=30:d=2/);
  assert.match(r.filtros, /\[2:a\].*volume=0\.2/);
  assert.match(r.filtros, /sidechaincompress/);
  assert.equal(r.total, 4.25);
  // Sin logo en el kit: el cierre lleva el nombre (libass) y no hay entrada de logo.
  const sinLogo = filtrosRender([{ inicio: 0, fin: 1 }], "1:1", conTodo, { audio: true, marca: { color: "#ffffff", texto: "#000000", nombre: "Silva" }, textoCierre: "/c.ass" });
  assert.doesNotMatch(sinLogo.filtros, /\[1:v\]|sidechain/);
  assert.match(sinLogo.filtros, /\[fondo\]ass=\/c\.ass/);
  // Sin marca: nada de cierre ni música aunque la edición lo pida.
  const sinMarca = filtrosRender([{ inicio: 0, fin: 1 }], "16:9", conTodo, { audio: true });
  assert.doesNotMatch(sinMarca.filtros, /color=c=|sidechain|overlay/);
  assert.equal(sinMarca.total, 1);
});

test("escucha un video de verdad, saca la hoja de miniaturas y lo arma en vertical", { skip: !(await hayFfmpeg()) && "sin FFmpeg" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "video-prueba-"));
  const entrada = join(dir, "entrada.mp4");
  // Voz (un tono) de 0,9 a 2,9 s y de 4,6 a 7,9 s; casi silencio en el resto.
  execFileSync(await rutaFfmpeg(), ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=9", "-f", "lavfi", "-i", "aevalsrc='if(between(t,0.9,2.9)+between(t,4.6,7.9),0.4*sin(2*PI*330*t),0.003*sin(2*PI*50*t))':s=44100:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", entrada]);
  const m = await medirVideo(entrada);
  const umbral = umbralSilencio(await volumenMedio(entrada));
  const partes = partesDesdeSilencios(await detectarSilencios(entrada, umbral), m.duracion);
  assert.equal(partes.length, 2, JSON.stringify(partes));
  assert.ok(Math.abs(partes[0].inicio - 0.9) < 0.1 && Math.abs(partes[1].fin - 7.9) < 0.1, JSON.stringify(partes));
  const hoja = await hojaDeCuadros(entrada, partes, dir, join(dir, "cuadros.jpg"), { ancho: m.ancho, alto: m.alto });
  assert.equal(hoja.total, 2);
  assert.ok(existsSync(join(dir, "cuadros.jpg")) && statSync(join(dir, "cuadros.jpg")).size > 1000);
  const p = planEdicion({ partes, umbralDb: umbral }, ed(), m.duracion);
  const salida = join(dir, "final.mp4");
  let visto = 0;
  await renderizar({ entrada, salida, tramos: p.tramos, formato: "9:16", edicion: EDICION_INICIAL, audio: true, carpeta: dir, vista: true, alAvanzar: (s) => { visto = Math.max(visto, s); } });
  const r = await medirVideo(salida);
  assert.equal(`${r.ancho}x${r.alto}`, "1080x1920");
  assert.ok(Math.abs(r.duracion - p.duracion) < 0.25, `${r.duracion} vs ${p.duracion}`);
  assert.ok(visto > 0, "avisa el avance");
  // Fase 3: el mismo video con zoom alterno, fundido, logo, cierre y música de la marca.
  const logo = join(dir, "logo.png"), musica = join(dir, "musica.mp3");
  execFileSync(await rutaFfmpeg(), ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0xff5a1f:s=200x100", "-frames:v", "1", logo]);
  execFileSync(await rutaFfmpeg(), ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=220:d=3", "-c:a", "libmp3lame", musica]);
  const conTodo = ed({ motion: { zoomAlterno: true, zoomPartes: [], transicion: "fundido" }, marca: { logoEsquina: true, cierre: true, cierreSegundos: 2, musica: true, volumenMusica: 0.2 } });
  const p2 = planEdicion({ partes, umbralDb: umbral }, conTodo, m.duracion);
  const salida2 = join(dir, "final-marca.mp4");
  const esperado = await renderizar({ entrada, salida: salida2, tramos: p2.tramos, formato: "1:1", edicion: conTodo, audio: true, carpeta: dir, vista: true, zooms: zoomDeTramos(p2.tramos, { partes, umbralDb: umbral }, conTodo), marca: { logo, musica, color: "#1d3557", texto: "#ffffff", nombre: "Silva" } });
  const r2 = await medirVideo(salida2);
  assert.equal(`${r2.ancho}x${r2.alto}`, "1080x1080");
  assert.ok(Math.abs(r2.duracion - esperado) < 0.15 && Math.abs(esperado - duracionFinal(p2.tramos, conTodo, true)) < 0.01, `${r2.duracion} vs ${esperado}`);
});

async function hayFfmpeg() {
  try { execFileSync(await rutaFfmpeg(), ["-hide_banner", "-version"], { stdio: "ignore" }); return true; } catch { return false; }
}

// ——— Atlas (sistema/63, por partes desde sistema/64) ———
const { aplicarAcciones, interpretarPedidoVideo, leerRespuestaAtlas, mensajeAtlasVideo } = await import("../src/video/atlas-video.ts");

test("Atlas: las acciones cambian la edición sin IA y dicen qué cambió", () => {
  const base = ed();
  const r = aplicarAcciones(base, [
    { tipo: "silencios", activo: true, pausaMax: 0.4 },
    { tipo: "quitar", unidad: "parte", desde: 1, hasta: 1 },
    { tipo: "quitar", unidad: "segundo", desde: 5, hasta: 6 },
    { tipo: "audio", limpiarRuido: true },
    { tipo: "armar", formatos: ["9:16", "1:1", "4:3" as never] },
  ], an);
  assert.equal(r.edicion.pausaMax, 0.4);
  assert.deepEqual(r.edicion.quitadas, [0, 2]);
  assert.equal(r.edicion.audio.limpiarRuido, true);
  assert.deepEqual(r.armar, ["9:16", "1:1"]);
  assert.deepEqual(r.cambios, ["Quitar pausas de más de 0,4 s", "Quitar la parte 1", "Quitar la parte 3", "Limpiar ruido de fondo"]);
  assert.deepEqual(base.quitadas, []);
  const d = aplicarAcciones(r.edicion, [{ tipo: "devolver", unidad: "parte", desde: 1, hasta: 3 }], an);
  assert.deepEqual(d.edicion.quitadas, []);
  assert.deepEqual(d.cambios, ["Devolver las partes 1 y 3"]);
});

test("Atlas: lo que no tiene sentido se ignora y no cuenta como cambio", () => {
  const r = aplicarAcciones(ed(), [{ tipo: "quitar", unidad: "parte", desde: 50, hasta: 90 }, { tipo: "silencios", activo: true }, { tipo: "nada" as never }, null as never], an);
  assert.deepEqual(r.edicion.quitadas, []);
  assert.deepEqual(r.cambios, []);
  const leida = leerRespuestaAtlas({ respuesta: "", acciones: "x", noSePuede: ["zoom", 3] });
  assert.equal(leida.respuesta, "Listo.");
  assert.deepEqual(leida.acciones, []);
  assert.deepEqual(leida.noSePuede, ["zoom"]);
});

test("Atlas: zoom, transición y marca; sin kit no pone logo ni música", () => {
  const kit = { nombre: "Clínica Silva", logo: true, musica: "Tema Silva" };
  const r = aplicarAcciones(ed(), [
    { tipo: "zoom", modo: "alterno" },
    { tipo: "zoom", modo: "partes", desde: 2, hasta: 3 },
    { tipo: "transicion", estilo: "fundido" },
    { tipo: "marca", logoEsquina: true, cierre: true, cierreSegundos: 3, musica: true },
  ], an, kit);
  assert.equal(r.edicion.motion.zoomAlterno, true);
  assert.deepEqual(r.edicion.motion.zoomPartes, [1, 2]);
  assert.equal(r.edicion.motion.transicion, "fundido");
  assert.deepEqual([r.edicion.marca.logoEsquina, r.edicion.marca.cierre, r.edicion.marca.cierreSegundos, r.edicion.marca.musica], [true, true, 3, true]);
  assert.deepEqual(r.cambios, ["Zoom en cada corte", "Zoom en las partes 2 y 3", "Fundido corto entre partes", "Marca: logo en la esquina, cierre de 3 s con el logo, música «Tema Silva»"]);
  const quitar = aplicarAcciones(r.edicion, [{ tipo: "zoom", modo: "quitar", desde: 2, hasta: 2 }, { tipo: "marca", volumenMusica: 0.35 }], an, kit);
  assert.deepEqual(quitar.edicion.motion.zoomPartes, [2]);
  assert.equal(quitar.edicion.motion.zoomAlterno, true);
  assert.deepEqual(quitar.cambios, ["Sin zoom en la parte 2", "Marca: música más alta"]);
  assert.deepEqual(aplicarAcciones(r.edicion, [{ tipo: "zoom", modo: "quitar" }], an, kit).edicion.motion, { zoomAlterno: false, zoomPartes: [], transicion: "fundido" });
  // Sin kit no hay marca; con un kit sin logo ni música, el cierre sí (con el nombre), el logo y la música no.
  assert.deepEqual(aplicarAcciones(ed(), [{ tipo: "marca", logoEsquina: true, musica: true }], an).cambios, []);
  const pobre = aplicarAcciones(ed(), [{ tipo: "marca", logoEsquina: true, cierre: true, musica: true }], an, { nombre: "Silva", logo: false });
  assert.deepEqual(pobre.cambios, ["Marca: cierre de 2 s con el nombre"]);
});

test("Atlas lee las partes numeradas desde 1, con su duración y el silencio de antes", () => {
  const m = mensajeAtlasVideo("quita el inicio", { nombre: "Reel", duracion: 7, analisis: an, edicion: ed({ quitadas: [2] }) });
  assert.match(m, /## Partes \(3\)\n1\. 1\.0–2\.2 s \(dura 1\.2 s; silencio antes 1\.0 s\)\n2\. 4\.0–4\.9 s \(dura 0\.9 s; silencio antes 1\.8 s\)\n3\. .*\[QUITADA\]/);
  assert.match(m, /## Pedido\nquita el inicio/);
  assert.match(m, /## Marca\nEste video no tiene marca elegida/);
  assert.match(mensajeAtlasVideo("x", { nombre: "R", duracion: 7, analisis: an, edicion: ed(), kit: { nombre: "Silva", logo: true, musica: "Tema" } }), /## Marca\nSilva: tiene logo; música «Tema»\./);
});

test("kit de marca: nombre y colores limpios, logo y música validados", async () => {
  const { datosKit, validarArchivoKit, nuevoIdKit, idKitValido } = await import("../src/video/marcas-video.ts");
  assert.deepEqual(datosKit({ nombre: "  Clínica Silva ", color: "#1D3557", texto: "rojo" }), { nombre: "Clínica Silva", color: "#1d3557", texto: "#ffffff" });
  assert.throws(() => datosKit({ nombre: " " }), /Ponle un nombre/);
  assert.equal(validarArchivoKit("logo", "Logo Final.PNG", 1000), "logo.png");
  assert.equal(validarArchivoKit("logo", "logo.jpeg", 1000), "logo.jpg");
  assert.equal(validarArchivoKit("musica", "tema.mp3", 1000), "musica.mp3");
  assert.throws(() => validarArchivoKit("logo", "logo.svg", 1000), /PNG, JPG o WEBP/);
  assert.throws(() => validarArchivoKit("musica", "tema.mp3", 31 * 1024 * 1024), /más de 30 MB/);
  assert.ok(idKitValido(nuevoIdKit("Clínica Silva")) && /^m-clinica-silva-/.test(nuevoIdKit("Clínica Silva")));
});

test("Atlas manda la hoja de miniaturas a la API de Anthropic, sin forzar la herramienta en Sonnet 5.5", async () => {
  const antes = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba";
  let cuerpo: { model?: string; tool_choice?: unknown; system?: string; messages?: { content: { type: string; source?: { media_type: string; data: string } }[] }[] } = {};
  let url = "";
  globalThis.fetch = (async (u: unknown, init: RequestInit) => {
    url = String(u);
    cuerpo = JSON.parse(String(init.body));
    return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "editar_video", input: { respuesta: "Quité la parte 1. Los subtítulos todavía no.", acciones: [{ tipo: "quitar", unidad: "parte", desde: 1, hasta: 1 }, { tipo: "armar", formatos: ["9:16"] }], noSePuede: ["Subtítulos"] } }] });
  }) as typeof fetch;
  try {
    const r = await interpretarPedidoVideo("quita el inicio, ponle subtítulos y expórtalo vertical", { nombre: "Reel", duracion: 7, analisis: an, edicion: ed() }, new Uint8Array([0xff, 0xd8, 0xff]));
    assert.match(url, /\/v1\/messages$/);
    assert.equal(cuerpo.model, "claude-sonnet-5-5");
    assert.deepEqual(cuerpo.tool_choice, { type: "auto" });
    assert.match(String(cuerpo.system), /^Corte, editor de video/);
    const bloques = cuerpo.messages![0].content;
    assert.equal(bloques[0].type, "image");
    assert.equal(bloques[0].source!.media_type, "image/jpeg");
    assert.equal(bloques[0].source!.data, "/9j/");
    assert.equal(bloques[1].type, "text");
    assert.deepEqual(r.edicion.quitadas, [0]);
    assert.deepEqual(r.armar, ["9:16"]);
    assert.deepEqual(r.noSePuede, ["Subtítulos"]);
  } finally {
    globalThis.fetch = antes;
    delete process.env.ANTHROPIC_API_KEY;
  }
  await assert.rejects(interpretarPedidoVideo("hola", { nombre: "R", duracion: 7, analisis: an, edicion: ed() }), /Falta la clave de Anthropic/);
});
