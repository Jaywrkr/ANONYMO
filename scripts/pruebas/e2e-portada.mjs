// La portada de la agencia (web/21), con nube.sh levantado. Solo lee la web pública: no escribe nada.
// Comprueba titular, los doce trabajos con sus imágenes, el menú, los precios, que la IA se nombre una sola vez,
// la versión en inglés y el ancho de celular. Uso: node scripts/pruebas/e2e-portada.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-portada";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const recorrer = async (p) => {
  const alto = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(100); }
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
};

try {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  const pedidos = [];
  p.on("request", (r) => pedidos.push(r.url()));
  await p.goto(B, { waitUntil: "networkidle" });
  await recorrer(p);
  const texto = await p.locator("main").innerText();
  exigir(/agencia\s+creativa\./i.test(await p.locator("h1").innerText()), "el titular dice «Agencia creativa.»");
  exigir(/hechos por dos personas que lo han hecho muchas veces/.test(texto), "la bajada es la que eligió Jay");
  exigir(await p.locator("[data-pieza]").count() === 12, "hay doce trabajos");
  exigir(await p.locator("[data-pieza] img").count() === 8, "ocho trabajos llevan captura");
  exigir(await p.evaluate(() => [...document.images].every((i) => i.naturalWidth > 0)), "todas las imágenes cargan");
  exigir(!(await p.locator("[data-pieza=null]").count()) && !/\bNULL\b/.test(texto), "NULL no aparece");
  exigir(await p.locator("[data-pieza=terreno] a").count() === 0 && !/shineray/i.test(texto), "A Todo Terreno va sin enlace y sin la marca del cliente");
  exigir(!/operaciones[^.]*coresolutions/i.test(await p.locator("[data-pieza=operaciones]").innerText()), "la plataforma de operaciones no nombra a la empresa");
  const menu = await p.locator("header nav[aria-label=Principal] a").allInnerTexts();
  exigir(["TRABAJO", "QUÉ HACEMOS", "NOSOTROS", "CÓMO TRABAJAMOS", "CONTACTO"].every((x) => menu.some((m) => m.toUpperCase() === x)) && !menu.some((m) => /sala|equipo|sistema/i.test(m)), "el menú es Trabajo, Qué hacemos, Nosotros, Cómo trabajamos y Contacto");
  for (const id of ["trabajo", "servicios", "nosotros", "como", "precios"]) exigir(await p.locator(`#${id}`).count() === 1, `existe la sección #${id}`);
  exigir((texto.match(/inteligencia artificial/gi) ?? []).length === 1 && !/agentes?\b/i.test(texto), "la IA se nombra una sola vez y no se habla de agentes");
  exigir(!/cuenca/i.test(texto + (await p.locator("footer").innerText())), "no se nombra una ciudad");
  exigir(/Desde USD 390/i.test(texto) && /Desde USD 900/i.test(texto) && /Desde USD 19 al mes/i.test(texto), "los tres precios están a la vista");
  exigir(!pedidos.some((u) => /three|Lienzo/i.test(u)), "la portada no descarga el 3D");
  await p.locator("header nav[aria-label=Principal] a", { hasText: /^Nosotros$/i }).click();
  await p.waitForTimeout(900);
  exigir(await p.evaluate(() => { const r = document.querySelector("#nosotros").getBoundingClientRect(); return r.top < 200 && r.bottom > 0; }), "el menú lleva a la sección");
  await p.screenshot({ path: join(capturas, "portada-1440.png"), fullPage: true });

  await p.goto(`${B}/en`, { waitUntil: "networkidle" });
  const en = await p.locator("main").innerText();
  exigir(/creative\s+agency\./i.test(await p.locator("h1").innerText()) && /From USD 390/i.test(en) && await p.locator("[data-pieza]").count() === 12, "la versión en inglés tiene titular, precios y los doce trabajos");
  exigir(!/\b(Trabajo|Nosotros|Desde)\b/.test(en), "la versión en inglés no deja textos en español");

  await p.goto(`${B}/contacto`, { waitUntil: "networkidle" });
  exigir(!/atlas/i.test(await p.locator("main").innerText()), "el contacto ya no habla de Atlas");
  await ctx.close();

  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await cel.newPage();
  m.on("pageerror", (e) => fallas.push(`error en la página (celular): ${e.message}`));
  await m.goto(B, { waitUntil: "networkidle" });
  await recorrer(m);
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "en celular nada se sale de la pantalla");
  await m.locator("header button").click();
  exigir(await m.locator("#menu-movil a").count() >= 5 && !/cuenca/i.test(await m.locator("#menu-movil").innerText()), "el menú del celular abre con las cinco secciones");
  await m.locator("#menu-movil a", { hasText: /Qué hacemos/i }).click();
  await m.waitForTimeout(900);
  exigir(await m.locator("#menu-movil").count() === 0 && await m.evaluate(() => document.querySelector("#servicios").getBoundingClientRect().top < 300), "tocar una sección cierra el menú y lleva a ella");
  await m.screenshot({ path: join(capturas, "portada-390.png"), fullPage: true });
  await cel.close();
} catch (e) {
  fallas.push(`la prueba se cayó: ${e.message}`);
  console.log(`✗ la prueba se cayó: ${e.message}`);
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
