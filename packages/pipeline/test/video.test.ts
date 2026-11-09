import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { calcularCortes, tramosConservados, aEditado, aOriginal, gruposSubtitulos, planEdicion, esMuletilla, edicionSegura } = await import("../src/video/edicion.ts");
const { archivoAss, colorAss } = await import("../src/video/subtitulos.ts");
const { leerWhisper } = await import("../src/video/transcribir.ts");
const { filtrosRender, leerMedida, medirVideo, renderizar, rutaFfmpeg } = await import("../src/video/ffmpeg.ts");
const { EDICION_INICIAL } = await import("../src/video/tipos.ts");

const ed = (x: Partial<typeof EDICION_INICIAL> = {}) => ({ ...structuredClone(EDICION_INICIAL), ...x });
// «Hola, eh, esto es ANONYMO.» con una pausa larga en medio y silencio al principio y al final.
const tr = {
  texto: "Hola, eh, esto es ANONYMO.",
  palabras: [
    { texto: "Hola,", inicio: 1.0, fin: 1.4 },
    { texto: "eh,", inicio: 1.5, fin: 1.8 },
    { texto: "esto", inicio: 1.9, fin: 2.2 },
    { texto: "es", inicio: 4.0, fin: 4.2 },
    { texto: "ANONYMO.", inicio: 4.25, fin: 4.9 },
  ],
};

test("las muletillas se reconocen sin llevarse palabras reales", () => {
  for (const m of ["eh", "Eh,", "mmm", "Emm…", "ah", "um"]) assert.ok(esMuletilla(m), m);
  for (const p of ["este", "es", "hemos", "ah­ora", "mamá", "año"]) assert.ok(!esMuletilla(p), p);
});

test("corta el silencio del inicio, la muletilla, la pausa larga y el final", () => {
  const c = calcularCortes(tr, ed(), 6);
  assert.deepEqual(c.map((x) => x.motivo), ["inicio", "muletilla", "silencio", "final"]);
  assert.ok(Math.abs(c[0].fin - 0.88) < 0.001);
  // La pausa larga deja un respiro de 0,12 s a cada lado.
  assert.deepEqual([c[2].inicio, c[2].fin], [2.32, 3.88]);
  assert.ok(c[3].inicio > 4.9 && c[3].fin === 6);
  const t = tramosConservados(c, 6);
  assert.equal(t.length, 3);
  assert.ok(t.every((x) => x.fin > x.inicio));
});

test("sin quitar silencios ni muletillas no se corta nada; quitar una palabra a mano sí corta", () => {
  assert.deepEqual(calcularCortes(tr, ed({ silencios: false, muletillas: false }), 6), []);
  const c = calcularCortes(tr, ed({ silencios: false, muletillas: false, quitadas: [2] }), 6);
  assert.equal(c.length, 1);
  assert.equal(c[0].motivo, "texto");
  assert.ok(c[0].inicio >= 1.8 && c[0].fin <= 4.0);
  // Si se quita todo, no se corta nada (no hay video vacío).
  assert.deepEqual(calcularCortes(tr, ed({ quitadas: [0, 1, 2, 3, 4] }), 6), []);
});

test("los tiempos van y vuelven entre el original y el video cortado", () => {
  const tramos = tramosConservados(calcularCortes(tr, ed(), 6), 6);
  for (const t of [1.0, 2.0, 4.1, 4.9]) assert.ok(Math.abs(aOriginal(aEditado(t, tramos), tramos) - t) < 1e-9, String(t));
  // Un instante cortado cae al borde del corte.
  assert.equal(aEditado(3, tramos), aEditado(2.32, tramos));
});

test("los subtítulos usan los tiempos del video cortado y no muestran la muletilla", () => {
  const p = planEdicion(tr, ed(), 6);
  const texto = p.grupos.flatMap((g) => g.palabras.map((w) => w.texto));
  assert.deepEqual(texto, ["Hola,", "esto", "es", "ANONYMO."]);
  assert.ok(p.grupos[0].inicio < 0.2, "la primera palabra arranca casi en cero");
  // «Hola,» cierra grupo por la coma? No: la coma solo corta con 2 o más palabras.
  assert.ok(p.grupos.every((g) => g.palabras.length <= 3));
  assert.ok(p.duracion < 6 && p.duracion > 2);
  assert.equal(p.resumen.cortes, 4);
  const limpio = gruposSubtitulos(tr, ed({ subtitulos: { ...EDICION_INICIAL.subtitulos, plantilla: "limpio" } }), p.tramos);
  assert.ok(limpio.length <= p.grupos.length);
});

