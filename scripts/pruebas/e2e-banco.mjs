// Banco de calibración (sistema/55): referencias por disciplina y nivel con miniaturas privadas, filtro por rubro,
// rúbrica, cambiar nota/quitar/volver a poner (pide recalibrar), calibrar al juez y comparar una entrega a ciegas.
// Antes: nube.sh y luego banco.ts (con las variables de nube). Uso: node scripts/pruebas/e2e-banco.mjs
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100", T = process.env.PRUEBAS ?? "/tmp/anonymo-pruebas";
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const ok = (c, m) => { console.log(c ? "✓" : "✗", m); if (!c) process.exitCode = 1; };
const aviso = async (texto) => p.getByText(texto).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
const bloquea = () => p.locator("[data-aviso-trabajo], button[disabled]").first().waitFor({ timeout: 3000 }).then(() => true, () => false);

await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
ok(await p.getByRole("link", { name: "Banco de calibración" }).first().waitFor({ state: "attached", timeout: 15000 }).then(() => true, () => false), "está en el menú");
await p.goto(`${B}/estudio/banco`); await p.waitForLoadState("networkidle");
for (const d of ["Web", "Identidad y logo", "Naming", "Redes y contenido"]) ok(await p.getByRole("link", { name: new RegExp(`^${d} · \\d+`) }).count() === 1, `pestaña ${d}`);
for (const n of ["Premiadas · 9–10", "Correctas pero genéricas · 5–6", "De principiante · 3–4"]) ok(await p.getByText(n).count() > 0, `nivel ${n}`);
ok(await p.getByText("La rúbrica que sale del banco").count() === 1, "muestra la rúbrica");
const srcs = (await p.locator('img[src^="/estudio/banco/imagen/"]').evaluateAll((xs) => xs.map((i) => i.getAttribute("src")))).slice(0, 4);
const tipos = await p.evaluate((xs) => Promise.all(xs.map(async (s) => (await fetch(s)).headers.get("content-type"))), srcs);
ok(srcs.length > 0 && tipos.every((t) => /^image\//.test(t ?? "")), `miniaturas privadas cargan (${srcs.length}: ${tipos.join(",")})`);
const sin = await (await nav.newContext()).newPage();
const r0 = await sin.goto(`${B}/estudio/banco/imagen/web-arq-clinica-dental-corporativa-1440.jpg`);
ok(!(r0.headers()["content-type"] ?? "").startsWith("image/"), "sin sesión las capturas no se ven");

// Filtro por rubro
await p.selectOption('select[name="rubro"]', "salud"); await p.click("button:has-text('Filtrar')"); await p.waitForURL(/rubro=salud/);
const tarjetas = await p.locator("article").count();
ok(tarjetas > 0 && tarjetas < 46, `filtro por rubro: ${tarjetas} tarjetas`);

// Cambiar una nota: bloquea, avisa y pide recalibrar
await p.goto(`${B}/estudio/banco?d=naming`); await p.waitForLoadState("networkidle");
const primera = p.locator("article").first();
const nombre = await primera.locator("p.font-medium").first().innerText();
await primera.locator('input[name="nota"]').fill("4");
await primera.locator("button:has-text('Cambiar')").click();
ok(await bloquea(), "al cambiar la nota bloquea mientras guarda");
ok(await aviso("Nota cambiada"), "avisa que cambió la nota");
ok(await p.getByText("El banco cambió desde la última calibración").count() > 0, "pide recalibrar");
ok(await p.locator("article", { hasText: nombre }).getByText(/Nota cambiada por Jay/).count() === 1, "la tarjeta dice quién la cambió");
// Quitar y volver a poner
await p.locator("article", { hasText: nombre }).locator("button:has-text('Quitar')").click();
ok(await aviso("Referencia quitada"), "quita la referencia");
await p.getByText(/Quitadas del banco · 1/).click();
await p.locator("button:has-text('Volver a poner')").click();
ok(await aviso("Referencia de vuelta"), "la vuelve a poner");

// Calibrar (IA falsa: siempre da 9, así que no llega a la meta y ajusta al juez)
await p.selectOption('select[name="disciplina"]', "naming"); await p.selectOption('select[name="repetir"]', "4");
await p.click("button:has-text('Volver a calibrar')");
ok(await bloquea(), "al calibrar bloquea mientras prepara");
ok(await aviso("Calibración empezada"), "avisa que empezó");
let listo = false;
for (let i = 0; i < 60 && !listo; i++) { await p.waitForTimeout(3000); if (i % 3 === 2) await p.goto(`${B}/estudio/banco?d=naming`); listo = (await p.getByText("Diferencia promedio con la nota de referencia").count()) > 0 && (await p.getByText(/Calibrando · ronda/).count()) === 0; }
ok(listo, "termina y muestra el informe");
ok(await p.getByText(/Informes de cada ronda · [1-9]/).count() === 1, "guarda el informe de cada ronda");
ok(await p.getByText(/Lo que el juez aprendió de las rondas/).count() === 1, "el juez quedó ajustado (no llegó a la meta con un juez que da 9 a todo)");
ok(await p.getByText(/✗/).count() > 0, "dice que no llega a la meta");
ok(await p.getByText("Hacia dónde se equivoca").count() === 1, "muestra hacia dónde se equivoca en cada nivel");
ok(await p.getByText(/Dónde más se equivocó en la ronda/).count() === 1, "muestra las referencias con más error");
ok(await p.getByText(/0\.\d{5,}/).count() === 0, "sin números con decimales infinitos");
await p.screenshot({ path: `${T}/banco.png`, fullPage: true });

// Comparación a ciegas de una entrega nuestra
await p.goto(`${B}/estudio/banco-pan/calidad`); await p.waitForLoadState("networkidle");
await p.click("button:has-text('Comparar con el banco')");
ok(await bloquea(), "al comparar bloquea mientras trabaja");
ok(await aviso("Comparación a ciegas lista"), "avisa que terminó");
await p.screenshot({ path: `${T}/banco-comparar.png`, fullPage: true });
ok(await p.getByText(/Contra [3-5] piezas premiadas:/).count() === 1, "muestra gana/empata/pierde contra piezas de 9");
ok(await p.locator("ol li").count() === 3, "muestra los 3 arreglos");

// Celular
const m = await (await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
await m.goto(`${B}/entrar`); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
await m.goto(`${B}/estudio/banco?d=web`); await m.waitForLoadState("networkidle");
ok(await m.evaluate(() => document.documentElement.scrollWidth <= 392), "en celular no se sale de la pantalla");
await m.screenshot({ path: `${T}/banco-movil.png`, fullPage: false });
await nav.close();
