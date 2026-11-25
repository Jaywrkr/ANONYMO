// La pantalla del plan, ordenada por importancia (sistema/111): cifras, entregas, decisión, preguntas y lo demás plegado.
// Con nube.sh recién levantado (cafe-lento está en plan). Uso: node scripts/pruebas/e2e-plan.mjs [carpeta-capturas]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const B = "http://127.0.0.1:3100", C = process.argv[2] ?? "/tmp/anonymo-pruebas/plan";
mkdirSync(C, { recursive: true });
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const fallas = [];
const exigir = (ok, texto) => { console.log(ok ? "✓" : "✗", texto); if (!ok) fallas.push(texto); };
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  await p.goto(`${B}/estudio/cafe-lento`); await p.waitForLoadState("networkidle");
  const plan = p.locator("section[aria-label='Plan de Atlas']");
  exigir(await plan.isVisible(), "el plan se ve");
  // 1 · En orden de importancia.
  const orden = await plan.evaluate((s) => ["data-plan-cifras", "data-plan-entregas", "data-plan-decidir"].map((a) => s.querySelector(`[${a}]`)?.getBoundingClientRect().top ?? -1));
  exigir(orden.every((y) => y >= 0) && orden[0] < orden[1] && orden[1] < orden[2], `cifras, luego entregas, luego la decisión (${orden.map(Math.round).join(" < ")})`);
  exigir(/entregas?/.test(await plan.locator("[data-plan-cifras]").innerText()) && /US\$/.test(await plan.locator("[data-plan-cifras]").innerText()), "arriba: cuántas entregas y cuánto cuesta");
  exigir(await plan.locator("[data-entrega]").count() > 0 && await plan.locator("[data-entrega] img").count() > 0, "cada entrega con la cara de quien la hace");
  // 2 · La decisión junta: modo, «Que empiecen» y «Ajustar el plan».
  const decidir = plan.locator("[data-plan-decidir]");
  exigir(await decidir.locator("input[name=modo][value=paso]").isChecked(), "«Uno a la vez» viene elegido");
  exigir(await decidir.locator("button:has-text('Que empiecen')").isVisible() && await decidir.locator("button:has-text('Ajustar el plan')").first().isVisible(), "«Que empiecen» y «Ajustar el plan» lado a lado");
  exigir(!(await p.locator("#ajuste").isVisible()), "la caja del ajuste empieza cerrada");
  await decidir.locator("button:has-text('Ajustar el plan')").first().click();
  await p.locator("#ajuste").waitFor({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(150);
  console.log("   ajuste visible:", await p.locator("#ajuste").isVisible(), "· foco:", await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
  exigir(await p.locator("#ajuste").isVisible() && await p.evaluate(() => document.activeElement?.id === "ajuste"), "«Ajustar el plan» abre la caja ahí mismo, con el cursor adentro");
  // 3 · Lo demás, plegado.
  for (const t of ["Qué debe cumplir", "En qué orden trabajan", "El pedido completo"]) exigir(await plan.locator(`summary:has-text('${t}')`).count() === 1, `«${t}» va plegado al final`);
  await p.screenshot({ path: `${C}/1-plan.png`, fullPage: true });
  // 4 · Las preguntas se responden ahí mismo.
  const preg = plan.locator("[data-plan-preguntas]");
  if (await preg.count()) {
    const antes = await preg.locator("input[name^=r]").count();
    await preg.locator("input[name=r0]").fill("Personas de 25 a 40 que trabajan cerca.");
    await preg.locator("button:has-text('Guardar respuestas')").click();
    await p.locator("[role=status]").first().waitFor({ timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const despues = await p.locator("[data-plan-preguntas] input[name^=r]").count();
    exigir(despues === antes - 1, `la pregunta respondida se va de la lista (${antes} → ${despues})`);
  } else exigir(true, "sin preguntas pendientes");
  await ctx.close();
  // 5 · Celular: cabe y se usa.
  const m = await (await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await m.goto(`${B}/entrar`); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
  await m.goto(`${B}/estudio/cafe-lento`); await m.waitForLoadState("networkidle");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "en celular nada se sale de la pantalla");
  const alto = await m.locator("[data-plan-decidir] button:has-text('Que empiecen')").boundingBox();
  exigir(!!alto && alto.height >= 44, "«Que empiecen» se toca bien con el dedo");
  await m.screenshot({ path: `${C}/2-celular.png`, fullPage: true });
} catch (e) {
  exigir(false, `la prueba se cayó: ${e.message.split("\n")[0]}`);
} finally {
  await nav.close();
  console.log(fallas.length ? `\n${fallas.length} falla(s)` : "\nTodo bien");
  process.exitCode = fallas.length ? 1 : 0;
}
