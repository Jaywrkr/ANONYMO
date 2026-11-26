// El mes de contenido (sistema/96), con nube.sh recién levantado (Supabase y Anthropic falsos).
// Unmake es el primer cliente: sin lo mínimo no se arma; con todo, Faro arma el mes y se revisa pieza por pieza.
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
const guiones = () => pedidos("Faro, contenido de Unmake");
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 0 · Sin ficha, Unmake igual aparece y dice cómo empezar.
  await p.goto(`${B}/estudio/contenido?cliente=unmake`);
  exigir(await espera(p.locator("[data-falta-mes]:has-text('Unmake todavía no tiene ficha')")) && await p.locator("[data-falta-mes] a").getAttribute("href") === "/estudio/clientes", "sin ficha, Unmake dice cómo empezar");

  // 1 · Unmake con media ficha: el mes no se arma y se dice qué falta, sin gastar.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Unmake");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/unmake/);
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
  await p.goto(`${B}/estudio/contenido?cliente=unmake`);
  const form = p.locator("[data-armar-mes]");
  exigir(await espera(form.locator("[data-falta-mes]")) && /A Unmake le falta:.*(temas|cada cuánto|quién aprueba)/i.test(await form.locator("[data-falta-mes]").innerText()), "dice qué le falta a Unmake");
  exigir(await form.getByRole("button", { name: "Armar el mes" }).isDisabled() && meses() === antes, "el botón está apagado y no se gasta");

  // 2 · Sin web, «Buscar datos» guarda directo lo que el estudio sabe de Unmake (sistema/109) y la ficha queda completa.
  await p.goto(`${B}/estudio/cliente/unmake`);
  const buscar = p.locator("[data-buscar-datos]");
  exigir(/se guarda directo/.test(await buscar.innerText()) && await buscar.locator("button:has-text('Buscar datos')").isEnabled(), "Unmake puede buscar datos sin web");
  await buscar.locator("button:has-text('Buscar datos')").click();
  exigir(await espera(p.locator("[role=status]:has-text('que el estudio ya sabe de sí')"), 20000), "dice que guardó lo que ya sabe el estudio");
  exigir(await p.locator("[data-propuesta]").count() === 0, "sin nada que revisar a mano");
  const f2 = p.locator("[data-form-saber]");
  if (!(await f2.isVisible())) await p.locator("summary:has-text('Lo que sabemos de')").click();
  exigir(await f2.locator("[name=saber-oferta]").inputValue() === "Webs para negocios de Cuenca, desde USD 900", "lo que ya estaba escrito no se pisa");
  exigir(await espera(p.locator("[data-tarea=contenido][data-listo=si] [data-ir-contenido]")), "con todo, la ficha ofrece armar su mes");
  await p.locator("[data-ir-contenido]").click();
  await p.waitForURL(/estudio\/contenido\?cliente=unmake/);
  exigir(await form.locator("select").first().inputValue() === "unmake" && await form.locator("[data-falta-mes]").count() === 0, "llega con Unmake elegido y sin faltas");

  // 3 · Usa IA: pregunta antes; «Todavía no» no gasta.
  await form.getByRole("button", { name: "Armar el mes" }).click();
  exigir(await espera(form.getByRole("alertdialog", { name: "Confirmar" })) && /Usa IA/.test(await form.getByRole("alertdialog").innerText()), "antes de usar IA pide confirmación");
  await form.getByRole("button", { name: "Todavía no" }).click();
  exigir(meses() === antes, "decir que todavía no, no gasta");
  await form.getByRole("button", { name: "Armar el mes" }).click();
  await form.getByRole("button", { name: "Sí, armarlo" }).click();
  exigir(await espera(form.getByRole("button", { name: "Faro está armando el mes…" }), 3000), "mientras arma, el botón lo dice y queda bloqueado");
  await p.waitForURL(/estudio\/contenido\/c-unmake-\d{4}-\d{2}$/, { timeout: 60000 });
  exigir(meses() === antes + 1, "una sola llamada a Faro");

  // 4 · El mes como planner (sistema/114): el calendario con una pieza por fecha, lunes, miércoles y viernes.
  const rev = p.locator("[data-mes-revision]");
  await espera(rev);
  const piezas = rev.locator("[data-pieza]");
  const detalle = rev.locator("[data-detalle]");
  const n = await piezas.count();
  exigir(n >= 12 && n <= 14, `trae una pieza por fecha (${n})`);
  const fechasP = await piezas.evaluateAll((xs) => xs.map((x) => x.getAttribute("data-fecha")));
  exigir(fechasP.every((f) => [1, 3, 5].includes(new Date(`${f}T12:00:00Z`).getUTCDay())), "las fechas caen lunes, miércoles y viernes");
  exigir(await rev.locator("[aria-label=Series] > span:has(i)").count() === 3, "muestra las series del mes, cada una con su color");
  exigir(await rev.locator("[data-copiar-mes]").isDisabled(), "sin aprobadas, no hay nada que copiar");
  exigir(await piezas.nth(0).locator("[data-vista]").count() === 1, "cada día muestra su arte en el calendario, sin dibujarlo");
  exigir(/Instagram/.test(await p.locator("[data-redes]").innerText()) && !/YouTube/.test(await p.locator("[data-redes]").innerText()), "arriba: solo las redes del cliente");

  // 4b · Al tocar un día se abre la pieza al lado: hora, historias con sticker, A y B en pestañas, y el arte.
  exigir(/^\d{2}:\d{2}$/.test(await piezas.nth(0).locator("[data-hora]").innerText()), "cada pieza trae su hora");
  await piezas.nth(0).click();
  exigir(await espera(detalle) && await detalle.getAttribute("data-detalle") === await piezas.nth(0).getAttribute("data-pieza"), "tocar un día abre su pieza al lado");
  exigir(/sticker de encuesta: Sí \/ No/.test(await detalle.locator("[data-historias]").innerText()), "trae las historias del día, con su sticker");
  exigir(await detalle.locator("[data-historias] li").count() === 2, "las historias se ven como pantallas de celular");
  exigir(await detalle.locator("[data-arte] [data-vista]").count() >= 1, "el arte se ve al instante, como se publica");
  exigir(!(await rev.innerText()).includes("🚀"), "los emojis que puso la IA no llegan");
  exigir(await detalle.locator("[data-youtube]").count() === 0, "sin YouTube en su ficha, no se escribe para YouTube");
  exigir(await espera(rev.locator("[data-proxima]")), "arriba dice lo próximo que se publica");
  await piezas.nth(2).click();
  exigir(await detalle.getAttribute("data-detalle") === await piezas.nth(2).getAttribute("data-pieza"), "otro día cambia la pieza abierta");
  await detalle.locator("[data-tab=B]").click();
  exigir(/Otra idea 3/.test(await detalle.locator("[data-idea]").innerText()) && /Texto B de prueba 3/.test(await detalle.locator("[data-texto]").innerText()), "la pestaña B muestra su idea con su propio texto: no se mezclan");
  await detalle.locator("[data-usar-b]").click();
  exigir(await espera(detalle.locator("[role=status]:has-text('Ahora va la opción B')")) && /Otra idea 3/.test(await detalle.locator("[data-idea]").innerText()), "usar la opción B la pone como elegida");
  await detalle.locator("[data-tab=B]").click();
  exigir(/Idea de prueba 3/.test(await detalle.locator("[data-idea]").innerText()), "y la A queda como alternativa");
  await detalle.locator("[data-tab=A]").click();
  await detalle.locator("[data-dibujar]").click();
  exigir(await espera(detalle.getByRole("button", { name: "Preparando el arte…" }), 3000), "mientras prepara el arte, el botón lo dice");
  exigir(await espera(detalle.locator("[data-arte] img").first(), 90000) && await detalle.locator("[data-arte] img").count() >= 2, `el arte queda listo para Instagram (${await detalle.locator("[data-arte] img").count()} imágenes; ${await detalle.locator("[role=alert]").allInnerTexts()})`);
  const tamano = await detalle.locator("[data-arte] img").first().evaluate((i) => new Promise((r) => { const v = () => r([i.naturalWidth, i.naturalHeight]); if (i.complete) v(); else i.onload = v; }));
  exigir(tamano[0] === 1080 && (tamano[1] === 1350 || tamano[1] === 1920), `las imágenes salen en tamaño de Instagram (${tamano.join("×")})`);
  const zipHref = await detalle.locator("[data-descargar-arte]").getAttribute("href");
  const zip = await p.evaluate(async (u) => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer()); return { tipo: r.headers.get("content-type"), texto: new TextDecoder("latin1").decode(b) }; }, zipHref);
  exigir(zip.tipo === "application/zip" && /p03-01\.jpg/.test(zip.texto) && /texto\.txt/.test(zip.texto), "se baja todo en un .zip, con el texto para pegar");

  // 5 · Aprobar, pedir un cambio con nota y corregir a mano.
  await piezas.nth(0).click();
  const idea1 = await detalle.locator("[data-idea]").innerText();
  await detalle.locator("[data-aprobar]").click();
  exigir(await espera(detalle.locator("[role=status]:has-text('Aprobada.')")) && await piezas.nth(0).getAttribute("data-estado") === "aprobada", "aprobar dice que quedó aprobada y se ve en el calendario");
  await piezas.nth(1).click();
  await detalle.locator("[data-pedir-cambio]").click();
  exigir(await detalle.getByRole("button", { name: "Anotar el cambio" }).isDisabled(), "sin nota no se puede pedir un cambio");
  await detalle.locator("textarea").fill("Más corto y sin precio");
  await detalle.getByRole("button", { name: "Anotar el cambio" }).click();
  exigir(await espera(detalle.locator("text=Cambio pedido: Más corto y sin precio")) && await piezas.nth(1).getAttribute("data-estado") === "cambio", "el cambio queda con su nota");
  await detalle.locator("[data-corregir]").click();
  await detalle.getByLabel("El texto que se publica").fill("Tu negocio merece una web que venda.");
  await detalle.getByRole("button", { name: "Guardar" }).click();
  const corregida = await espera(detalle.locator("[role=status]:has-text('Guardado.')")) && await espera(detalle.locator("[data-texto]:has-text('Tu negocio merece una web que venda.')"));
  const estado2 = await piezas.nth(1).getAttribute("data-estado");
  exigir(corregida && estado2 === "propuesta", `corregida a mano, vuelve a «Por revisar» (${estado2}; ${await detalle.locator("[role=status],[role=alert]").allInnerTexts()})`);
  await rev.getByRole("button", { name: /^Aprobada \(/ }).click();
  exigir(await rev.locator("[data-pieza].opacity-35").count() === n - 1, "el filtro deja a la vista solo las aprobadas");
  await rev.getByRole("button", { name: /^Todas \(/ }).click();

  // 6 · El guion de un reel: pregunta antes y queda en la pieza.
  await rev.locator("[data-pieza]:has-text('Reel')").first().click();
  const g0 = guiones();
  await detalle.locator("[data-escribir-guion]").click();
  await detalle.getByRole("button", { name: "Todavía no" }).click();
  exigir(guiones() === g0, "cancelar el guion no gasta");
  await detalle.locator("[data-escribir-guion]").click();
  await detalle.getByRole("button", { name: "Sí, escribirlo" }).click();
  exigir(await espera(detalle.locator("[data-guion]"), 60000) && /Gancho:/.test(await detalle.locator("[data-guion]").innerText()), "el guion del reel queda en la pieza");

  // 7 · Copiar lo aprobado para mandárselo al cliente.
  await rev.locator("[data-copiar-mes]").click();
  exigir(await espera(rev.locator("[role=status]:has-text('Copiado: 1 pieza aprobada')")), "copiar dice cuántas copió");
  const copiado = await p.evaluate(() => navigator.clipboard.readText());
  exigir(copiado.startsWith("Contenido de Unmake") && copiado.includes(idea1) && !copiado.includes("Tu negocio merece"), "copia solo lo aprobado");

  // 8 · Queda guardado y la lista lo cuenta.
  await p.reload();
  await espera(rev);
  await piezas.nth(1).click();
  exigir(await piezas.nth(0).getAttribute("data-estado") === "aprobada" && await detalle.locator("text=Tu negocio merece").count() === 1, "al recargar sigue igual");
  await p.screenshot({ path: join(capturas, "1-mes.png"), fullPage: true });
  await p.goto(`${B}/estudio/contenido`);
  exigir(/1 de \d+ aprobadas/.test(await p.locator("[data-mes]").first().innerText()), "la lista dice cuántas van aprobadas");

  // 9 · Desde la conversación de Atlas: si el mes ya existe, lleva a él sin gastar.
  await p.locator("button[aria-label='Abrir chat de Atlas']").click();
  const panel = p.getByRole("dialog", { name: "Chat con Atlas" });
  const caja = panel.locator("#caja-atlas");
  await espera(panel.locator("#caja-atlas:not([disabled])"));
  const mesId = (await p.locator("[data-mes]").first().getAttribute("data-mes")) ?? "";
  const [a, m] = mesId.slice(-7).split("-");
  const nombres = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const antes2 = meses();
  await caja.fill(`#unmake /contenido ${nombres[Number(m) - 1]}`);
  await panel.getByRole("button", { name: "Enviar" }).click();
  const ya = panel.locator("[data-tarjeta]").filter({ hasText: "ya está armado" });
  exigir(await espera(ya) && (await ya.locator("a:has-text('Revisar el mes')").getAttribute("href"))?.endsWith(mesId) && meses() === antes2, `un mes que ya existe (${a}-${m}) lleva a él sin gastar`);
  // Y otro mes se arma con confirmación.
  const otro = nombres[Number(m) % 12];
  await caja.fill(`#unmake /contenido ${otro}`);
  await panel.getByRole("button", { name: "Enviar" }).click();
  const conf = panel.getByRole("alertdialog", { name: "Confirmar" }).last();
  exigir(await espera(conf) && new RegExp(`armar ${otro}`).test(await conf.innerText()), "pide confirmación nombrando el mes");
  await conf.getByRole("button", { name: "Sí, hazlo" }).click();
  const nueva = panel.locator("[data-tarjeta]").filter({ hasText: `Contenido de Unmake · ${otro}` }).filter({ hasText: "Faro armó" });
  exigir(await espera(nueva, 60000) && meses() === antes2 + 1, "la caja arma el otro mes y trae la tarjeta para revisarlo");
  await p.keyboard.press("Escape");

  // 10 · En el celular: nada se sale de la pantalla.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const c = await cel.newPage();
  await c.goto(`${B}/estudio/contenido/${mesId}`);
  await espera(c.locator("[data-mes-revision]"));
  exigir(await c.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "en el celular no hay scroll de lado");
  await c.screenshot({ path: join(capturas, "2-celular.png") });
  await c.locator("[data-pieza]").first().click();
  exigir(await espera(c.locator("[data-detalle]")) && await c.locator("[data-detalle] [data-aprobar], [data-detalle] [data-pedir-cambio]").first().isVisible(), "en el celular la pieza se abre a pantalla completa, con sus botones a mano");
  await c.screenshot({ path: join(capturas, "3-celular-pieza.png") });
  await c.getByRole("button", { name: "← Volver al mes" }).click();
  exigir(!(await c.locator("[data-detalle]").count()), "«Volver al mes» la cierra");
  await cel.close();
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
