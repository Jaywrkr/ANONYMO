// Atlas decide quién trabaja (sistema/23).
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
const { leerSinIA, entenderPedido, planificar } = await import("../src/atlas.ts");
const { costoPlan } = await import("../src/costo.ts");
const { crear, leerProyecto } = await import("../src/almacen.ts");
const { avanzar, empezar } = await import("../src/correr.ts");
const { simulado, recortar } = await import("../src/motor.ts");

const pedidoBase = (tipo: "web" | "marca" | "lanzamiento" | "todo", id = "p") => ({ id, cliente: "X", tipo, descripcion: "x", creado: new Date().toISOString() });

test("sin IA: «solo un logo» no enciende web, video, sonido ni naming", () => {
  const l = leerSinIA("Necesita solo un logo para su cafetería, ya tiene nombre: Café Lento.");
  assert.equal(l.tipo, "marca");
  const t = l.eleccion.tareas;
  assert.ok(t.includes("3.mira"));
  assert.ok(!t.some((x) => x.startsWith("4.") || x.startsWith("2.") || x.startsWith("5.")));
  assert.ok(!t.includes("3.eco") && !t.includes("3.kine"));
  assert.ok(l.eleccion.fuera?.["3.eco"]);
});

test("sin IA: una web con video suma movimiento solo si lo piden y nunca la fase 7", () => {
  const l = leerSinIA("Una web para mi clínica dental, quiero animaciones suaves. Mira https://ejemplo.com");
  assert.equal(l.tipo, "web");
  assert.ok(l.eleccion.tareas.includes("4.kine"));
  assert.ok(!l.eleccion.tareas.includes("4.eco") && !l.eleccion.tareas.includes("4.lumen"));
  assert.ok(!l.eleccion.tareas.some((x) => x.startsWith("7.")));
  assert.deepEqual(l.contexto.referencias, ["https://ejemplo.com"]);
});

test("el plan elegido saca las fases de las tareas y deja fuera lo demás con su razón", () => {
  const plan = planificar(pedidoBase("web"), { tareas: ["1.ledger", "4.orla", "4.vector", "9.nadie" as never], fuera: { "4.eco": "No pidió sonido." }, porIA: true });
  assert.deepEqual(plan.fases, [1, 4]);
  assert.ok(plan.tareas.indexOf("4.orla") < plan.tareas.indexOf("4.vector"));
  assert.equal(plan.quitadas.find((q) => q.id === "4.eco")?.razon, "No pidió sonido.");
  assert.ok(!plan.tareas.includes("9.nadie" as never));
  assert.equal(plan.porIA, true);
});

test("con IA: Atlas usa lo que responde el modelo y descarta ids inventados", async () => {
  const antes = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "prueba";
  let pidio = "";
  globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
    pidio = String(init.body);
    const r = { cliente: "Gabriela", tipo: "web", resumen: "Web elegante", tareas: ["1.ledger", "4.orla", "4.inventada"], fuera: { "4.eco": "Sin sonido" }, preguntas: ["¿Fotos propias?"], contexto: { ciudad: "Cuenca", tieneMarca: true }, idioma: "es", plantilla: "salud" };
    return Response.json({ content: [{ type: "text", text: JSON.stringify(r) }] });
  }) as typeof fetch;
  try {
    const l = await entenderPedido("Gabriela, odontóloga en Cuenca, quiere web elegante.");
    assert.ok(pidio.includes("4.vector")); // el catálogo va en la consulta
    assert.equal(l.cliente, "Gabriela");
    assert.deepEqual(l.eleccion.tareas, ["1.ledger", "4.orla"]);
    assert.equal(l.contexto.ciudad, "Cuenca");
    assert.equal(l.contexto.tieneMarca, true);
    assert.equal(l.plantilla, "salud");
    // Si el modelo responde basura, Atlas sigue con las reglas.
    globalThis.fetch = (async () => Response.json({ content: [{ type: "text", text: "no sé" }] })) as typeof fetch;
    const l2 = await entenderPedido("Un logo para mi tienda");
    assert.equal(l2.eleccion.porIA, false);
  } finally {
    globalThis.fetch = antes;
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test("menos tareas cuestan menos, y las livianas cuestan menos que las pesadas", () => {
  const p = { descripcion: "x".repeat(800) };
  const chico = costoPlan(p, { tareas: ["1.ledger", "3.mira"] });
  const grande = costoPlan(p, { tareas: ["1.atlas", "1.ledger", "1.sonda", "1.nova", "3.mira", "4.orla", "4.vector", "6.trofeo"] });
  assert.ok(chico > 0 && chico < grande);
  assert.ok(costoPlan(p, { tareas: ["4.tempo"] }) < costoPlan(p, { tareas: ["4.orla"] }));
});

test("un plan nuevo no trabaja hasta que alguien dice «que empiecen»", async () => {
  const pedido = pedidoBase("marca", "plan-espera");
  crear(pedido, planificar(pedido, { tareas: ["1.ledger", "3.mira"] }), "plan");
  await avanzar("plan-espera", simulado, () => {});
  assert.equal(leerProyecto("plan-espera").tareas["3.mira"], "por-empezar");
  await empezar("plan-espera", "luna", simulado, () => {});
  const p = leerProyecto("plan-espera");
  assert.equal(p.tareas["1.ledger"], "lista");
  await assert.rejects(empezar("plan-espera", "jay", simulado, () => {}), /ya empezó/);
});

test("recortar deja principio y final de una entrega larga", () => {
  const t = "a".repeat(5000) + "FIN";
  const r = recortar(t, 1000);
  assert.ok(r.length < 1200 && r.endsWith("FIN") && r.includes("recortado"));
  assert.equal(recortar("corto", 1000), "corto");
});

test("sin IA: naming entra solo si falta el nombre", () => {
  assert.ok(leerSinIA("Marca nueva, necesita un nombre y logo").eleccion.tareas.includes("2.verba"));
  assert.ok(!leerSinIA("Logo para su marca, ya tiene nombre").eleccion.tareas.includes("2.verba"));
});
