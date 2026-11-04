// El oficio de la agencia (sistema/54): estándar por disciplina, rubro reconocido solo y criterio de la casa.
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { crear, guardarEntrega, guardarProyecto, leerProyecto } from "../src/almacen.ts";
import { planificar } from "../src/atlas.ts";
import { controlar } from "../src/calidad.ts";
import { real } from "../src/motor.ts";
import { CRITERIO_BASE, OFICIO, calibracion, disciplinaDe, guardarCriterio, leerCriterio, rubricaOficio, textoOficio } from "../src/oficio.ts";
import { PLANTILLAS, rubroDe } from "../src/plantillas.ts";
import type { Entrega, Pedido } from "../src/tipos.ts";

const pedido = (descripcion: string, extra: Partial<Pedido> = {}): Pedido => ({ id: "x", cliente: "Cliente", tipo: "web", descripcion, creado: new Date().toISOString(), ...extra });

test("el rubro se reconoce por el pedido y el elegido manda", () => {
  assert.equal(rubroDe(pedido("Odontóloga en Cuenca, especialista en estética dental. Quiere una web bilingüe.")), "salud");
  assert.equal(rubroDe(pedido("Una cafetería de especialidad con brunch los domingos.")), "comida");
  assert.equal(rubroDe(pedido("Organizamos bodas en haciendas.")), "eventos");
  assert.equal(rubroDe(pedido("Organizamos bodas; escríbenos por WhatsApp.")), "eventos", "WhatsApp no confunde con tecnología");
  assert.equal(rubroDe(pedido("Algo distinto sin pistas.")), undefined);
  assert.equal(rubroDe(pedido("Odontóloga en Cuenca.", { plantilla: "profesionales" })), "profesionales");
  for (const p of PLANTILLAS) assert.ok(p.comunica, `${p.id} dice cómo comunica`);
});

test("cada agente creativo recibe el oficio de su disciplina, el rubro y el criterio de la casa", () => {
  const t = textoOficio("4.orla", pedido("Odontóloga en Cuenca."));
  assert.match(t, /Estándar de oficio: Diseño y desarrollo web/);
  assert.match(t, /Hero centrado con titular genérico/);
  assert.match(t, /Cómo comunica bien un negocio de «Salud y odontología»/);
  assert.match(t, /Criterio de la casa/);
  assert.ok(t.includes(CRITERIO_BASE.split("\n")[0]));
  assert.match(textoOficio("2.verba", pedido("Café.")), /Naming/);
  assert.match(textoOficio("3.mira", pedido("Café.")), /ícono literal del rubro/);
  assert.match(textoOficio("5.faro", pedido("Café.")), /gancho/);
  assert.equal(textoOficio("1.ledger", pedido("Café.")), "", "lo administrativo no recibe estándar creativo");
  assert.equal(disciplinaDe("4.vector"), "web");
});

test("el revisor califica solo a quien produce la pieza principal, con una escala exigente", () => {
  assert.ok(rubricaOficio("4.vector").some((c) => c.id === "oficio-sin-plantilla"));
  assert.equal(rubricaOficio("4.vector").length, OFICIO.web.rubrica.length);
  assert.equal(rubricaOficio("6.trofeo").length, 0);
  assert.equal(rubricaOficio("2.sonda").length, 0);
  assert.match(calibracion("4.orla", pedido("Café.")), /no puede pasar de 6/);
  assert.equal(calibracion("1.atlas", pedido("Café.")), "");
});

test("el criterio de la casa se guarda con revisión y no se pisa", () => {
  const antes = leerCriterio();
  const c = guardarCriterio("Nada de plantillas. Tipografía con carácter siempre.", "jay", antes.revision);
  assert.equal(c.revision, antes.revision + 1);
  assert.equal(leerCriterio().quien, "jay");
  assert.throws(() => guardarCriterio("Otro criterio más largo de veinte letras.", "luna", antes.revision), /cambió el criterio/);
  assert.throws(() => guardarCriterio("corto", "luna", c.revision), /más de detalle/);
  assert.match(textoOficio("4.orla", pedido("Café.")), /Tipografía con carácter siempre/);
});

/** Respuesta de streaming mínima de la API. */
const sse = (texto: string) => {
  const ev = [{ type: "message_start", message: { usage: { input_tokens: 10, output_tokens: 0 } } }, { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }, { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: texto } }, { type: "content_block_stop", index: 0 }, { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 20 } }, { type: "message_stop" }];
  return new Response(ev.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } });
};

test("el pedido real a la IA lleva el oficio, y el revisor lo usa para calificar", async () => {
  const antes = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba-falsa";
  const cuerpos: any[] = [];
  try {
    globalThis.fetch = (async (_u: unknown, op?: RequestInit) => { cuerpos.push(JSON.parse(String(op?.body))); return sse("## Nombres\n- Alba\nDICE: Listo.\nNECESITA: —"); }) as typeof fetch;
    const ped = { id: "oficio-naming", cliente: "Café Norte", tipo: "marca" as const, descripcion: "Una cafetería de barrio que necesita nombre.", creado: new Date().toISOString() };
    crear(ped, planificar(ped, { tareas: ["2.verba"], preguntas: [] }));
    await real.trabajar({ pedido: ped, tarea: "2.verba", lecturas: [], version: 1, preguntas: [], herramientas: [], cliente: [] });
    assert.match(JSON.stringify(cuerpos[0].messages), /Estándar de oficio: Naming/);
    assert.match(JSON.stringify(cuerpos[0].messages), /Restaurantes y cafés/);

    // El revisor recibe la rúbrica de oficio como condiciones y la escala exigente.
    const ids = rubricaOficio("2.verba").map((c) => c.id);
    globalThis.fetch = (async (_u: unknown, op?: RequestInit) => {
      cuerpos.push(JSON.parse(String(op?.body)));
      const condiciones = JSON.parse(String(op?.body)).messages[0].content.at(-1).text.match(/CONDICIONES: (\[.*?\])\nMARCA/s)[1];
      const comprobaciones = (JSON.parse(condiciones) as { id: string }[]).map((c) => ({ id: c.id, estado: "cumple", evidencia: "Visto en la lista de nombres." }));
      return Response.json({ content: [{ type: "text", text: JSON.stringify({ nota: 6, resumen: "Correcto pero genérico.", comprobaciones }) }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } });
    }) as typeof fetch;
    const p = leerProyecto(ped.id);
    p.modo = "paso"; guardarProyecto(p);
    const e: Entrega = { tarea: "2.verba", agente: "verba", titulo: "Lista de nombres", contenido: "## Nombres\n- Alba\n- Norte", dice: "Listo.", necesita: "—", estado: "lista", modo: "real", version: 1, creado: new Date().toISOString() };
    guardarEntrega(ped.id, e);
    const r = await controlar(leerProyecto(ped.id), e, false);
    const texto = cuerpos.at(-1).messages[0].content.at(-1).text as string;
    assert.match(texto, /estratega de naming/);
    assert.match(texto, /no puede pasar de 6/);
    for (const id of ids) assert.ok(r.comprobaciones.some((c) => c.id === id), `revisa ${id}`);
    assert.equal(r.estado, "cambios", "un 6 (genérico) vuelve a hacerse");
  } finally {
    globalThis.fetch = antes;
    delete process.env.ANTHROPIC_API_KEY;
  }
});
