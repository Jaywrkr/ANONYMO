// Navegación sin perderse (sistema/68), con nube.sh levantado. Comprueba las reglas 1 y 2 de docs/experiencia.md:
// toda acción vuelve a la pestaña desde donde se envió y Atrás lleva a la vista anterior, no a un aviso.
// También el menú con el Taller y la barra de celular (Inicio, Clientes, nuevo pedido, Video, Atlas) sin salirse de 390 px.
// Uso: node scripts/pruebas/e2e-navegacion.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-navegacion";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const busqueda = (p) => new URL(p.url()).searchParams;
const aviso = (p, texto) => p.locator(`[role=status]:has-text("${texto}"), [role=alert]:has-text("${texto}")`).first().waitFor({ timeout: 30000 }).then(() => true, () => false);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Pausar y reanudar desde Ajustes: se queda en Ajustes.
  await p.goto(`${B}/estudio/cafe-lento?ver=archivos`);
  await p.click("a:has-text('Ajustes')");
  await p.waitForURL(/ver=ajustes/);
  await p.click("button:has-text('Pausar el proyecto')");
  await p.locator("dialog[open] button:has-text('Pausar')").click();
  exigir(await aviso(p, "Proyecto en pausa"), "pausar dice qué pasó");
  exigir(busqueda(p).get("ver") === "ajustes", `después de pausar sigue en Ajustes (${p.url().replace(B, "")})`);
  await p.waitForFunction(() => !location.search.includes("ok="), null, { timeout: 10000 }).catch(() => {});
  exigir(!busqueda(p).has("ok"), "el aviso no se queda en la dirección");
  await p.locator("form button:has-text('Reanudar')").first().click();
  exigir(await aviso(p, "Proyecto reanudado"), "reanudar dice qué pasó");
  exigir(busqueda(p).get("ver") === "ajustes", "después de reanudar sigue en Ajustes");

  // 2 · Atrás vuelve a la pestaña anterior, no a un aviso ni a la misma pestaña.
  await p.goBack();
  await p.waitForLoadState("networkidle");
  exigir(busqueda(p).get("ver") === "archivos" && !busqueda(p).has("ok"), `Atrás vuelve a Archivos (${p.url().replace(B, "")})`);

  // 3 · Cambiar quién aprueba una fase desde Ajustes: se queda en Ajustes.
  await p.goto(`${B}/estudio/cafe-lento?ver=ajustes`);
  const fase = p.locator("form:has(select[name=socio])").first();
  await fase.locator("select[name=socio]").selectOption("luna");
  await fase.locator("button:has-text('Guardar')").click();
  exigir(await p.locator("[data-aviso-trabajo]").first().isVisible({ timeout: 2000 }).catch(() => false), "un botón cualquiera bloquea la pantalla mientras responde (una sola espera)");
  exigir(await aviso(p, "la aprueba ahora Luna"), "cambiar quién aprueba dice qué pasó");
  exigir(!(await p.locator("[data-aviso-trabajo]").first().isVisible().catch(() => false)), "la espera se libera al llegar la respuesta");
  exigir(busqueda(p).get("ver") === "ajustes", `después de cambiar quién aprueba sigue en Ajustes (${p.url().replace(B, "")})`);

  // 4 · El Taller: cerrado en el día a día, abierto cuando estás en una de sus páginas.
  await p.goto(`${B}/estudio`);
  exigir(!(await p.locator("aside details").evaluate((d) => d.open)), "el Taller está cerrado en el inicio");
  exigir(!(await p.locator("aside >> text=Banco de calibración").isVisible()), "el banco no está a la vista en el trabajo diario");
  await p.click("aside summary:has-text('Taller')");
  await p.click("aside >> text=Banco de calibración");
  await p.waitForURL(/estudio\/banco/);
  exigir(await p.locator("aside details").evaluate((d) => d.open), "en el banco, el Taller queda abierto");
  const orden = await p.locator("aside nav > div.grid").first().locator("a").allInnerTexts();
  exigir(/Clientes/.test(orden.join("|")) && /Video/.test(orden.join("|")), "los departamentos están arriba en el menú");
  await p.screenshot({ path: join(capturas, "1-menu.png") });

  // 5 · Celular: barra de abajo, Atlas desde la barra, nada se sale de 390 px.
  const movil = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const m = await movil.newPage();
  m.on("pageerror", (e) => fallas.push(`error en celular: ${e.message}`));
  await m.goto(`${B}/estudio/cafe-lento`);
  const barra = m.getByRole("navigation", { name: "Accesos móviles" });
  const textos = (await barra.innerText()).replace(/\s+/g, " ");
  exigir(/Inicio/.test(textos) && /Clientes/.test(textos) && /Video/.test(textos) && /Atlas/.test(textos) && (await barra.getByRole("link", { name: "Nuevo pedido" }).count()) === 1, `la barra tiene Inicio, Clientes, nuevo pedido, Video y Atlas («${textos.trim()}»)`);
  exigir(!(await m.getByRole("button", { name: "Abrir chat de Atlas", exact: true }).isVisible()), "en celular no hay botón flotante de Atlas tapando el contenido");
  await barra.getByRole("button", { name: "Atlas", exact: true }).click();
  exigir(await m.getByRole("dialog", { name: "Chat con Atlas" }).isVisible({ timeout: 5000 }).catch(() => false), "Atlas se abre desde la barra");
  await m.screenshot({ path: join(capturas, "2-celular-atlas.png") });
  await m.keyboard.press("Escape");
  await barra.getByRole("link", { name: /Clientes/ }).click();
  await m.waitForURL(/estudio\/clientes/);
  exigir((await barra.getByRole("link", { name: /Clientes/ }).getAttribute("aria-current")) === "page", "la barra marca dónde estás");
  // El proyecto en celular: todas las pestañas en una fila que se desliza, nada escondido en «Más opciones».
  await m.goto(`${B}/estudio/cafe-lento?ver=ajustes`);
  const pestanas = m.locator("#pestanas-proyecto a");
  await pestanas.first().waitFor({ timeout: 15000 });
  exigir((await pestanas.count()) === 7, `las 7 pestañas del proyecto están en celular (${await pestanas.count()})`);
  exigir(!(await m.locator("text=Más opciones del proyecto").count()), "ya no hay «Más opciones del proyecto»");
  const actual = m.getByRole("navigation", { name: "Secciones del proyecto" }).locator("[aria-current=page]");
  const caja = await actual.boundingBox();
  exigir(!!caja && caja.x >= 0 && caja.x + caja.width <= 390, "la pestaña donde estás se ve aunque sea la última");
  await m.screenshot({ path: join(capturas, "4-celular-pestanas.png") });
  // El banco en celular: una referencia a la vez, deslizando.
  await m.goto(`${B}/estudio/banco`);
  await m.waitForLoadState("networkidle").catch(() => {});
  const alto = await m.evaluate(() => document.documentElement.scrollHeight);
  exigir(alto < 12000, `el banco en celular ya no es una lista interminable (${alto} px de alto)`);
  for (const ruta of ["/estudio/banco", "/estudio", "/estudio/cafe-lento", "/estudio/cafe-lento?ver=ajustes", "/estudio/clientes", "/estudio/video", "/estudio/nuevo", "/estudio/biblioteca"]) {
    await m.goto(B + ruta);
    await m.waitForLoadState("networkidle").catch(() => {});
    const ancho = await m.evaluate(() => document.documentElement.scrollWidth);
    exigir(ancho <= 392, `${ruta} cabe en 390 px (${ancho})`);
  }
  await m.goto(`${B}/estudio`);
  await m.screenshot({ path: join(capturas, "3-celular-inicio.png"), fullPage: true });
  await movil.close();
} catch (e) {
  fallas.push(`se cortó: ${e.message}`);
  await p.screenshot({ path: join(capturas, "error.png") }).catch(() => {});
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}` : "\nTodo bien.");
process.exit(fallas.length ? 1 : 0);
