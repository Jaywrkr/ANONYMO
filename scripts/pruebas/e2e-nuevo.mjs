// Crear un proyecto nuevo con archivo y comprobar que queda guardado en la nube (sistema/43). Uso: node scripts/pruebas/e2e-nuevo.mjs scripts/pruebas/imagen.png
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await nav.newContext()).newPage();
await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
await p.goto(`${B}/estudio/nuevo`); await p.waitForLoadState("networkidle");
await p.fill('textarea[name="texto"]', "Gabriela Abril es odontóloga en Cuenca, especialista en estética dental. Quiere una web elegante y bilingüe.");
await p.click("text=+ Ya tiene logo y colores").catch(() => {});
// La frase rápida devuelve el cursor a la caja de texto en el cuadro siguiente: se espera antes de escribir el cliente
// (si no, a veces «Gabriela Abril» caía en la caja de texto y Atlas no encontraba el cliente).
await p.waitForTimeout(300);
await p.fill('input[name="cliente"]', "Gabriela Abril");
await p.setInputFiles('input[type="file"]', process.argv[2]); await p.waitForFunction(() => /listo/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
await p.click("button:has-text('Que Atlas arme el plan')");
await p.waitForURL((u) => /estudio\/gabriela|error=/.test(u.toString()), { timeout: 120000 }); await p.waitForLoadState("networkidle");
console.log("url:", decodeURIComponent(p.url())); if (!/estudio\/gabriela/.test(p.url())) process.exitCode = 1; // sin proyecto, las pruebas que siguen no tienen con qué trabajar console.log("alerta:", await p.locator("[role=alert]").allInnerTexts());
console.log("titulo:", (await p.locator("h1").first().innerText().catch(() => "?")).slice(0, 80));
const q = await (await nav.newContext({ storageState: await p.context().storageState() })).newPage(); await q.goto(`${B}/estudio`); await q.waitForLoadState("networkidle"); const enLista = /Gabriela/.test(await q.locator("body").innerText()); console.log("lista tiene gabriela:", enLista); if (!enLista) process.exitCode = 1;
await nav.close();
