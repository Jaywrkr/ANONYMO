// Un agente a la vez con la IA lenta: plan, en vivo, revisión, aprobar, detener, reanudar, trabado, celular. Uso: node scripts/pruebas/e2e-paso.mjs <carpeta-capturas>
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100", C = process.argv[2] ?? "/tmp/anonymo-pruebas";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1440, height: 960 } });
// Notificaciones del navegador: se registran para comprobar que el vigía avisa.
await ctx.addInitScript(() => {
  window.__avisos = [];
  window.Notification = class { static permission = "granted"; static requestPermission = async () => "granted"; constructor(t, o) { window.__avisos.push(t + " | " + (o?.body ?? "")); } close() {} };
});
const p = await ctx.newPage();
const errores = [], fallos = [];
p.on("pageerror", (e) => errores.push(new URL(p.url()).pathname + " → " + e.message));
p.on("response", (r) => { if (r.status() >= 500) fallos.push(`${r.status()} ${r.url()}`); });
let n = 0;
const t0 = Date.now(); const seg = () => `${Math.round((Date.now() - t0) / 1000)}s`;
const paso = async (nombre, fn) => { try { await fn(); console.log("✓", seg(), nombre); } catch (e) { console.log("✗", seg(), nombre, "→", e.message.split("\n")[0]); await p.screenshot({ path: `${C}/error-${++n}.png`, fullPage: true }).catch(() => {}); } };
const foto = (x, full = true) => p.screenshot({ path: `${C}/${x}.png`, fullPage: full });
const ahora = () => p.locator("section[aria-label=Ahora]").innerText().catch(() => "");

await paso("entrar", async () => { await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(`${B}/estudio`); });
await paso("plan: elegir modo y ver orden", async () => {
  await p.goto(`${B}/estudio/cafe-lento`); await p.waitForLoadState("networkidle");
  await p.click("text=En qué orden trabajan"); await foto("01-plan");
  if (!(await p.locator('input[name="modo"][value="paso"]').isChecked())) throw new Error("paso no viene marcado");
});
await paso("que empiecen vuelve al momento (no espera al agente)", async () => {
  const t = Date.now(); await p.click("button:has-text('Que empiecen')"); await p.waitForURL(/cafe-lento\?|cafe-lento$/); await p.waitForLoadState("networkidle");
  console.log("   volvió en", Date.now() - t, "ms ·", (await ahora()).replace(/\n+/g, " | ").slice(0, 120));
});
await paso("en vivo: señal, palabras y fase del agente", async () => {
  await p.locator("text=/palabras/").first().waitFor({ timeout: 30000 }); await p.waitForTimeout(2500);
  const fila = await p.locator("li", { hasText: /palabras/ }).first().innerText(); console.log("   fila:", fila.replace(/\n+/g, " | "));
  if (!/señal hace \d+ s/.test(fila)) throw new Error("sin señal");
  await foto("02-en-vivo", false);
});
await paso("el agente se alarga: sigue en otra vuelta y entrega (revisión)", async () => {
  await p.locator("text=/entregó/").first().waitFor({ timeout: 120000 });
  console.log("   ahora:", (await ahora()).replace(/\n+/g, " | ").slice(0, 200)); await foto("03-revision");
  console.log("   avisos del navegador:", await p.evaluate(() => window.__avisos));
});
await paso("leer la entrega y aprobar al final", async () => {
  await p.click("text=Leer la entrega →"); await p.waitForURL(/cafe-lento\/\d-/); await p.locator("#decidir").scrollIntoViewIfNeeded(); await foto("04-entrega-decidir");
  const contenido = await p.locator(".entrega").innerText(); console.log("   contenido:", contenido.slice(0, 60).replace(/\n/g, " "), "…", contenido.slice(-40).replace(/\n/g, " "));
  await p.locator("#decidir button:has-text('Aprobar y seguir')").click(); await p.waitForURL(/cafe-lento(\?|$)/); await p.waitForLoadState("networkidle");
  console.log("   aviso:", await p.locator('div.fixed[role="status"]').last().innerText().catch(() => "—"));
});
await paso("aprobar dos veces no da error", async () => {
  await p.goBack(); await p.waitForLoadState("networkidle");
  const b = p.locator("#decidir button:has-text('Aprobar y seguir')");
  if (await b.count()) { await b.click(); await p.waitForLoadState("networkidle"); console.log("   aviso:", await p.locator('div.fixed[role="status"], div.fixed[role="alert"]').last().innerText().catch(() => "—")); }
  else console.log("   (la página ya no ofrece aprobar)");
  await p.goto(`${B}/estudio/cafe-lento`);
});
await paso("detener mientras trabaja", async () => {
  await p.locator("text=/está trabajando|está por empezar/").first().waitFor({ timeout: 30000 });
  await p.click("button:has-text('Detener')"); await p.locator("dialog[open]").waitFor(); await p.locator("dialog[open] button", { hasText: /^Detener$/ }).click();
  await p.waitForLoadState("networkidle"); await p.locator("text=/en pausa/i").first().waitFor({ timeout: 15000 });
  await p.waitForTimeout(40000); await p.reload(); await p.waitForLoadState("networkidle");
  console.log("   tras 40 s:", (await ahora()).replace(/\n+/g, " | ").slice(0, 120)); await foto("05-detenido");
  if (!/pausa/i.test(await ahora())) throw new Error("se reanudó solo");
});
await paso("reanudar sigue desde donde quedó", async () => {
  await p.click("button:has-text('Reanudar')"); await p.waitForLoadState("networkidle");
  await p.locator("text=/entregó|está trabajando|está por empezar/").first().waitFor({ timeout: 60000 });
  console.log("   ahora:", (await ahora()).replace(/\n+/g, " | ").slice(0, 140));
});
await paso("trabado: se ve «se detuvo» y Continuar lo retoma", async () => {
  await p.goto(`${B}/estudio/hotel-cuenca`); await p.waitForLoadState("networkidle");
  console.log("   ahora:", (await ahora()).replace(/\n+/g, " | ").slice(0, 140)); await foto("06-trabado");
  const fila = await p.locator("li", { hasText: "Orla" }).first().innerText(); console.log("   fila Orla:", fila.replace(/\n+/g, " | "));
  await p.locator("section[aria-label=Ahora] button:has-text('Continuar')").click(); await p.waitForLoadState("networkidle");
  await p.locator("text=/palabras|está trabajando|está por empezar/").first().waitFor({ timeout: 30000 });
  console.log("   tras continuar:", (await ahora()).replace(/\n+/g, " | ").slice(0, 140));
});
await paso("móvil: revisión", async () => {
  await p.goto(`${B}/estudio/cafe-lento`); await p.locator("text=/entregó/").first().waitFor({ timeout: 120000 });
  await p.setViewportSize({ width: 390, height: 844 }); await p.reload(); await p.waitForLoadState("networkidle"); await foto("07-movil", false);
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth); if (ancho > 392) throw new Error("scroll horizontal " + ancho);
});
console.log("errores:", errores.length ? errores : "ninguno"); console.log("5xx:", fallos.length ? fallos : "ninguno");
await nav.close();
