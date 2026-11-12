// Criterio de la casa (sistema/54): se edita en el estudio, se guarda en la nube y le llega al agente con su oficio.
// Antes: nube.sh y luego oficio.ts (con las variables de nube). Uso: node scripts/pruebas/e2e-oficio.mjs
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
const B = "http://127.0.0.1:3100", T = process.env.PRUEBAS ?? "/tmp/anonymo-pruebas";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const marca = "Siempre tipografía con carácter y nada de tazas como ícono " + Date.now();
await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
await p.click("summary:has-text('Mejorar el estudio')"); await p.click("text=Criterio de la casa"); await p.waitForURL(/criterio/); await p.waitForLoadState("networkidle");
console.log("saben:", await p.locator("details summary").count(), "disciplinas y rubros");
await p.fill("#criterio", marca);
await p.click("button:has-text('Guardar criterio')");
console.log("bloquea al guardar:", await p.locator("[data-aviso-trabajo]").waitFor({ timeout: 3000 }).then(() => true, () => false));
await p.getByText("Criterio guardado").first().waitFor({ timeout: 20000 });
console.log("guardado: aviso visible");
await p.reload(); console.log("queda guardado:", (await p.inputValue("#criterio")) === marca);
await p.screenshot({ path: `${T}/criterio.png`, fullPage: true });
// El proyecto de naming arranca solo (rescate) y el agente recibe el oficio y el criterio.
await p.goto(`${B}/estudio/oficio-cafe`); await p.waitForLoadState("networkidle");
let visto = false;
for (let i = 0; i < 40 && !visto; i++) {
  await p.waitForTimeout(2000);
  const log = existsSync(`${T}/pedidos-ia.jsonl`) ? readFileSync(`${T}/pedidos-ia.jsonl`, "utf8") : "";
  visto = log.split("\n").some((l) => l.includes("Estándar de oficio: Naming") && l.includes(marca) && l.includes("Restaurantes y caf"));
}
console.log("el agente recibió oficio + rubro + criterio:", visto);
await nav.close();
if (!visto) process.exit(1);
