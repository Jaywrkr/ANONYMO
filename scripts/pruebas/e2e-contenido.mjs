// El mes de contenido (sistema/96), con nube.sh recién levantado (Supabase y Anthropic falsos).
// ANONYMO es el primer cliente: sin lo mínimo no se arma; con todo, Faro arma el mes y se revisa pieza por pieza.
// Uso: node scripts/pruebas/e2e-contenido.mjs [carpeta-capturas]
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-contenido";
mkdirSync(capturas, { recursive: true });
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const pedidos = (marca) => { try { return readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes(marca)).length; } catch { return 0; } };
const meses = () => pedidos("Faro arma el mes de contenido");
const guiones = () => pedidos("Faro, contenido de ANONYMO");
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 0 · Sin ficha, ANONYMO igual aparece y dice cómo empezar.
  await p.goto(`${B}/estudio/contenido?cliente=anonymo`);
  exigir(await espera(p.locator("[data-falta-mes]:has-text('ANONYMO todavía no tiene ficha')")) && await p.locator("[data-falta-mes] a").getAttribute("href") === "/estudio/clientes", "sin ficha, ANONYMO dice cómo empezar");

  // 1 · ANONYMO con media ficha: el mes no se arma y se dice qué falta, sin gastar.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("ANONYMO");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/anonymo/);
  const f = p.locator("[data-form-saber]");
  await f.locator("[name=saber-rubro]").fill("Agencia creativa: diseño, tecnología y comunicación");
  await f.locator("[name=saber-oferta]").fill("Webs para negocios de Cuenca, desde USD 900");
  await f.locator("[name=saber-publico]").fill("Dueños de consultorios, estudios y locales que solo tienen Instagram");
  await f.locator("[name=saber-canales]").fill("Instagram");
  await f.locator("[name=saber-tono]").fill("Directo, simple, sin palabras rebuscadas");
  await f.locator("button:has-text('Guardar lo que sabemos')").click();
  await espera(p.locator("[role=status]:has-text('Guardado.')"));
  exigir(await p.locator("[data-ir-contenido]").count() === 0, "sin lo mínimo, la ficha no ofrece armar el mes");
  const antes = meses();
  await p.goto(`${B}/estudio/contenido?cliente=anonymo`);
  const form = p.locator("[data-armar-mes]");
  exigir(await espera(form.locator("[data-falta-mes]")) && /A ANONYMO le falta:.*(temas|cada cuánto|quién aprueba)/i.test(await form.locator("[data-falta-mes]").innerText()), "dice qué le falta a ANONYMO");
  exigir(await form.getByRole("button", { name: "Armar el mes" }).isDisabled() && meses() === antes, "el botón está apagado y no se gasta");

  // 2 · Sin web, «Buscar datos» propone lo que el estudio ya sabe de ANONYMO; se aprueba y la ficha queda completa.
  await p.goto(`${B}/estudio/cliente/anonymo`);
  const buscar = p.locator("[data-buscar-datos]");
  exigir(/lo que el estudio ya sabe de ANONYMO/.test(await buscar.innerText()) && await buscar.locator("button:has-text('Buscar datos')").isEnabled(), "ANONYMO puede buscar datos sin web");
  await buscar.locator("button:has-text('Buscar datos')").click();
  exigir(await espera(p.locator("[role=status]:has-text('lo que ya sabe el estudio')"), 20000), "dice que trajo lo que ya sabe el estudio");
  const props = await buscar.locator("[data-propuesta]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-propuesta")));
  exigir(["temas", "frecuencia", "aprueba"].every((k) => props.includes(k)) && /de ANONYMO \(lo que ya sabe el estudio\)/.test(await buscar.locator("[data-propuesta=temas]").innerText()), `propone lo que faltaba, con su origen (${props.join(", ")})`);
  exigir(await buscar.locator("[name=tomar-oferta]").isChecked() === false, "lo que ya estaba escrito distinto no se marca solo");
  await buscar.locator("button:has-text('Guardar los marcados')").click();
  exigir(await espera(p.locator("[data-tarea=contenido][data-listo=si] [data-ir-contenido]")), "con todo, la ficha ofrece armar su mes");
  await p.locator("[data-ir-contenido]").click();
  await p.waitForURL(/estudio\/contenido\?cliente=anonymo/);
  exigir(await form.locator("select").first().inputValue() === "anonymo" && await form.locator("[data-falta-mes]").count() === 0, "llega con ANONYMO elegido y sin faltas");

  // 3 · Usa IA: pregunta antes; «Todavía no» no gasta.
  await form.getByRole("button", { name: "Armar el mes" }).click();
  exigir(await espera(form.getByRole("alertdialog", { name: "Confirmar" })) && /Usa IA/.test(await form.getByRole("alertdialog").innerText()), "antes de usar IA pide confirmación");
  await form.getByRole("button", { name: "Todavía no" }).click();
  exigir(meses() === antes, "decir que todavía no, no gasta");
  await form.getByRole("button", { name: "Armar el mes" }).click();
  await form.getByRole("button", { name: "Sí, armarlo" }).click();
  exigir(await espera(form.getByRole("button", { name: "Faro está armando el mes…" }), 3000), "mientras arma, el botón lo dice y queda bloqueado");
  await p.waitForURL(/estudio\/contenido\/c-anonymo-\d{4}-\d{2}$/, { timeout: 60000 });
  exigir(meses() === antes + 1, "una sola llamada a Faro");

  // 4 · El mes: series y una pieza por fecha, en lunes, miércoles y viernes.
  const rev = p.locator("[data-mes-revision]");
  await espera(rev);
  const piezas = rev.locator("[data-pieza]");
  const n = await piezas.count();
  exigir(n >= 12 && n <= 14, `trae una pieza por fecha (${n})`);
  const dias = await piezas.evaluateAll((xs) => xs.map((x) => x.querySelector("span")?.textContent ?? ""));
  exigir(dias.every((d) => /^(lunes|miércoles|viernes) \d+$/.test(d)), "las fechas caen lunes, miércoles y viernes");
  exigir(await p.locator("section[aria-label=Series] > div").count() === 3, "muestra las series del mes");
  exigir(await rev.locator("[data-copiar-mes]").isDisabled(), "sin aprobadas, no hay nada que copiar");

  // 5 · Aprobar, pedir un cambio con nota y corregir a mano.
  const p1 = piezas.nth(0), p2 = piezas.nth(1);
  await p1.locator("[data-aprobar]").click();
  exigir(await espera(p1.locator("[role=status]:has-text('Aprobada.')")) && await p1.getAttribute("data-estado") === "aprobada", "aprobar dice que quedó aprobada");
  await p2.locator("[data-pedir-cambio]").click();
  exigir(await p2.getByRole("button", { name: "Anotar el cambio" }).isDisabled(), "sin nota no se puede pedir un cambio");
  await p2.locator("textarea").fill("Más corto y sin precio");
  await p2.getByRole("button", { name: "Anotar el cambio" }).click();
  exigir(await espera(p2.locator("text=Cambio pedido: Más corto y sin precio")) && await p2.getAttribute("data-estado") === "cambio", "el cambio queda con su nota");
  await p2.locator("[data-corregir]").click();
  await p2.getByLabel("El texto que se publica").fill("Tu negocio merece una web que venda.");
  await p2.getByRole("button", { name: "Guardar" }).click();
  const corregida = await espera(p2.locator("text=Tu negocio merece una web que venda."));
  const estado2 = await p2.getAttribute("data-estado");
  exigir(corregida && estado2 === "propuesta", `corregida a mano, vuelve a «Por revisar» (${estado2}; ${await p2.locator("[role=status],[role=alert]").allInnerTexts()})`);
  await rev.getByRole("button", { name: /^Aprobada \(/ }).click();
  exigir(await piezas.count() === 1, "el filtro muestra solo las aprobadas");
  await rev.getByRole("button", { name: /^Todas \(/ }).click();

  // 6 · El guion de un reel: pregunta antes y queda en la pieza.
  const idReel = await rev.locator("[data-pieza]:has([data-escribir-guion])").first().getAttribute("data-pieza");
  const reel = rev.locator(`[data-pieza="${idReel}"]`);
  const g0 = guiones();
  await reel.locator("[data-escribir-guion]").click();
  await reel.getByRole("button", { name: "Todavía no" }).click();
  exigir(guiones() === g0, "cancelar el guion no gasta");
  await reel.locator("[data-escribir-guion]").click();
  await reel.getByRole("button", { name: "Sí, escribirlo" }).click();
  exigir(await espera(reel.locator("[data-guion]"), 60000) && /Gancho:/.test(await reel.locator("[data-guion]").innerText()), "el guion del reel queda en la pieza");

  // 7 · Copiar lo aprobado para mandárselo al cliente.
  await rev.locator("[data-copiar-mes]").click();
  exigir(await espera(rev.locator("[role=status]:has-text('Copiado: 1 pieza aprobada')")), "copiar dice cuántas copió");
  const copiado = await p.evaluate(() => navigator.clipboard.readText());
  exigir(copiado.startsWith("Contenido de ANONYMO") && copiado.includes(await p1.locator("p.font-medium").first().innerText()) && !copiado.includes("Tu negocio merece"), "copia solo lo aprobado");

  // 8 · Queda guardado y la lista lo cuenta.
  await p.reload();
  exigir(await espera(rev) && await piezas.nth(0).getAttribute("data-estado") === "aprobada" && await piezas.nth(1).locator("text=Tu negocio merece").count() === 1, "al recargar sigue igual");
  await p.screenshot({ path: join(capturas, "1-mes.png"), fullPage: true });
  await p.goto(`${B}/estudio/contenido`);
  exigir(/1 de \d+ aprobadas/.test(await p.locator("[data-mes]").first().innerText()), "la lista dice cuántas van aprobadas");

  // 9 · Desde la caja de Atlas: si el mes ya existe, lleva a él sin gastar.
  await p.locator("button[aria-label='Abrir chat de Atlas']").click();
  const panel = p.getByRole("dialog", { name: "Chat con Atlas" });
  const caja = panel.locator("#caja-atlas");
  await espera(caja);
  const mesId = (await p.locator("[data-mes]").first().getAttribute("data-mes")) ?? "";
  const [a, m] = mesId.slice(-7).split("-");
  const nombres = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const antes2 = meses();
  await caja.fill(`#anonymo /contenido ${nombres[Number(m) - 1]}`);
  await panel.getByRole("button", { name: "Pedirle a Faro" }).click();
  const ya = panel.locator("[data-tarjeta]").filter({ hasText: "ya está armado" });
  exigir(await espera(ya) && (await ya.locator("a:has-text('Revisar el mes')").getAttribute("href"))?.endsWith(mesId) && meses() === antes2, `un mes que ya existe (${a}-${m}) lleva a él sin gastar`);
  // Y otro mes se arma con confirmación.
  const otro = nombres[Number(m) % 12];
  await caja.fill(`#anonymo /contenido ${otro}`);
  await panel.getByRole("button", { name: "Pedirle a Faro" }).click();
  exigir(await espera(panel.getByRole("alertdialog", { name: "Confirmar" })) && new RegExp(`armar ${otro}`).test(await panel.getByRole("alertdialog").innerText()), "pide confirmación nombrando el mes");
  await panel.getByRole("button", { name: "Sí, hazlo" }).click();
  const nueva = panel.locator("[data-tarjeta]").filter({ hasText: `Contenido de ANONYMO · ${otro}` }).filter({ hasText: "Faro armó" });
  exigir(await espera(nueva, 60000) && meses() === antes2 + 1, "la caja arma el otro mes y trae la tarjeta para revisarlo");
  await p.keyboard.press("Escape");

  // 10 · En el celular: nada se sale de la pantalla.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const c = await cel.newPage();
  await c.goto(`${B}/estudio/contenido/${mesId}`);
  await espera(c.locator("[data-mes-revision]"));
  exigir(await c.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "en el celular no hay scroll de lado");
  await c.screenshot({ path: join(capturas, "2-celular.png") });
  await cel.close();
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