test("el archivo .ass resalta la palabra dicha y no deja que el texto mande órdenes", () => {
  const p = planEdicion({ texto: "", palabras: [{ texto: "hola{\\b1}", inicio: 0, fin: 0.5 }, { texto: "mundo", inicio: 0.5, fin: 1 }] }, ed({ silencios: false }), 1.2);
  const a = archivoAss(p.grupos, EDICION_INICIAL.subtitulos, "9:16");
  assert.match(a, /PlayResX: 1080\nPlayResY: 1920/);
  assert.match(a, /Style: Base,Geist Black,\d+/);
  assert.ok(a.includes(`{\\c${colorAss("#ffd43b")}}HOLA/B1`), "la palabra activa va en el color de acento y sin llaves");
  assert.equal((a.match(/^Dialogue:/gm) ?? []).length, 2);
  assert.equal(colorAss("#ff8000"), "&H000080FF");
});

test("la respuesta de Whisper conserva la puntuación de cada palabra", () => {
  const t = leerWhisper({ language: "spanish", text: "¿Hola? Esto, sí.", words: [{ word: "Hola", start: 0, end: 0.4 }, { word: "Esto", start: 0.5, end: 0.8 }, { word: "sí", start: 0.9, end: 1.1 }] });
  assert.deepEqual(t.palabras.map((w) => w.texto), ["¿Hola?", "Esto,", "sí."]);
});

test("la edición que llega del navegador se limpia", () => {
  const e = edicionSegura({ pausaMax: 99, quitadas: [3, 3, -1, 1.5, 2], subtitulos: { plantilla: "x", acento: "rojo", tamano: 9 } }, EDICION_INICIAL);
  assert.equal(e.pausaMax, 3);
  assert.deepEqual(e.quitadas, [2, 3]);
  assert.equal(e.subtitulos.plantilla, "marca");
  assert.equal(e.subtitulos.acento, EDICION_INICIAL.subtitulos.acento);
  assert.equal(e.subtitulos.tamano, 1.6);
});

test("lee la medida de un video girado de celular", () => {
  const m = leerMedida("Duration: 00:00:12.48, start\n  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps\n    side data:\n      displaymatrix: rotation of -90.00 degrees\n  Stream #0:1: Audio: aac");
  assert.deepEqual([m.duracion, m.ancho, m.alto, m.audio], [12.48, 1080, 1920, true]);
  assert.throws(() => leerMedida("basura"), /No parece un video/);
});

test("los filtros cortan cada tramo con fundido y llevan al formato", () => {
  const f = filtrosRender([{ inicio: 0, fin: 1 }, { inicio: 2, fin: 3.5 }], "1:1", EDICION_INICIAL, { audio: true, ass: "/tmp/a b:c.ass", fuentes: "/f" });
  assert.match(f, /concat=n=2:v=1:a=1/);
  assert.match(f, /crop=1080:1080/);
  assert.match(f, /afade=t=out:st=1\.488/);
  assert.match(f, /ass=\/tmp\/a b\\:c\.ass/);
  assert.match(f, /loudnorm=I=-14/);
});

test("arma de verdad un video vertical con cortes y subtítulos", { skip: !(await hayFfmpeg()) && "sin FFmpeg" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "video-prueba-"));
  const entrada = join(dir, "entrada.mp4");
  execFileSync(await rutaFfmpeg(), ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=6", "-f", "lavfi", "-i", "sine=f=440:d=6", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", entrada]);
  const m = await medirVideo(entrada);
  assert.ok(Math.abs(m.duracion - 6) < 0.2 && m.audio);
  const p = planEdicion(tr, ed(), m.duracion);
  const ass = join(dir, "s.ass");
  writeFileSync(ass, archivoAss(p.grupos, EDICION_INICIAL.subtitulos, "9:16"));
  const salida = join(dir, "final.mp4");
  let visto = 0;
  await renderizar({ entrada, salida, tramos: p.tramos, formato: "9:16", edicion: EDICION_INICIAL, ass, audio: true, carpeta: dir, vista: true, alAvanzar: (s) => { visto = Math.max(visto, s); } });
  const r = await medirVideo(salida);
  assert.equal(`${r.ancho}x${r.alto}`, "1080x1920");
  assert.ok(Math.abs(r.duracion - p.duracion) < 0.25, `${r.duracion} vs ${p.duracion}`);
  assert.ok(visto > 0, "avisa el avance");
});

async function hayFfmpeg() {
  try { execFileSync(await rutaFfmpeg(), ["-hide_banner", "-version"], { stdio: "ignore" }); return true; } catch { return false; }
}
