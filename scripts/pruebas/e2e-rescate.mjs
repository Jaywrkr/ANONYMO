// Arranque perdido: el proyecto queda en curso sin nadie trabajando y la página lo arranca sola; luego aprobar bloquea la pantalla y la página se pone al día (sistema/44).
// Antes: e2e-nuevo.mjs y luego: node --experimental-strip-types scripts/pruebas/perdido.ts (con las variables de nube de nube.sh). Esperar 22 s.
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await nav.newContext()).newPage();
await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
await p.goto(`${B}/estudio/gabriela-abril`); await p.waitForLoadState("networkidle");
console.log("antes:", (await p.locator("section[aria-label=Ahora]").innerText()).replace(/\n+/g, " | ").slice(0, 120));
const t = Date.now();
await p.locator("text=/entregó/").first().waitFor({ timeout: 90000 });
console.log(`entregó solo en ${Math.round((Date.now() - t) / 1000)} s:`, (await p.locator("section[aria-label=Ahora]").innerText()).replace(/\n+/g, " | ").slice(0, 120));
const t2 = Date.now();
await p.route("**/*", async (r) => { if (r.request().method() === "POST" && r.request().url().includes("/estudio/")) await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
await p.click("button:has-text('Aprobar y seguir')");
console.log("aviso bloqueando al aprobar:", await p.locator("[data-aviso-trabajo]").waitFor({ timeout: 3000 }).then(() => true, () => false));
await p.waitForURL(/ok=/); await p.waitForLoadState("networkidle");
console.log("tras aprobar:", (await p.locator("section[aria-label=Ahora]").innerText()).replace(/\n+/g, " | ").slice(0, 120));
for (let i = 0; i < 6; i++) { await p.waitForTimeout(1500); console.log("  ahora:", (await p.locator("section[aria-label=Ahora]").innerText()).replace(/\n+/g, " | ").slice(0, 110)); }
await p.locator("text=/Sonda entregó/").first().waitFor({ timeout: 60000 });
console.log("Sonda entregó en", Math.round((Date.now() - t2) / 1000), "s sin recargar");
await nav.close();
