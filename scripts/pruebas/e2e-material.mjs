// El material real de un cliente (sistema/118), con nube.sh levantado (IA falsa). Levanta una web falsa en el 45779.
// Las webs de su Dirección se capturan solas, se ven en la ficha, Faro recibe las imágenes al armar el mes y las piezas
// «trabajo» muestran la captura real, también al prepararlas para Instagram. Nada sale a internet.
// Uso: node scripts/pruebas/e2e-material.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const SITIO = "http://127.0.0.1:45779";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-material";
mkdirSync(capturas, { recursive: true });
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const PAGINA = (t) => `<!doctype html><html><head><title>${t}</title><meta name="viewport" content="width=device-width"></head><body style="margin:0;font-family:sans-serif;background:#01095c;color:#fff">
<header style="padding:24px 48px"><b>${t}</b></header><h1 style="font-size:72px;padding:80px 48px;margin:0">Infraestructura preparada para lo que viene.</h1><p style="padding:0 48px">Una web de prueba para capturar.</p></body></html>`;
const sitio = createServer((q, r) => { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); r.end(PAGINA(q.url === "/ref" ? "Referencia" : "Coresolutions de prueba")); }).listen(45779, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Unmake con lo que el estudio ya sabe: sus primeros trabajos entran a su Dirección como trabajo real.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Unmake");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/unmake/);
  await p.locator("[data-buscar-datos] button:has-text('Buscar datos')").click();
  await espera(p.locator("[role=status]:has-text('ya sabe de sí')"));
  exigir(await p.locator("[data-trabajo] [data-referencias] li").count() === 2, "los dos primeros trabajos de Unmake quedan como «su trabajo real»");

  // 2 · Su trabajo (aquí, una web de prueba) y una referencia: se capturan solas al abrir la ficha.
  await p.locator("[data-editar-direccion] summary").click();
  await p.locator("[data-editar-direccion] [name=trabajos]").fill(`${SITIO}/ — web de prueba de un cliente`);
  await p.locator("[data-editar-direccion] [name=referencias]").fill(`${SITIO}/ref — una referencia de primer nivel`);
  await p.locator("[data-guardar-direccion]").click();
  await espera(p.locator("[role=status]:has-text('Dirección guardada')"));
  exigir(await espera(p.locator("[data-capturas=trabajando]"), 8000), "al abrir la ficha, dice que está capturando");
  exigir(await espera(p.locator("[data-capturas=listo]"), 120000), `las webs se capturan solas (${await p.locator("[data-capturas]").innerText().catch(() => "")})`);
  await p.waitForTimeout(1500);
  const imgs = p.locator("#direccion [data-capturada] img");
  exigir(await imgs.count() === 4, `cada web queda en computadora y celular (${await imgs.count()} capturas)`);
  const cargan = await imgs.evaluateAll((xs) => Promise.all(xs.map((i) => new Promise((r) => { const v = () => r(i.naturalWidth); if (i.complete) v(); else i.onload = v; }))));
  exigir(cargan.every((w) => w > 0), "las capturas se ven en la ficha");
  exigir(cargan.includes(1440) && cargan.includes(390), `en tamaño de computadora y de celular (${cargan.join(", ")})`);
  await p.screenshot({ path: join(capturas, "1-material.png"), fullPage: true });

  // 3 · Faro arma el mes viendo las capturas y una serie muestra su trabajo real.
  await p.goto(`${B}/estudio/contenido?cliente=unmake`);
  const form = p.locator("form").filter({ has: p.getByRole("button", { name: "Armar el mes" }) }).first();
  await form.getByRole("button", { name: "Armar el mes" }).click();
  await form.getByRole("button", { name: "Sí, armarlo" }).click();
  await p.waitForURL(/estudio\/contenido\/c-unmake-\d{4}-\d{2}$/, { timeout: 90000 });
  const cal = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes("Faro arma el mes de contenido")).pop() ?? "";
  exigir((cal.match(/"type":"image"/g) ?? []).length >= 1 && cal.includes("su trabajo"), "Faro recibe las capturas como imágenes, no solo los enlaces");
  exigir(!cal.includes("una referencia de primer nivel") || cal.includes("referencia de calidad"), "las referencias van como vara, no como trabajo del cliente");

  // 3a · El enfoque lo decide Faro (sistema/121): un estudio con trabajo real es un portafolio, no frases.
  exigir(await p.locator("[data-enfoque=portafolio]").count() === 1, `Faro decide que Unmake muestra su trabajo (${await p.locator("[data-enfoque]").innerText().catch(() => "sin enfoque")})`);
  const docs = await p.locator("[data-pieza] iframe").evaluateAll((xs) => xs.map((x) => x.getAttribute("srcdoc") ?? ""));
  exigir(docs.filter((d) => d.includes("/material/")).length >= Math.ceil(docs.length * 0.9), `casi todas las piezas muestran su trabajo real (${docs.filter((d) => d.includes("/material/")).length} de ${docs.length})`);
  exigir(docs.every((d) => !/Título de prueba|Decisión \d/.test(d)), "ninguna pieza es una frase o un consejo");
  // 3b · La revisión contra la vara (sistema/120): sola, al abrir el mes. Cada pieza se dibuja y se mira al lado de las
  // capturas; la que no llega, Faro la rehace y se vuelve a mirar.
  exigir(await espera(p.locator("[data-vara-progreso]"), 15000), "al abrir el mes, empieza la revisión con la vara");
  const total = await p.locator("[data-pieza]").count();
  await p.waitForFunction((n) => document.querySelectorAll("[data-vara-nota]").length >= n, total, { timeout: 280000 }).catch(() => {});
  exigir(await p.locator("[data-vara-nota]").count() === total, `cada pieza queda con su nota frente a la vara (${await p.locator("[data-vara-nota]").count()} de ${total})`);
  const varas = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes('"revisar_con_vara"'));
  const conVara = varas.filter((l) => (l.match(/"type":"image"/g) ?? []).length >= 2 && l.includes("Vara del cliente"));
  exigir(varas.length >= total * 2 && conVara.length === varas.length, `la revisión ve la pieza dibujada al lado de las capturas de la vara (${conVara.length} de ${varas.length})`);
  await p.locator("[data-pieza]").first().click();
  const caja = p.locator("[data-detalle] [data-vara]");
  exigir(await espera(caja) && (await caja.getAttribute("data-vara")) === "llega" && /8\s*\/10/.test(await caja.innerText()) && /rehízo una vez/.test(await caja.innerText()), `la pieza que no llegaba, Faro la rehízo sola y ahora llega (${await caja.innerText().catch(() => "")})`);
  const titulo = await p.locator("[data-detalle] [data-arte] iframe").first().getAttribute("srcdoc").catch(() => "");
  exigir((titulo ?? "").includes("(a la vara)"), "el arte muestra la versión rehecha");
  await p.screenshot({ path: join(capturas, "3-vara.png"), fullPage: true });

  // 4 · Una pieza «trabajo» muestra la captura real en la vista previa y al prepararla para Instagram.
  const detalle = p.locator("[data-detalle]");
  let encontrada = false;
  for (let i = 0; i < 6 && !encontrada; i++) {
    await p.locator("[data-pieza]").nth(i).click();
    await espera(detalle);
    const srcdoc = (await detalle.locator("[data-arte] iframe").first().getAttribute("srcdoc").catch(() => "")) ?? "";
    encontrada = srcdoc.includes("/material/");
  }
  exigir(encontrada, "una pieza del mes muestra la captura de su trabajo en el arte");
  await detalle.locator("[data-dibujar]").click();
  exigir(await espera(detalle.locator("[data-arte] img").first(), 120000), `el arte con la captura queda listo para Instagram (${await detalle.locator("[role=alert]").allInnerTexts()})`);
  await p.screenshot({ path: join(capturas, "2-pieza-trabajo.png"), fullPage: true });

  // 5 · Volver a armar (sistema/121): Faro lo arma de nuevo y el anterior queda guardado.
  const antesFaro = readFileSync(registro, "utf8").split("\n").filter((l) => l.includes("Faro arma el mes de contenido")).length;
  await p.locator("[data-rearmar]").click();
  await p.locator("[data-rearmar-si]").click();
  exigir(await espera(p.locator("[data-rearmar-confirmar][role=status]"), 5000), "mientras lo vuelve a armar, lo dice");
  await p.waitForLoadState("load");
  await p.waitForFunction(() => !document.querySelector("[data-rearmar-confirmar]") && document.querySelectorAll("[data-pieza]").length > 0, null, { timeout: 120000 }).catch(() => {});
  const despuesFaro = readFileSync(registro, "utf8").split("\n").filter((l) => l.includes("Faro arma el mes de contenido")).length;
  exigir(despuesFaro === antesFaro + 1 && await p.locator("[data-pieza]").count() > 0, `«Volver a armar» le pide el mes otra vez a Faro (${antesFaro} → ${despuesFaro})`);
  await ctx.close();
} finally {
  await nav.close();
  sitio.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
