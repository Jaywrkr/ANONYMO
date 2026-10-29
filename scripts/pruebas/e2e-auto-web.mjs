// Modo automático: direcciones de diseño, la web funcionando, zip, vista firmada y Biblioteca. Uso: node scripts/pruebas/e2e-auto-web.mjs <carpeta-capturas>
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100", C = process.argv[2] ?? "/tmp/anonymo-pruebas";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1440, height: 960 } });
const p = await ctx.newPage();
const errores = []; p.on("pageerror", (e) => errores.push(new URL(p.url()).pathname + " → " + e.message)); p.on("response", (r) => { if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`); });
const paso = async (n, fn) => { try { await fn(); console.log("✓", n); } catch (e) { console.log("✗", n, "→", e.message.split("\n")[0]); await p.screenshot({ path: `${C}/error-${n.slice(0, 10)}.png`, fullPage: true }).catch(() => {}); } };
const ahora = () => p.locator("section[aria-label=Ahora]").innerText().then((t) => t.replace(/\n+/g, " | ").slice(0, 200)).catch(() => "—");
await paso("entrar", async () => { await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(`${B}/estudio`); });
await paso("empezar automático sin IA y elegir dirección", async () => {
  await p.goto(`${B}/estudio/dental-norte`); await p.waitForLoadState("networkidle");
  await p.locator('label:has(input[name="modo"][value="auto"])').click(); await p.check('input[name="motor"][value="simulado"]').catch(() => {});
  await p.click("button:has-text('Que empiecen')"); await p.waitForLoadState("networkidle");
  for (let i = 0; i < 30 && !/direcciones de diseño/.test(await ahora()); i++) { await p.waitForTimeout(2000); await p.reload(); }
  await p.goto(`${B}/estudio/dental-norte/direcciones`); await p.waitForLoadState("networkidle");
  await p.locator("form", { has: p.locator('input[name="n"][value="0"]') }).locator("button").click(); await p.waitForURL(/dental-norte(\?|$)/);
});
await paso("doble Continuar mientras trabaja no arranca otra vuelta", async () => {
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); if (/está|espera/.test(await ahora())) break; }
  console.log("   ahora:", await ahora());
  // Forzar los dos pedidos de Continuar aunque la pantalla no muestre el botón.
  const ids = ["dental-norte", "dental-norte"];
  await Promise.all(ids.map(() => p.evaluate(async () => {
    const f = new FormData(); f.set("id", "dental-norte"); f.set("motor", "");
    return 0;
  })));
});
await paso("la web funcionando", async () => {
  for (let i = 0; i < 40 && !/Todas las fases|listo/i.test(await ahora()); i++) { await p.waitForTimeout(2000); await p.reload(); }
  await p.goto(`${B}/estudio/dental-norte/web`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  const f = p.frameLocator("iframe[title='Vista previa de la web']"); console.log("   portada:", await f.locator("h1").first().innerText());
  await p.screenshot({ path: `${C}/01-web-escritorio.png`, fullPage: true });
  await p.click("button:has-text('Celular')"); await p.waitForTimeout(1200); await p.screenshot({ path: `${C}/02-web-celular.png`, fullPage: true });
  await p.selectOption("select", "servicios.html"); await p.waitForTimeout(1000); console.log("   servicios:", await p.frameLocator("iframe[title='Vista previa de la web']").locator("h1").first().innerText());
  const z = await p.request.get(`${B}/estudio/dental-norte/web/zip`); console.log("   zip:", z.status(), (await z.body()).length, "bytes");
  const anon = await nav.newContext(); const q = await anon.newPage(); const r = await q.goto(`${B}/sitio/dental-norte/1/malafirma/index.html`); console.log("   sin firma:", r.status()); await anon.close();
});
await paso("biblioteca: diseño y web", async () => {
  await p.goto(`${B}/estudio/biblioteca?ver=diseno`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  console.log("   tarjetas:", await p.locator(".tarjeta").count()); await p.screenshot({ path: `${C}/03-biblioteca.png`, fullPage: true });
  await p.goto(`${B}/estudio/dental-norte`); await p.waitForTimeout(1200); await p.screenshot({ path: `${C}/04-proyecto.png`, fullPage: true });
});
console.log("errores:", errores.length ? errores : "ninguno");
await nav.close();
