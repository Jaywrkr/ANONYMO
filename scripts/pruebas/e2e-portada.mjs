// La portada de Unmake (sistema/102), con nube.sh levantado. Solo lee la web pública: no escribe nada.
// Comprueba que la portada es la web nueva, que nada dice el nombre anterior, que las páginas viejas llevan a la portada,
// el laboratorio, el caso de proyecto y el ancho de celular. Uso: node scripts/pruebas/e2e-portada.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-portada";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

try {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(B, { waitUntil: "load" });
  await p.waitForTimeout(2600);
  exigir(/Unmake/.test(await p.title()), "la portada es la web de Unmake");
  const texto = await p.locator("body").innerText();
  exigir(!/anonymo/i.test(texto) && !/anonymo/i.test(await p.content()), "nada dice el nombre anterior");
  exigir(/Estudio de diseño, tecnología y comunicación/.test(texto) && /trabajo seleccionado/i.test(await p.locator("#trabajo h2").getAttribute("aria-label") ?? ""), "se presenta como estudio y muestra su trabajo");
  exigir(await p.locator("#heroC").count() === 1 && await p.locator("#endC").count() === 1, "el logo se desarma arriba y se arma al final");
  exigir(!/\$\s?\d|USD/.test(texto), "no hay precios en la portada");
  await p.screenshot({ path: join(capturas, "portada-1440.png") });

  // El caso de proyecto se abre desde la lista y se cierra con Escape.
  await p.locator("#trabajo").scrollIntoViewIfNeeded();
  await p.locator(".row").first().click();
  await p.waitForSelector("#case.open");
  exigir(/Nuestra propia marca/.test(await p.locator("#ctext").innerText()), "al tocar un proyecto se abre su caso");
  await p.waitForTimeout(900);
  await p.keyboard.press("Escape");
  await p.waitForSelector("#case.open", { state: "detached", timeout: 4000 }).catch(() => {});
  exigir(await p.locator("#case.open").count() === 0, "y se cierra con Escape");

  // Las páginas de la web anterior llevan a la portada.
  for (const ruta of ["/agentes", "/agentes/atlas", "/casos", "/proceso", "/sistema", "/en", "/en/casos", "/unmake"]) {
    const r = await fetch(B + ruta, { redirect: "manual" });
    exigir([307, 308].includes(r.status) && new URL(r.headers.get("location"), B).pathname === "/", `${ruta} lleva a la portada`);
  }

  // El laboratorio.
  await p.goto(`${B}/lab`, { waitUntil: "load" });
  await p.waitForTimeout(1200);
  exigir(await p.locator(".card").count() === 16, "el laboratorio tiene sus 16 piezas");
  exigir(!/anonymo/i.test(await p.content()), "y tampoco dice el nombre anterior");

  // Una página que no existe y el contacto usan el marco nuevo.
  await p.goto(`${B}/no-existe-esta-pagina`);
  exigir(/se desarmó/.test(await p.locator("h1").innerText()) && await p.locator("header svg[aria-label='unmake.']").count() === 1, "la página no encontrada lleva el logo nuevo");
  await p.goto(`${B}/contacto`);
  exigir(await p.locator("header svg[aria-label='unmake.']").count() === 1 && !/anonymo/i.test(await p.locator("body").innerText()), "el contacto lleva el logo nuevo");
  await p.screenshot({ path: join(capturas, "contacto-1440.png") });
  await ctx.close();

  // Celular: nada se sale de la pantalla.
  const cel = await nav.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const m = await cel.newPage();
  m.on("pageerror", (e) => fallas.push(`error en celular: ${e.message}`));
  await m.goto(B, { waitUntil: "load" });
  await m.waitForTimeout(2600);
  exigir(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "en celular la portada no se desborda");
  await m.screenshot({ path: join(capturas, "portada-390.png") });
  await m.goto(`${B}/lab`, { waitUntil: "load" });
  await m.waitForTimeout(800);
  exigir(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "ni el laboratorio");
  await cel.close();
} finally {
  await nav.close();
}
if (fallas.length) { console.error(`\n${fallas.length} fallas`); process.exit(1); }
console.log("\nTodo bien.");
