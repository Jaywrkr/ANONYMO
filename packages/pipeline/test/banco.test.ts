// Banco de calibración (sistema/55): índice, rúbrica deducida, juez a ciegas, rondas de calibración y comparación por pares.
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { crear, guardarEntrega, leerEntrega } from "../src/almacen.ts";
import { planificar } from "../src/atlas.ts";
import {
  DISCIPLINAS_BANCO, NIVELES, agregarAlBanco, ajustarMapa, calibracionEnCurso, cambiarNotaBanco, compararConBanco, deducirRubrica, devolverAlBanco,
  huellaBanco, iniciarCalibracion, leerBanco, leerCambiosBanco, medir, nivelDe, pasoCalibracion, piezaCiega, pideCalibrar, quitarDelBanco,
  rondasCalibracion, ultimoInforme, type Juez, type Referencia,
} from "../src/banco.ts";
import { notaCalibrada } from "../src/calidad.ts";
import { leerJuez } from "../src/juez.ts";
import { calibracion, criteriosBanco } from "../src/oficio.ts";
import type { Entrega } from "../src/tipos.ts";

const RAIZ = join(import.meta.dirname, "..", "..", "..");

test("el índice del banco es válido, cubre los cuatro niveles y no trae imágenes de terceros", () => {
  const refs = leerBanco();
  assert.equal(new Set(refs.map((r) => r.id)).size, refs.length, "ids únicos");
  for (const d of DISCIPLINAS_BANCO) {
    const deD = refs.filter((r) => r.disciplina === d);
    assert.ok(deD.length >= 40, `${d}: ${deD.length} referencias`);
    for (const nv of NIVELES) assert.ok(deD.filter((r) => nivelDe(r.nota) === nv.id).length >= 5, `${d} tiene nivel ${nv.rango}`);
    const validos = new Set(criteriosBanco(d).map(([id]) => id));
    for (const r of deD) {
      for (const c of [...r.cumple, ...r.falla]) assert.ok(validos.has(c), `${r.id}: criterio ${c}`);
      assert.ok(r.descripcion.length > 20 && r.porque.length > 5, r.id);
      if (r.nota >= 9) assert.ok(r.fuente?.startsWith("https://"), `${r.id}: la premiada tiene fuente`);
      if (r.autor === "Arquetipo genérico") assert.equal(r.fuente, null, "los arquetipos no exponen a nadie");
    }
  }
  const archivos = readdirSync(join(RAIZ, "data", "banco"));
  assert.ok(archivos.every((f) => /\.(json|md)$/.test(f)), "en el repo solo va el índice: " + archivos.join(", "));
});

test("la rúbrica sale del banco: suma 10 y pesa más lo que separa a las premiadas de las genéricas", () => {
  for (const d of DISCIPLINAS_BANCO) {
    const r = deducirRubrica(d);
    assert.equal(Math.round(r.criterios.reduce((s, c) => s + c.peso, 0) * 10), 100, `${d} suma 10`);
    assert.equal(r.criterios.length, criteriosBanco(d).length, "usa los criterios del oficio, sin duplicarlos");
    assert.ok(r.comparten.length > 0 && r.faltan.length > 0, `${d}: comparten ${r.comparten} · faltan ${r.faltan}`);
    const separa = (c: { premiadas: number; genericas: number }) => c.premiadas - c.genericas;
    assert.ok(separa(r.criterios[0]) >= separa(r.criterios.at(-1)!), "el más pesado separa más");
  }
  assert.ok(!criteriosBanco("identidad").some(([id]) => id === "rutas-distintas"), "lo de propuestas no aplica a una pieza terminada");
});

test("el juez lee la pieza a ciegas: sin nombre, autor, premio ni nota", () => {
  const r = leerBanco().find((x) => x.disciplina === "web" && x.nota >= 9 && x.premio)!;
  const t = piezaCiega(r);
  for (const no of [r.nombre, r.autor, r.premio!, r.porque]) assert.ok(!t.includes(no), `no muestra «${no}»`);
  const n = leerBanco().find((x) => x.disciplina === "naming")!;
  assert.ok(piezaCiega(n).includes(n.nombre) && !piezaCiega(n).includes(n.autor), "en naming el nombre es la pieza; la agencia no");
});

