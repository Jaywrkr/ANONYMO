// Clientes nuevos de punta a punta (sistema/66), con nube.sh levantado (Supabase falso).
// Levanta su propio Google Maps falso y webs falsas en 45999: busca Salud en Cuenca, revisa las webs,
// comprueba el orden, abre WhatsApp, guarda notas, recarga (siguen en la nube), convierte en pedido y mira el celular.
// Uso: node scripts/pruebas/e2e-clientes.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const F = "http://127.0.0.1:45999";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-clientes";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };

// Negocios ficticios: uno por cada caso de web.
const LUGARES = [
  { id: "falso-bien", displayName: { text: "Clínica Bien Hecha" }, rating: 4.9, userRatingCount: 210, websiteUri: `${F}/sitio/bien`, nationalPhoneNumber: "099 000 0001", googleMapsUri: "https://maps.google.com/?cid=1" },
  { id: "falso-rota", displayName: { text: "Dental Enlace Roto" }, rating: 4.6, userRatingCount: 40, websiteUri: `${F}/sitio/error`, nationalPhoneNumber: "099 000 0002" },
  { id: "falso-sinweb", displayName: { text: "Sonrisa Sin Web" }, rating: 4.8, userRatingCount: 95, nationalPhoneNumber: "099 000 0003" },
  { id: "falso-insta", displayName: { text: "Ortodoncia Solo Insta" }, rating: 4.2, userRatingCount: 12, websiteUri: "https://www.instagram.com/ortodoncia-falsa", nationalPhoneNumber: "07 400 0004" },
  { id: "falso-vieja", displayName: { text: "Consultorio Web Vieja" }, rating: 3.9, userRatingCount: 7, websiteUri: `${F}/sitio/vieja` },
  { id: "falso-cerrado", displayName: { text: "Ya Cerró" }, businessStatus: "CLOSED_PERMANENTLY" },
];
let consultas = 0;
const google = createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (d) => (cuerpo += d));
  req.on("end", () => {
    if (req.url === "/v1/places:searchText") {
      consultas++;
      if (req.headers["x-goog-api-key"] !== "clave-google-falsa") { res.writeHead(403, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "clave" } })); }
      const q = JSON.parse(cuerpo).textQuery ?? "";
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ places: q.startsWith("odontólogo") ? LUGARES : [] }));
    }
    if (req.url === "/sitio/bien") { res.writeHead(200, { "content-type": "text/html" }); return res.end(`<html><head><meta name="viewport" content="width=device-width"><title>Bien</title></head><body>${"contenido ".repeat(60)}© 2026</body></html>`); }
    if (req.url === "/sitio/vieja") { res.writeHead(200, { "content-type": "text/html" }); return res.end(`<html><head><title>Vieja</title><meta name="generator" content="Joomla! 1.5"></head><body>${"contenido ".repeat(60)}Copyright 2017</body></html>`); }
    res.writeHead(500); res.end("error");
  });
}).listen(45999, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  await p.click("aside nav >> a:has-text('Clientes')");
  await p.waitForURL(/estudio\/clientes$/);
  exigir(await p.locator("h1", { hasText: "Clientes." }).waitFor({ timeout: 15000 }).then(() => true, () => false), "Clientes abre la cartera desde la barra");
  await p.click("nav[aria-label='Partes de clientes'] >> text=Nuevos · Imán");
  await p.waitForURL(/estudio\/clientes\/nuevos$/);
  exigir(await p.locator("h1", { hasText: "Clientes nuevos." }).waitFor({ timeout: 15000 }).then(() => true, () => false), "el escritorio de Imán abre desde la barra");
  exigir(!(await p.locator("text=Falta la clave de Google Maps").count()), "con clave no avisa que falta");
  await p.waitForSelector("button:has-text('Que Imán busque')");
  await p.click("button[aria-pressed=true]:has-text('Legal y contable')");
  await p.click("button[aria-pressed=true]:has-text('Belleza y bienestar')");
  await p.screenshot({ path: join(capturas, "1-buscar.png") });
  await p.click("button:has-text('Que Imán busque')");
  exigir(await p.locator("[role=alertdialog]").first().isVisible({ timeout: 3000 }).catch(() => false), "al buscar aparece la espera de inmediato");
  await p.locator("[role=status]:has-text('Listo:')").waitFor({ timeout: 60000 });
  const listo = await p.locator("[role=status]:has-text('Listo:')").innerText();
  exigir(/5 negocios nuevos y 4 webs revisadas/.test(listo), `dice qué encontró («${listo}»)`);
  exigir(consultas === 6, `una consulta a Google por cada búsqueda de Salud (${consultas})`);
  exigir(!(await p.locator("text=Ya Cerró").count()), "los negocios cerrados no entran");

  const nombres = await p.locator("ul[aria-label=Negocios] > li p.truncate").allInnerTexts();
  exigir(nombres[0] === "Dental Enlace Roto", `primero el de la web rota (${nombres.join(", ")})`);
  exigir(nombres[1] === "Sonrisa Sin Web", "después el que no tiene web y tiene muy buena fama");
  exigir(nombres.at(-1) === "Clínica Bien Hecha", "al final el que ya tiene buena web");
  const vieja = p.locator("li:has-text('Consultorio Web Vieja')");
  exigir(await vieja.locator("text=No se ve bien en celular").isVisible() && await vieja.locator("text=Sin actualizar desde 2017").isVisible() && await vieja.locator("text=Sin teléfono").isVisible(), "la web vieja muestra qué falla y que no hay teléfono");
  exigir(await p.locator("li:has-text('Ortodoncia Solo Insta') >> text=Solo Instagram").isVisible(), "detecta que solo tiene Instagram");
  exigir(await p.locator("li:has-text('Ortodoncia Solo Insta') >> text=WhatsApp (número fijo)").isVisible(), "avisa cuando el número es fijo");
  await p.screenshot({ path: join(capturas, "2-lista.png"), fullPage: true });

  const tarjeta = p.locator("li:has-text('Sonrisa Sin Web')");
  const wa = await tarjeta.locator("a:has-text('WhatsApp')").getAttribute("href");
  exigir(wa?.startsWith("https://wa.me/593990000003?text=") && decodeURIComponent(wa).includes("no tienen página web") && decodeURIComponent(wa).includes("Jay · ANONYMO"), "el WhatsApp va al celular con el mensaje y la firma de la casa");
  await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "whatsapp falso" }));
  const [ventana] = await Promise.all([ctx.waitForEvent("page"), tarjeta.locator("a:has-text('WhatsApp')").click()]);
  await ventana.close();
  await tarjeta.locator("[role=status]:has-text('Marcado como contactado')").waitFor({ timeout: 15000 });
  exigir(await tarjeta.locator("select[aria-label=Estado]").inputValue() === "contactado", "al abrir WhatsApp queda como contactado");

  await tarjeta.locator("button:has-text('Más')").click();
  await tarjeta.locator("textarea").nth(1).fill("Atiende sábados. Quiere agendar en línea.");
  await tarjeta.locator("button:has-text('Guardar notas')").click();
  exigir(await tarjeta.locator("[role=status]:has-text('Guardando las notas')").isVisible({ timeout: 2000 }).catch(() => false) || await tarjeta.locator("[role=status]:has-text('Notas guardadas')").isVisible(), "al guardar dice que está guardando");
  await tarjeta.locator("[role=status]:has-text('Notas guardadas')").waitFor({ timeout: 15000 });
  const textoMensaje = tarjeta.locator("textarea").first();
  await textoMensaje.fill("Hola, mensaje escrito a mano.\n\nJay");
  await tarjeta.locator("button:has-text('Guardar mensaje')").click();
  await tarjeta.locator("[role=status]:has-text('Mensaje guardado')").waitFor({ timeout: 15000 });

  await p.reload();
  await p.waitForSelector("ul[aria-label=Negocios] > li");
  await p.selectOption("select[aria-label=Estado] >> nth=0", "todos");
  const otra = p.locator("li:has-text('Sonrisa Sin Web')");
  exigir(await otra.locator("select[aria-label=Estado]").inputValue() === "contactado", "al recargar sigue contactado (vive en la nube)");
  await otra.locator("button:has-text('Más')").click();
  exigir((await otra.locator("textarea").nth(1).inputValue()) === "Atiende sábados. Quiere agendar en línea.", "las notas siguen ahí");
  exigir(decodeURIComponent((await otra.locator("a:has-text('WhatsApp')").getAttribute("href")) ?? "").includes("mensaje escrito a mano"), "WhatsApp usa el mensaje escrito a mano");
  await otra.locator("button:has-text('Volver al de Imán')").click();
  await otra.locator("[role=status]:has-text('Volvió al mensaje de Imán')").waitFor({ timeout: 15000 });

  await p.fill("input[maxlength='120']", "Luna · ANONYMO");
  await p.click("button:has-text('Guardar firma')");
  await p.locator("[role=status]:has-text('Firma guardada')").waitFor({ timeout: 15000 });
  exigir(decodeURIComponent((await otra.locator("a:has-text('WhatsApp')").getAttribute("href")) ?? "").includes("Luna · ANONYMO"), "la firma nueva entra en los mensajes");

  await p.selectOption("select[aria-label='Tipo de web']", "sin");
  exigir((await p.locator("ul[aria-label=Negocios] > li").count()) === 1, "el filtro «Sin web» deja solo al que no tiene");
  await p.selectOption("select[aria-label='Tipo de web']", "todas");

  await otra.locator("a:has-text('Convertir en pedido')").click();
  await p.waitForURL(/estudio\/nuevo\?/);
  exigir((await p.inputValue("input[name=cliente]")) === "Sonrisa Sin Web", "el pedido nuevo trae el nombre del cliente");
  exigir(/Una web para Sonrisa Sin Web, odontólogo en Cuenca/.test(await p.locator("textarea").first().inputValue()), "y lo que Imán sabe del negocio");
  await p.screenshot({ path: join(capturas, "3-pedido.png") });

  // Fase 2 del mapa (sistema/70): el pedido crea el proyecto unido a la ficha y al prospecto, y se vuelve por los dos lados.
  await p.click("button:has-text('Que Atlas arme el plan')");
  await p.waitForURL(/estudio\/sonrisa-sin-web(\?|$)/, { timeout: 120000 });
  const enlaceFicha = p.locator("a:has-text('Ficha de Sonrisa Sin Web')");
  exigir(await enlaceFicha.waitFor({ timeout: 15000 }).then(() => true, () => false), "el proyecto tiene el enlace a la ficha del cliente");
  await enlaceFicha.click();
  await p.waitForURL(/estudio\/cliente\/sonrisa-sin-web$/);
  await p.locator("#t-historia").waitFor({ timeout: 15000 });
  const ficha = await p.locator("main").innerText();
  exigir(/Vino de Imán/.test(ficha) && /4\.8 \(95\)/.test(ficha), "la ficha muestra de dónde vino y su fama");
  exigir((await p.locator("section[aria-labelledby=t-proyectos] a[href='/estudio/sonrisa-sin-web']").count()) === 1, "la ficha lista el proyecto");
  exigir(/Imán lo encontró buscando «odontólogo» en Cuenca/.test(ficha) && /Pasó a «Contactado»/.test(ficha) && /Se convirtió en pedido/.test(ficha) && /Pedido nuevo/.test(ficha), "la historia junta lo de Imán y el pedido");
  exigir((await p.inputValue("input[name=telefono]")) === "099 000 0003", "el teléfono viene del prospecto");
  await p.fill("textarea[name=notas]", "Prefiere que lo llamen en la tarde.");
  await p.click("button:has-text('Guardar')");
  exigir(await p.locator("[role=status]:has-text('Ficha guardada')").waitFor({ timeout: 15000 }).then(() => true, () => false), "guardar la ficha dice qué pasó");
  exigir(new URL(p.url()).pathname === "/estudio/cliente/sonrisa-sin-web", "y se queda en la ficha");
  await p.reload();
  exigir((await p.inputValue("textarea[name=notas]")) === "Prefiere que lo llamen en la tarde.", "las notas quedan guardadas en la nube");
  await p.screenshot({ path: join(capturas, "5-ficha.png"), fullPage: true });
  await p.goto(`${B}/estudio/clientes/nuevos`);
  await p.selectOption("select[aria-label=Estado] >> nth=0", "todos");
  const ya = p.locator("li:has-text('Sonrisa Sin Web')");
  exigir((await ya.locator("select[aria-label=Estado]").inputValue()) === "cliente", "el prospecto quedó como cliente");
  exigir((await ya.locator("a:has-text('Ver el proyecto')").getAttribute("href")) === "/estudio/sonrisa-sin-web" && (await ya.locator("a:has-text('Ficha del cliente')").count()) === 1, "y desde el prospecto se llega al proyecto y a la ficha");
  await p.goto(`${B}/estudio/clientes`);
  exigir(await p.locator("ul[aria-label=Clientes] a[href='/estudio/cliente/sonrisa-sin-web']").waitFor({ timeout: 15000 }).then(() => true, () => false), "la cartera lo muestra");

  const movil = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const m = await movil.newPage();
  await m.goto(`${B}/estudio/clientes/nuevos`);
  await m.waitForSelector("ul[aria-label=Negocios] > li");
  const ancho = await m.evaluate(() => document.documentElement.scrollWidth);
  exigir(ancho <= 392, `en celular no se sale de la pantalla (${ancho}px)`);
  await m.screenshot({ path: join(capturas, "4-celular.png"), fullPage: true });
  for (const ruta of ["/estudio/clientes", "/estudio/cliente/sonrisa-sin-web"]) {
    await m.goto(B + ruta);
    const w = await m.evaluate(() => document.documentElement.scrollWidth);
    exigir(w <= 392, `${ruta} cabe en celular (${w}px)`);
  }
  await m.screenshot({ path: join(capturas, "6-ficha-celular.png"), fullPage: true });
  await movil.close();
} catch (e) {
  fallas.push(`se cortó: ${e.message}`);
  await p.screenshot({ path: join(capturas, "error.png") }).catch(() => {});
} finally {
  await nav.close();
  google.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}` : "\nTodo bien.");
process.exit(fallas.length ? 1 : 0);
