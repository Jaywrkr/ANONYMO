// A prueba de fallos (sistema/78), con nube.sh levantado. Levanta un Google falso en 45999 que dice «se acabó el cupo».
// Comprueba: el mensaje claro de Imán, la página «Estado del sistema», la copia manual y la copia diaria protegida.
// Uso: node scripts/pruebas/e2e-estado.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-estado";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const google = createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    res.writeHead(429, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: 429, message: "Quota exceeded for quota metric 'SearchTextRequest per day'", status: "RESOURCE_EXHAUSTED" } }));
  });
}).listen(45999, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Se acabó el cupo de Google: Imán lo dice claro y queda anotado.
  await p.goto(`${B}/estudio/clientes/nuevos`);
  await p.waitForSelector("button:has-text('Que Imán busque')");
  for (const g of ["Salud", "Legal y contable", "Belleza y bienestar"]) await p.click(`button[aria-pressed=true]:has-text('${g}')`);
  await p.fill("input[placeholder^='Otras búsquedas']", "veterinaria");
  await p.click("button:has-text('Que Imán busque')");
  exigir(await espera(p.locator("[role=status]:has-text('Se acabó el cupo de búsquedas de Google por hoy')"), 30000), "sin cupo, Imán lo dice en palabras simples");

  // 2 · La página de estado.
  await p.click("aside summary:has-text('Mejorar el estudio')");
  await p.click("aside >> text=Estado del sistema");
  await p.waitForURL(/estudio\/estado$/);
  const estado = p.locator("ul[aria-label=Estado]");
  exigir(await espera(estado), "Estado del sistema abre desde «Mejorar el estudio»");
  const texto = await estado.innerText();
  exigir(/Nube privada/.test(texto) && /Responde en \d+ ms/.test(texto), "dice que la nube responde");
  exigir(/Google Maps/.test(texto) && /1 de 200 consultas hoy/.test(texto), "cuenta lo que se gastó de Google hoy");
  exigir(/Avisos al celular/.test(texto) && /0 celulares anotados/.test(texto), "dice cuántos celulares reciben avisos");
  exigir(/Copia diaria/.test(texto) && /Todavía no hay ninguna copia/.test(texto), "dice que todavía no hay copia");
  exigir(/Buscar en Google/.test(await p.locator("ul[aria-label=Errores]").innerText()), "y lista lo último que falló");
  exigir(/necesita|necesitan atención/.test(await p.locator("h1").innerText()), "el titular dice cuántas cosas necesitan atención");

  // 3 · Copia manual.
  await p.click("button:has-text('Hacer una copia ahora')");
  exigir(await espera(p.locator("[role=status]:has-text('Copia hecha')")), "la copia manual dice qué hizo");
  await p.reload();
  exigir(/Última recién/.test(await p.locator("ul[aria-label=Estado]").innerText()), "y queda como la última copia");
  await p.screenshot({ path: join(capturas, "estado.png"), fullPage: true });

  // 4 · La copia diaria solo con la clave de Vercel.
  const sin = await fetch(`${B}/api/respaldo`);
  exigir(sin.status === 401, "la copia diaria no se abre sin la clave");
  const con = await fetch(`${B}/api/respaldo`, { headers: { authorization: "Bearer cron-de-prueba-solo-local" } });
  const j = await con.json().catch(() => ({}));
  exigir(con.status === 200 && /^dia-\d{2}$/.test(j.ranura ?? ""), `con la clave, copia (${con.status} ${j.ranura})`);

  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await ctx.storageState() });
  const m = await cel.newPage();
  await m.goto(`${B}/estudio/estado`);
  exigir((await m.evaluate(() => document.documentElement.scrollWidth)) <= 392, "Estado cabe en celular");
  await cel.close();

  // Criterio propuesto (sistema/79): se lee y se aplica con un botón.
  await p.goto(`${B}/estudio/criterio`);
  const prop = p.locator("details[data-propuesta]");
  await prop.locator("summary").click();
  exigir(await prop.locator("li").count() === 10, "la propuesta de criterio trae 10 reglas");
  await prop.locator("button:has-text('Usar esta propuesta')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Criterio guardado')")), "usarla dice qué pasó");
  exigir((await p.locator("#criterio").inputValue()).startsWith("1. La tipografía hace el trabajo") && await prop.count() === 0, "y queda como el criterio de la casa");
} catch (e) {
  fallas.push(`se cortó: ${e.message}`);
  await p.screenshot({ path: join(capturas, "error.png") }).catch(() => {});
} finally {
  await nav.close();
  google.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}` : "\nTodo bien.");
process.exit(fallas.length ? 1 : 0);