/** Juez falso que «sabe» la nota (busca la pieza en el banco) y se equivoca como se le diga. */
function juezFalso(sesgo: (r: Referencia, texto: string, vez: number) => number): { juez: Juez; mensajes: string[] } {
  const refs = leerBanco(), veces = new Map<string, number>(), mensajes: string[] = [];
  const juez: Juez = async (mensaje) => {
    const texto = (mensaje.at(-1) as { text: string }).text;
    mensajes.push(texto);
    const r = refs.find((x) => texto.includes(x.descripcion))!;
    const vez = (veces.get(r.id) ?? 0) + 1; veces.set(r.id, vez);
    const condiciones = JSON.parse(texto.match(/CONDICIONES: (\[.*?\])\nMARCA/s)![1]) as { id: string }[];
    const nota = Math.max(0, Math.min(10, r.nota + sesgo(r, texto, vez)));
    return { texto: JSON.stringify({ nota, resumen: "ok", comprobaciones: condiciones.map((c) => ({ id: c.id, estado: r.cumple.includes(c.id.replace("oficio-", "")) ? "cumple" : "falla", evidencia: "visto" })) }), usd: 0.01 };
  };
  return { juez, mensajes };
}

test("la calibración mide al juez, lo ajusta cuando se equivoca hacia un lado y repite hasta la meta", async () => {
  // Ronda 1: sobrevalora lo genérico (+2.5) y no es consistente. Con los ajustes, se corrige.
  const { juez, mensajes } = juezFalso((r, texto, vez) => {
    const ajustado = texto.includes("Sobrevaloras lo correcto pero genérico");
    if (nivelDe(r.nota) === "generica" && !ajustado) return 2.5;
    if (vez === 2 && !texto.includes("Para que tu nota sea estable")) return 1.5;
    return 0;
  });
  iniciarCalibracion({ disciplinas: ["naming"], repetir: 8, quien: "luna" });
  assert.throws(() => iniciarCalibracion({ disciplinas: ["naming"] }), /Ya se está calibrando/);
  let r = await pasoCalibracion({ plazo: Date.now() + 60_000, juez, paralelo: 8 });
  assert.equal(r.terminado, false, "no llegó a la meta: hay otra ronda");
  assert.equal(r.informe!.ronda, 1);
  const m1 = r.informe!.porDisciplina.naming!;
  assert.equal(m1.cumpleMeta, false);
  assert.ok(m1.sesgo.generica! > 2, "detecta que sobrevalora lo genérico");
  assert.equal(m1.consistencia.maxDif, 1.5);
  assert.ok(m1.bajas.aciertos < m1.bajas.n, "algunas genéricas pasaron de 6");
  assert.ok(leerJuez().ajustes.naming!.some((x) => /Sobrevaloras lo correcto/.test(x)));
  assert.ok(mensajes.every((t) => t.includes("# Revisión de calidad")), "es el mismo juez de calidad.ts");

  r = await pasoCalibracion({ plazo: Date.now() + 60_000, juez, paralelo: 8 });
  assert.equal(r.terminado, true);
  const m2 = r.informe!.porDisciplina.naming!;
  assert.equal(m2.cumpleMeta, true, JSON.stringify(m2));
  assert.equal(m2.mae, 0);
  assert.equal(m2.bienClasificadas, 1);
  assert.ok(mensajes.at(-1)!.includes("Sobrevaloras lo correcto pero genérico"), "la ronda 2 usa las instrucciones ajustadas");
  assert.equal(calibracionEnCurso(), undefined);
  assert.equal(rondasCalibracion().length, 2, "se guarda el informe de cada ronda");
  assert.equal(ultimoInforme()!.ronda, 2);
  assert.equal(leerJuez().huellaCalibrada, huellaBanco());
  assert.equal(pideCalibrar(), false);
  assert.ok(leerJuez().mapas.naming, "queda la corrección de la nota");
  assert.equal(notaCalibrada("2.verba", 9), 9, "un juez exacto no se corrige");
  assert.equal(notaCalibrada("4.orla", 9), undefined, "web todavía no se calibró");
  assert.match(calibracion("2.verba", { id: "x", cliente: "C", tipo: "marca", descripcion: "Café", creado: "" }), /Pesos de la rúbrica deducidos del banco/);
});

