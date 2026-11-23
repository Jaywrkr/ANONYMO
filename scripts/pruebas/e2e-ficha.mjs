// La ficha con mínimos (sistema/92), con nube.sh levantado (Supabase y Anthropic falsos).
// Unmake entra como cliente; sin lo mínimo Faro no le escribe un guion y dice qué falta; con la ficha completa sí,
// y el guion se escribe con lo que se sabe del cliente. Uso: node scripts/pruebas/e2e-ficha.mjs [carpeta-capturas]
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-ficha";
mkdirSync(capturas, { recursive: true });
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const pedidosIA = () => { try { return readFileSync(registro, "utf8").trim().split("\n").filter(Boolean); } catch { return []; } };
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
const pedirGuion = async () => {
  await p.goto(`${B}/estudio/video`);
  const s = p.locator("section[aria-labelledby=titulo-guiones]");
  await s.locator("textarea").fill("Un reel que explique por qué una web propia vende más que solo Instagram");
  await s.locator("input").fill("Unmake");
  await s.locator("button:has-text('Que Faro escriba el guion')").click();
  return s;
};
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Unmake entra como cliente: sin datos, casi nada se puede hacer.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Unmake");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/anonymo/);
  const tareas = p.locator("[data-tareas-saber]");
  exigir(await espera(tareas) && await tareas.locator("[data-tarea]").count() === 7, "la ficha dice qué se puede hacer: siete tareas");
  exigir(await tareas.locator("[data-listo=si]").count() === 0, "con solo el nombre, ninguna tarea está lista");
  exigir(/Falta: a qué se dedica, qué quiere vender, a quién le habla, dónde publica/.test(await tareas.locator("[data-tarea=guion]").innerText()), "el guion dice exactamente qué le falta");
  await p.screenshot({ path: join(capturas, "1-ficha-vacia.png"), fullPage: true });

  // 2 · Sin lo mínimo, Faro no escribe: explica qué falta y dónde completarlo. Y no gasta IA.
  const antes = pedidosIA().length;
  const s1 = await pedirGuion();
  exigir(await espera(p.locator("text=/Para escribirle un guion a Unmake falta saber:.*qué quiere vender/"), 20000), "Faro no escribe sin lo mínimo y dice qué falta");
  exigir(!(await s1.locator("[role=status]:has-text('Faro escribió')").count()) && pedidosIA().length === antes, "y no se llama a la IA");

  // 3 · Se completa la ficha: lo que falta para el guion.
  await p.goto(`${B}/estudio/cliente/anonymo`);
  const f = p.locator("[data-form-saber]");
  await f.locator("[name=saber-rubro]").fill("Estudio de diseño web con agentes de IA");
  await f.locator("[name=saber-oferta]").fill("Webs de una página para negocios de Cuenca, listas en 7 días");
  await f.locator("[name=saber-publico]").fill("Dueños de consultorios, estudios y locales que solo tienen Instagram");
  await f.locator("[name=saber-canales]").fill("Instagram y TikTok");
  await f.locator("[name=saber-tono]").fill("Directo, simple, sin palabras rebuscadas");
  await f.locator("button:has-text('Guardar lo que sabemos')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Guardado. Mira abajo qué se puede hacer ahora.')")), "guardar dice qué pasó");
  exigir(await espera(tareas.locator("[data-tarea=guion][data-listo=si]")) && /Se puede/.test(await tareas.locator("[data-tarea=guion]").innerText()), "el guion pasa a «Se puede»");
  exigir(/Faltan/.test(await tareas.locator("[data-tarea=contenido]").innerText()) && await tareas.locator("[data-tarea=web][data-listo=no]").count() === 1, "el mes de contenido y la web siguen pidiendo lo suyo");
  await p.reload();
  exigir(await f.locator("[name=saber-oferta]").inputValue() === "Webs de una página para negocios de Cuenca, listas en 7 días", "lo escrito queda guardado");
  await p.screenshot({ path: join(capturas, "2-ficha-con-datos.png"), fullPage: true });

  // 4 · Ahora Faro sí escribe, y con lo que se sabe del cliente.
  const s2 = await pedirGuion();
  exigir(await espera(s2.locator("[role=status]:has-text('Faro escribió')"), 60000), "con la ficha lista, Faro escribe el guion");
  const ultimo = pedidosIA().at(-1) ?? "";
  exigir(/Lo que sabemos del cliente/.test(ultimo) && /Dueños de consultorios, estudios y locales/.test(ultimo) && /Instagram y TikTok/.test(ultimo), "y a la IA le llega lo que se sabe del cliente: a quién le habla y dónde publica");

  // 5 · Un nombre suelto, sin ficha, se sigue pudiendo usar.
  await p.goto(`${B}/estudio/video`);
  const s3 = p.locator("section[aria-labelledby=titulo-guiones]");
  await s3.locator("textarea").fill("Una idea rápida para probar un formato nuevo de video");
  await s3.locator("input").fill("Idea suelta");
  await s3.locator("button:has-text('Que Faro escriba el guion')").click();
  exigir(await espera(s3.locator("[role=status]:has-text('Faro escribió')"), 60000), "un guion suelto, sin cliente con ficha, se escribe como antes");

  // 6 · En celular.
  const m = await (await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await ctx.storageState() })).newPage();
  await m.goto(`${B}/estudio/cliente/anonymo`);
  await m.waitForSelector("[data-tareas-saber]");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "la ficha cabe en celular");
  await m.screenshot({ path: join(capturas, "3-celular.png"), fullPage: true });
} catch (e) {
  fallas.push(`se cayó: ${e.message}`); console.log(`✗ se cayó: ${e.message}`);
} finally { await nav.close(); }
console.log(fallas.length ? `\n${fallas.length} falla(s)` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
