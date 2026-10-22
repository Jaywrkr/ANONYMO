// Jurado automático: accesibilidad (axe) y Lighthouse en cada página.
// Uso: npm run build && npm run start (en otra terminal) → node scripts/jurado.mjs [url-base]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import lighthouse from "lighthouse";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const PAGINAS = ["/", "/agentes", "/agentes/kine", "/proceso", "/sala", "/casos", "/contacto", "/sistema"];
const PUERTO = 9333;

const browser = await chromium.launch({
  args: [`--remote-debugging-port=${PUERTO}`, "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const resultados = [];

for (const ruta of PAGINAS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const axe = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
  await ctx.close();

  const lh = await lighthouse(BASE + ruta, {
    port: PUERTO,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    throttlingMethod: "provided",
  });
  const c = lh.lhr.categories;
  const nota = (k) => Math.round((c[k]?.score ?? 0) * 100);
  resultados.push({
    ruta,
    lighthouse: { rendimiento: nota("performance"), accesibilidad: nota("accessibility"), practicas: nota("best-practices"), seo: nota("seo") },
    axe: axe.violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length, ayuda: v.help })),
    fallasLighthouse: Object.values(lh.lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && ["accessibility", "seo", "best-practices"].some((k) => c[k].auditRefs.some((r) => r.id === a.id && r.weight > 0)))
      .map((a) => a.title),
  });
  console.log(ruta, resultados.at(-1).lighthouse, `axe: ${axe.violations.length}`);
}
await browser.close();

mkdirSync("../../docs/jurado", { recursive: true });
writeFileSync("../../docs/jurado/automatico.json", JSON.stringify(resultados, null, 2));
console.log("Guardado en docs/jurado/automatico.json");
