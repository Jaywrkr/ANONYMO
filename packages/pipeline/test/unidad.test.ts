import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENTES, FASES } from "@anonymo/agentes";
const { CONTRATOS, contratoPorId, ordenar, lecturas, dependientes } = await import("../src/contratos.ts");
const { enrutar } = await import("../src/cliente.ts");
const { diferencias, contarCambios } = await import("../src/diferencias.ts");
const { diasDe } = await import("../src/calendario.ts");
const { usd, estimar } = await import("../src/costo.ts");
const { planificar, leerPausas, resolverPausas } = await import("../src/atlas.ts");
const { consejosPara } = await import("../src/plantillas.ts");
const { leerNota } = await import("../src/jurado.ts");

test("cada agente de cada fase tiene contrato y todos los agentes trabajan", () => {
  for (const f of FASES) for (const a of f.agentes) assert.ok(contratoPorId(`${f.n}.${a}`), `${f.n}.${a}`);
  const usados = new Set(CONTRATOS.map((c) => c.agente));
  for (const a of AGENTES) assert.ok(usados.has(a.id), a.id);
});

test("ordenar respeta dependencias dentro de la fase", () => {
  const o = ordenar([4]);
  assert.ok(o.indexOf("4.orla") < o.indexOf("4.vector"));
  assert.ok(o.indexOf("4.vector") < o.indexOf("4.tempo"));
});

test("lecturas solo incluye lo que está antes en el plan", () => {
  const plan = ordenar([1, 4, 6]);
  assert.deepEqual(lecturas("4.orla", plan), ["1.nova", "1.sonda"]);
});

test("dependientes arrastra lo que lee lo cambiado y siempre el jurado", () => {
  const plan = ordenar([1, 3, 4, 6]);
  const d = dependientes(["3.mira"], plan);
  assert.ok(d.includes("4.orla") && d.includes("6.trofeo") && !d.includes("1.nova"));
});

test("Atlas reparte por palabras clave y cae en Orla si no entiende", () => {
  const plan = planificar({ id: "x", cliente: "X", tipo: "todo", descripcion: "x", creado: new Date().toISOString() });
  assert.ok(enrutar("más elegante", plan).includes("3.mira"));
  assert.deepEqual(enrutar("el precio es alto", plan), ["1.ledger"]);
  assert.equal(enrutar("xyz", plan).length, 1);
});

test("planificar: sin marca suma Identidad y sin web saca a Prisma", () => {
  const a = planificar({ id: "a", cliente: "A", tipo: "web", descripcion: "x", contexto: { tieneMarca: false }, creado: "" });
  assert.deepEqual(a.fases, [1, 3, 4, 6]);
  const b = planificar({ id: "b", cliente: "B", tipo: "lanzamiento", descripcion: "x", creado: "" });
  assert.ok(!b.tareas.includes("6.prisma"));
});

test("pausas: nunca, cada-fase, números y clave", () => {
  assert.deepEqual(resolverPausas("nunca", "web", [1, 4, 6]), []);
  assert.deepEqual(resolverPausas("cada-fase", "web", [1, 4, 6]), [1, 4, 6]);
  assert.deepEqual(resolverPausas(leerPausas("4, 9"), "web", [1, 4, 6]), [4]);
  assert.deepEqual(resolverPausas("clave", "web", [1, 4, 6]), [1, 4]);
  assert.throws(() => leerPausas("hola"));
});

test("diferencias línea por línea", () => {
  const d = diferencias("a\nb\nc", "a\nB\nc\nd");
  assert.deepEqual(contarCambios(d), { agregadas: 2, quitadas: 1 });
});

test("duraciones y costos", () => {
  assert.equal(diasDe("3 a 5 días"), 5);
  assert.equal(diasDe("2 semanas"), 14);
  assert.equal(usd(1_000_000, 0), 3);
  assert.ok(estimar("x".repeat(4000)).estimado);
});

test("plantillas dan consejos generales y por agente", () => {
  assert.ok(consejosPara("salud", "orla").length > consejosPara("salud", "eco").length);
  assert.deepEqual(consejosPara(undefined, "orla"), []);
});

test("leerNota saca la nota del bloque json", () => {
  const n = leerNota({ tarea: "6.trofeo", agente: "trofeo", titulo: "", dice: "", necesita: "", estado: "lista", modo: "manual", version: 1, creado: "", contenido: '```json\n{"diseno":8,"usabilidad":8,"creatividad":7,"contenido":7}\n```' });
  assert.equal(n?.final, 7.7);
});