test("medir y la recta de corrección", () => {
  const refs = new Map(leerBanco().filter((r) => r.disciplina === "web").map((r) => [r.id, r]));
  // Un juez que comprime la escala (todo hacia el 6): la recta lo estira de vuelta.
  const res = [...refs.values()].map((r) => ({ ref: r.id, pasada: 1 as const, nota: 6 + (r.nota - 6) * 0.5 }));
  const m = medir(res, refs);
  assert.ok(m.mae! > 0.5);
  assert.ok(Math.abs(m.mapa!.b - 2) < 0.01 && m.maeCalibrada! < 0.01, JSON.stringify(m.mapa));
  assert.equal(ajustarMapa([[5, 5], [5, 9], [5, 3], [5, 4], [5, 6], [5, 7]]), undefined, "sin variación no hay recta");
});

test("Jay y Luna cambian notas, quitan y agregan: la rúbrica se recalcula y pide recalibrar", () => {
  const c0 = leerCambiosBanco();
  const r = leerBanco().find((x) => x.disciplina === "naming" && x.nota >= 9)!;
  const pesos0 = JSON.stringify(leerJuez().pesos.naming);
  cambiarNotaBanco(r.id, 5, "jay", c0.revision);
  assert.equal(leerBanco().find((x) => x.id === r.id)!.nota, 5);
  assert.equal(leerBanco().find((x) => x.id === r.id)!.notaIndice, r.nota);
  assert.equal(pideCalibrar(), true);
  assert.notEqual(JSON.stringify(leerJuez().pesos.naming), pesos0, "los pesos se recalcularon");
  assert.throws(() => cambiarNotaBanco(r.id, 6, "luna", c0.revision), /cambió el banco/);
  assert.throws(() => cambiarNotaBanco(r.id, 11, "luna", c0.revision + 1), /0 a 10/);
  quitarDelBanco(r.id, "luna", c0.revision + 1);
  assert.ok(!leerBanco().some((x) => x.id === r.id));
  assert.ok(leerBanco({ quitadas: true }).some((x) => x.id === r.id));
  devolverAlBanco(r.id, c0.revision + 2);
  const nueva = agregarAlBanco({ disciplina: "naming", nombre: "Alba", autor: "Estudio", rubro: "comida", nota: 8, porque: "Corto y evocador.", descripcion: "Nombre para una panadería que abre al amanecer.", razon: "Alba es la primera luz del día.", cumple: ["evocador", "criterios-duros"] }, "luna", c0.revision + 3);
  assert.deepEqual(nueva.falla.sort(), ["distintivo-nombre", "estrategia-nombre", "historia"], "lo no marcado cuenta como no cumplido");
  assert.equal(leerBanco().find((x) => x.id === nueva.id)!.agregada!.quien, "luna");
  assert.throws(() => agregarAlBanco({ disciplina: "web", nombre: "X", nota: 9, porque: "x", descripcion: "x" }, "jay", c0.revision + 4), /Completa/);
  cambiarNotaBanco(r.id, r.nota, "jay", c0.revision + 4);
  assert.equal(leerBanco().find((x) => x.id === r.id)!.notaIndice, undefined, "volver a la nota original quita el cambio");
});

