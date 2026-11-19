// El medidor de gasto en IA (sistema/91), con nube.sh levantado (Supabase y Anthropic falsos).
// Jay ve el gasto, anota su saldo, Faro usa la IA y queda medido; al llegar al tope la IA se detiene y Jay da permiso.
// Uso: node scripts/pruebas/e2e-gasto.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const NUBE = "http://127.0.0.1:54321/storage/v1/object/proyectos";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-gasto";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
const rutaMes = `${NUBE}/_gasto/meses/${dia.slice(0, 7)}.json`;
const cab = { authorization: "Bearer x", apikey: "x" };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
const pedirGuion = async (de) => {
  await p.goto(`${B}/estudio/video`);
  const s = p.locator("section[aria-labelledby=titulo-guiones]");
  await s.locator("textarea").fill(de);
  await s.locator("button:has-text('Que Faro escriba el guion')").click();
  return s;
};
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · La pantalla, vacía.
  await p.locator("summary:has-text('Mejorar el estudio')").click();
  await p.locator("a:has-text('Gasto en IA')").click();
  await p.waitForURL(/estudio\/gasto/);
  exigir(await espera(p.locator("[data-titular-gasto]")) && /Todavía no hay gasto medido/.test(await p.locator("[data-titular-gasto]").innerText()), "«Gasto en IA» está en el menú y, sin uso, lo dice");
  exigir(/de USD 8\.00/.test(await p.locator("section[aria-label=Hoy]").innerText()) && /de USD 60\.00/.test(await p.locator("section[aria-label='Este mes']").innerText()), "arranca con los topes iniciales: 8 por día y 60 por mes");

  // 2 · Jay anota el saldo de la consola.
  const aj = p.locator("[data-ajustes-gasto]");
  await aj.getByLabel("Saldo en la consola (USD)").fill("269.06");
  await aj.locator("button:has-text('Anotar')").click();
  exigir(await espera(aj.locator("[role=status]:has-text('Saldo anotado: USD 269.06')")), "anotar el saldo dice qué pasó");
  exigir(await espera(p.locator("section[aria-label=Saldo]:has-text('USD 269.06')")), "y el saldo aparece arriba");
  const malo = await p.evaluate(async () => (await fetch("/estudio/gasto/ajustes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ diario: 0 }) })).status);
  exigir(malo === 400, "un tope de cero no se acepta");

  // 3 · Faro usa la IA: queda medido con su modelo y su costo.
  const s1 = await pedirGuion("Un reel corto para presentar el estudio");
  exigir(await espera(s1.locator("[role=status]:has-text('Faro escribió')"), 60000), "Faro escribió un guion con la IA");
  await p.goto(`${B}/estudio/gasto`);
  exigir(/Van USD 0\.003 este mes/.test(await p.locator("[data-titular-gasto]").innerText()), "el titular dice cuánto va este mes (400 de entrada y 200 de salida con Sonnet 5.5: USD 0.003)");
  exigir(await espera(p.locator("section:has-text('Por agente, este mes') >> text=Faro (guiones)")) && await p.locator("section:has-text('Por modelo, este mes') >> text=Sonnet 5.5").count() === 1 && /400 de entrada, 200 de salida/.test(await p.locator("section[aria-labelledby=t-ultimas]").innerText()), "la llamada aparece por agente, por modelo y en las últimas llamadas");
  exigir(/USD 269\.06/.test(await p.locator("section[aria-label=Saldo]").innerText()), "y el saldo ya descuenta (269.057 se ve como 269.06)");
  await p.screenshot({ path: join(capturas, "1-gasto.png"), fullPage: true });

  // 4 · Se llega al tope del día: la IA se detiene sola y lo dice.
  const mes = await (await fetch(rutaMes, { headers: cab })).json();
  mes.llamadas.push({ t: new Date().toISOString(), origen: "vector", tarea: "4.vector", proyecto: "clinica-sonrisa", modelo: "claude-opus-5-5", entrada: 100000, salida: 400000, usd: 8.4, auto: true });
  const subida = await fetch(rutaMes, { method: "POST", headers: { ...cab, "x-upsert": "true", "content-type": "application/json" }, body: JSON.stringify(mes) });
  exigir(subida.ok, "se simula un día caro en la nube de prueba");
  await p.reload();
  exigir(/Se llegó al tope de hoy/.test(await p.locator("[data-titular-gasto]").innerText()) && await p.locator("text=Hoy se llegó al tope: la IA está detenida.").count() === 1, "la pantalla dice que se llegó al tope de hoy");
  exigir(/Clínica Sonrisa/.test(await p.locator("section:has-text('Por proyecto, este mes')").innerText()) && /Opus 5\.5/.test(await p.locator("section:has-text('Por modelo, este mes')").innerText()), "con el proyecto por su nombre y el modelo caro a la vista");
  await p.screenshot({ path: join(capturas, "2-tope.png"), fullPage: true });
  const s2 = await pedirGuion("Otro reel, con el tope ya alcanzado");
  exigir(await espera(p.locator("text=/Se llegó al tope de gasto en IA de hoy \\(USD 8\\.00\\)/"), 30000), "con el tope alcanzado Faro no llama a la IA y explica por qué");
  exigir(!(await s2.locator("[role=status]:has-text('Faro escribió')").count()), "y no escribe nada");

  // 5 · Jay da permiso solo por hoy y el trabajo a mano sigue.
  await p.goto(`${B}/estudio/gasto`);
  await p.locator("button:has-text('Permitir USD 4 más hoy')").click();
  exigir(await espera(p.locator("[role=status]:has-text('hoy se pueden gastar USD 4 más')")), "dar permiso dice qué pasó");
  exigir(await espera(p.locator("text=Ya diste permiso para USD 4 más hoy.")) && /de USD 12\.00/.test(await p.locator("section[aria-label=Hoy]").innerText()), "y el tope de hoy pasa a 12 solo por hoy");
  const s3 = await pedirGuion("Un tercer reel, ya con permiso");
  exigir(await espera(s3.locator("[role=status]:has-text('Faro escribió')"), 60000), "con permiso, Faro vuelve a trabajar");

  // 6 · En celular.
  const m = await (await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await ctx.storageState() })).newPage();
  await m.goto(`${B}/estudio/gasto`);
  await m.waitForSelector("[data-titular-gasto]");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "la pantalla de gasto cabe en celular");
  await m.screenshot({ path: join(capturas, "3-celular.png"), fullPage: true });
} catch (e) {
  fallas.push(`se cayó: ${e.message}`); console.log(`✗ se cayó: ${e.message}`);
} finally { await nav.close(); }
console.log(fallas.length ? `\n${fallas.length} falla(s)` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
