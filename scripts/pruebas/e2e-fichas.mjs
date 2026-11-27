// Las fichas de los agentes en el chat de Atlas (sistema/124), con nube.sh levantado (IA falsa).
// Hablarle directo a un agente, modo rápido, Sonda con la web, «cliché: …» y «registro: …» que Trofeo usa al armar el caso.
// Uso: node scripts/pruebas/e2e-fichas.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext();
  const p = await ctx.newPage();
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  // Desde la página, como lo hace el chat (mismo origen).
  const hablar = (texto, contexto = {}) => p.evaluate(async ([texto, contexto]) => { const r = await fetch("/estudio/atlas/hablar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: crypto.randomUUID(), texto, contexto }) }); const j = await r.json().catch(() => ({})); return j.mensajes?.[1] ?? { error: `HTTP ${r.status}` }; }, [texto, contexto]);

  const nova = await hablar("Nova: una web con un video de fondo para una panadería");
  exigir(/^Nova \(Estrategia y sparring\)/.test(nova.tarjeta?.texto ?? "") && /Nova/.test(nova.entendi ?? ""), `Nova responde con su ficha (${nova.tarjeta?.texto ?? nova.error})`);
  const mira = await hablar("Mira rápido: ¿un degradado morado va con una marca sobria?");
  exigir(/guardián de marca, rápido/.test(mira.tarjeta?.texto ?? ""), `modo rápido (${mira.tarjeta?.texto ?? mira.error})`);
  const sonda = await hablar("@Sonda: radar de cafeterías en Cuenca");
  exigir(/con la web/.test(sonda.tarjeta?.texto ?? ""), `Sonda busca en la web (${sonda.tarjeta?.texto ?? sonda.error})`);
  const pedidos = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes("un estudio creativo de Cuenca") && l.includes("## Tu ficha:"));
  exigir(pedidos.length >= 3 && pedidos.every((l) => l.includes("Clichés del estudio") && l.includes("No inventas datos")), "cada consulta lleva la ficha, las reglas de todos y los clichés");

  const cli = await hablar("cliché: tipografía con glitch para hablar de tecnología");
  exigir(/Anotado\. Ya son \d+ clichés/.test(cli.texto ?? ""), `«cliché:» se agrega a la lista (${cli.texto ?? cli.error})`);
  const nova2 = await hablar("Nova: otra idea");
  const ultimo = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes("## Tu ficha: Estrategia")).pop() ?? "";
  exigir(ultimo.includes("tipografía con glitch") && !!nova2.tarjeta, "el cliché nuevo ya lo lee Nova");

  const g = await p.evaluate(() => fetch("/estudio/atlas/hablar").then((r) => r.json()));
  const proy = g.proyectos?.[0]?.id;
  exigir(!!proy, `hay un proyecto para registrar (${proy})`);
  const reg = await hablar("registro: elegimos el azul y descartamos el verde porque el cliente es una clínica", { proyecto: proy });
  exigir(/Anotado como decisión/.test(reg.texto ?? ""), `«registro:» se anota en el proyecto con su categoría (${reg.texto ?? reg.error})`);
  const sinProyecto = await hablar("registro: algo suelto");
  exigir(!!sinProyecto.error, "sin proyecto, pregunta para cuál es");
  const caso = await hablar("Trofeo: arma el caso", { proyecto: proy });
  exigir(/Vi la decisión registrada/.test(caso.tarjeta?.texto ?? ""), `Trofeo arma el caso con lo registrado (${caso.tarjeta?.texto ?? caso.error})`);
  const normal = await hablar("¿qué me toca hoy?");
  exigir(!/Tu ficha/.test(JSON.stringify(normal)) && !!(normal.tarjeta || normal.texto), "lo de siempre sigue igual");
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