test("la comparación a ciegas no dice cuál es la nuestra y trae los 3 arreglos que más acercan al 10", async () => {
  const ped = { id: "banco-nombres", cliente: "Pan Norte", tipo: "marca" as const, descripcion: "Una panadería de barrio en Cuenca que necesita nombre.", creado: new Date().toISOString() };
  crear(ped, planificar(ped, { tareas: ["2.verba"], preguntas: [] }));
  const e: Entrega = { tarea: "2.verba", agente: "verba", titulo: "Lista de nombres", contenido: "## Finalistas\n- Miga: la parte suave del pan.\n- Horno Norte", dice: "Listo.", necesita: "—", estado: "lista", modo: "real", version: 1, creado: new Date().toISOString() };
  guardarEntrega(ped.id, e);
  const vistos: string[] = [];
  const juez: Juez = async (mensaje) => {
    const t = JSON.stringify(mensaje);
    vistos.push(t);
    assert.ok(!/Pan Norte|Verba|ANONYMO/.test(t), "no hay pistas de quién la hizo");
    const nuestraEsA = t.indexOf("Miga") < t.indexOf("## Pieza B");
    // Pierde contra todas menos una (empata).
    const ganador = vistos.length === 1 ? "empate" : nuestraEsA ? "B" : "A";
    return { texto: JSON.stringify({ ganador, porque: "La otra tiene una historia más clara.", arreglosA: [`Arreglo A${vistos.length}`, "Contar la historia en una línea", "Probar en voz alta"], arreglosB: [`Arreglo B${vistos.length}`, "Contar la historia en una línea", "Otro"] }) };
  };
  const c = await compararConBanco(ped.id, "2.verba", { juez, n: 4 });
  assert.equal(c.contra.length, 4);
  assert.ok(c.contra.every((x) => leerBanco().find((r) => r.id === x.ref)!.nota >= 9), "solo contra piezas de 9 o más");
  assert.equal(c.empata + c.pierde + c.gana, 4);
  assert.equal(c.empata, 1); assert.equal(c.pierde, 3);
  assert.equal(c.arreglos.length, 3);
  assert.equal(new Set(c.arreglos).size, 3, "sin repetir arreglos");
  assert.ok(c.arreglos.every((x) => /^Arreglo [AB]\d$/.test(x)), "primero el arreglo principal de cada comparación perdida: " + c.arreglos.join(" · "));
  assert.equal(leerEntrega(ped.id, "2.verba")!.banco!.pierde, 3, "queda guardada en la entrega");
  const enA = vistos.map((t) => t.indexOf("Miga") < t.indexOf("## Pieza B"));
  assert.ok(enA.includes(true) || enA.includes(false), "el orden A/B lo decide el azar");
  await assert.rejects(compararConBanco(ped.id, "1.ledger" as never, { juez }), /no existe|no tiene banco/);
});

test("un segundo paso no trabaja mientras otro tiene el candado, y el avance se publica en cada tanda", async () => {
  const { juez } = juezFalso(() => 0);
  iniciarCalibracion({ disciplinas: ["contenido"], repetir: 4, maxRondas: 1 });
  let publicaciones = 0, segundo: Awaited<ReturnType<typeof pasoCalibracion>> | undefined;
  const lento: Juez = async (m, d) => {
    if (!segundo) segundo = await pasoCalibracion({ plazo: Date.now() + 60_000, juez });
    return juez(m, d);
  };
  const r = await pasoCalibracion({ plazo: Date.now() + 60_000, juez: lento, paralelo: 10, alAvanzar: async () => { publicaciones++; } });
  assert.equal(segundo!.ocupado, true, "el segundo paso ve el candado y no califica");
  assert.equal(r.terminado, true);
  assert.ok(publicaciones >= 6, `publica el avance en cada tanda (${publicaciones})`);
  assert.equal(calibracionEnCurso(), undefined);
  const m = ultimoInforme()!.porDisciplina.contenido!;
  assert.equal(m.bienClasificadasCalibrada, 1, "con un juez exacto, la nota calibrada clasifica todo bien");
  assert.equal(m.consistencia.maxDif, 0);
});
