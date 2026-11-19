// La muestra y la tanda de celular (sistema/72), con nube.sh recién levantado (Supabase falso).
// Levanta su Google Maps falso y un servicio de avisos falso en 45999. Busca barberías, anota un celular para avisos,
// abre la muestra como el negocio (cuenta y avisa) y como Jay (no cuenta), toca «Quiero esta web» y despacha la tanda en celular.
// Uso: node scripts/pruebas/e2e-muestra.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { createECDH, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const F = "http://127.0.0.1:45999";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-muestra";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const LUGARES = [
  { id: "muestra-uno", displayName: { text: "Barbería Don Bigote" }, rating: 4.9, userRatingCount: 150, nationalPhoneNumber: "099 111 0001", googleMapsUri: "https://maps.google.com/?cid=11", formattedAddress: "Calle Larga 7-41, Cuenca",
    regularOpeningHours: { weekdayDescriptions: ["lunes: 10:00–20:00", "martes: 10:00–20:00", "miércoles: 10:00–20:00", "jueves: 10:00–20:00", "viernes: 10:00–20:00", "sábado: 10:00–20:00", "domingo: 10:00–20:00"] } },
  { id: "muestra-dos", displayName: { text: "Barbería La Navaja" }, rating: 4.3, userRatingCount: 12, nationalPhoneNumber: "099 111 0002" },
];
const avisos = [];
const servidor = createServer((req, res) => {
  const partes = [];
  req.on("data", (d) => partes.push(d));
  req.on("end", () => {
    if (req.url === "/v1/places:searchText") {
      const q = JSON.parse(Buffer.concat(partes).toString()).textQuery ?? "";
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ places: q.startsWith("barbería") ? LUGARES : [] }));
    }
    if (req.url === "/push") {
      avisos.push({ headers: req.headers, bytes: Buffer.concat(partes).length });
      res.writeHead(201); return res.end();
    }
    res.writeHead(404); res.end();
  });
}).listen(45999, "127.0.0.1");
const esperarAvisos = async (n, ms = 15000) => { const t = Date.now(); while (avisos.length < n && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 200)); return avisos.length >= n; };

// Una suscripción de navegador hecha a mano: claves válidas y la dirección del servicio falso.
const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
const suscripcion = { endpoint: `${F}/push`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const wa = [];
const atajarWa = (c) => c.route(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => { wa.push(r.request().url()); return r.fulfill({ status: 200, body: "whatsapp" }); });
await atajarWa(ctx);
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en el estudio: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  await p.goto(`${B}/estudio/clientes/nuevos`);
  await p.waitForSelector("button:has-text('Que Imán busque')");

  // 1 · El número de ANONYMO y los avisos.
  await p.click("[role=note] button:has-text('Ponerlo')");
  await p.fill("input[aria-label='Tu WhatsApp']", "099 555 0000");
  await p.locator("section[aria-label=Ajustes] div", { has: p.locator("input[aria-label='Tu WhatsApp']") }).last().locator("button:has-text('Guardar')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Número guardado')")), "guardar el número de ANONYMO dice qué pasó");
  await p.reload();
  await p.waitForSelector("button:has-text('Que Imán busque')");
  exigir(!(await p.locator("section[aria-label=Ajustes]").count()) && await p.locator("button:has-text('Ajustes')").count() === 1, "con el número puesto, los ajustes quedan cerrados en un botón");
  await p.click("button:has-text('Ajustes')");
  const r = await p.evaluate(async (s) => { const x = await fetch("/estudio/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suscripcion: s, equipo: "Android" }) }); return { status: x.status, j: await x.json() }; }, suscripcion);
  exigir(r.status === 200 && r.j.enviados === 1, `anotar el celular manda un aviso de prueba (${r.status} ${JSON.stringify(r.j)})`);
  exigir(await esperarAvisos(1) && avisos[0].headers["content-encoding"] === "aes128gcm" && /^vapid /.test(avisos[0].headers.authorization ?? ""), "el aviso va cifrado y firmado (Web Push)");
  exigir(await p.locator("text=Avisarme en este celular").count() > 0 || await p.locator("text=Este navegador no recibe avisos").count() > 0, "el escritorio ofrece activar los avisos");

  // 2 · Imán busca y cada negocio trae su muestra en el mensaje.
  for (const g of ["Salud", "Legal y contable", "Belleza y bienestar"]) await p.click(`button[aria-pressed=true]:has-text('${g}')`);
  await p.fill("input[placeholder^='Otras búsquedas']", "barbería");
  await p.click("button:has-text('Que Imán busque')");
  exigir(await espera(p.locator("[role=status]:has-text('Listo: 2 negocios nuevos')"), 60000), "Imán encuentra las dos barberías");
  const uno = p.locator("ul[aria-label=Negocios] > li", { hasText: "Barbería Don Bigote" });
  const enlace = await uno.locator("a:has-text('Muestra ↗')").getAttribute("href");
  exigir(/^http:\/\/127\.0\.0\.1:3100\/m\/barberia-don-bigote-[0-9a-f]{6}$/.test(enlace ?? ""), `cada negocio tiene su muestra (${enlace})`);
  await uno.locator("button:has-text('Más')").click();
  exigir((await uno.locator("textarea").first().inputValue()).includes(`sin compromiso: ${enlace}`), "el primer mensaje lleva el enlace a la muestra");
  await uno.locator("button:has-text('Cerrar')").click();

  // 3 · Si la abre Jay, no cuenta.
  const yo = await ctx.newPage();
  await yo.goto(enlace);
  await yo.waitForSelector("h1");
  await yo.waitForTimeout(1500);
  await yo.close();
  exigir(avisos.length === 1, "si Jay abre la muestra no se avisa");

  // 4 · La abre el negocio, en su celular.
  const negocio = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await atajarWa(negocio);
  const m = await negocio.newPage();
  m.on("pageerror", (e) => fallas.push(`error en la muestra: ${e.message}`));
  await m.goto(enlace);
  exigir((await m.locator("h1").innerText()) === "Barbería Don Bigote", "la muestra lleva el nombre del negocio");
  exigir(await m.locator("text=Idea de web para Barbería Don Bigote, hecha por ANONYMO").count() === 1, "dice que es una idea y quién la hizo");
  exigir(await m.locator("text=Calle Larga 7-41, Cuenca").count() >= 1 && await m.getByText(/4,9/).count() >= 1, "con su dirección y su fama");
  exigir(await m.getByText("Lunes a domingo").count() === 1 && await m.getByText("10:00 – 20:00").count() >= 1 && await m.getByText("Los textos son de ejemplo.").count() === 1, "lleva su horario real de Google y solo los textos se dicen de ejemplo");
  exigir(await m.locator("text=USD 390 + IVA").count() === 1 && await m.locator("text=Lista en 7 días").count() === 1, "la barra dice plazo y precio");
  exigir((await m.locator("meta[name=robots]").getAttribute("content"))?.includes("noindex"), "Google no la indexa");
  exigir(!(await m.locator("text=Puntaje").count()) && !(await m.locator("text=Sin web").count()), "no muestra nada interno");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "la muestra cabe en celular");
  // El saludo de entrada (sistema/87): su nombre en una cortina que se levanta sola y no tapa los toques.
  const saludo = m.locator("[data-saludo]");
  exigir(await saludo.count() === 1 && /Barbería Don Bigote: hicimos esto para ustedes/.test(await saludo.textContent()) && /4,9 en Google con \d+ reseñas/.test(await saludo.textContent()), "al abrir, la muestra saluda al negocio por su nombre y con su nota de Google");
  await m.waitForTimeout(1200);
  await m.screenshot({ path: join(capturas, "0-saludo.png") });
  exigir(await saludo.evaluate((e) => getComputedStyle(e).pointerEvents === "none"), "y el saludo no tapa los toques");
  exigir(await esperarAvisos(2) && avisos[1].bytes > 0, "al abrirla suena el celular de Jay");
  await m.locator("button:has-text('Agendar por WhatsApp')").first().click();
  exigir(await espera(m.locator("[role=status]:has-text('este botón abrirá tu WhatsApp')"), 3000), "los botones de ejemplo explican qué harán");
  await m.screenshot({ path: join(capturas, "1-muestra.png"), fullPage: true });
  await m.reload();
  await m.waitForSelector("h1");
  await m.waitForTimeout(1200);
  exigir(avisos.length === 2, "recargar no vuelve a avisar");

  await p.reload();
  const ahora = p.locator("section[aria-label='Ahora mismo']");
  exigir(await espera(ahora) && /Barbería Don Bigote.*está viendo su muestra/.test(await ahora.innerText()), "el escritorio dice quién está viendo su muestra ahora");
  exigir(await ahora.locator("a:has-text('Llamar')").getAttribute("href") === "tel:0991110001", "y deja llamarle de un toque");
  exigir(await p.locator("ul[aria-label=Negocios] li", { hasText: "Barbería Don Bigote" }).locator("text=Vio su muestra 1 vez").count() === 1, "la tarjeta dice que vio su muestra");

  // 4b · El negocio pone sus fotos y la muestra se rehace con ellas (sistema/82).
  exigir(!(await m.locator("img[data-foto]").count()), "sin fotos, la muestra se resuelve con color y tipografía");
  await m.setInputFiles("input[aria-label='Elegir fotos']", ["scripts/pruebas/imagen.png", "scripts/pruebas/imagen.png"]);
  exigir(await espera(m.locator("[role=status]:has-text('tus 2 fotos ya están en la página')")), "subir fotos dice qué pasó");
  exigir(await espera(m.locator("img[data-foto]").nth(1)), "y la muestra ya las enseña");
  const foto = await m.evaluate(async () => { const r = await fetch(document.querySelector("img[data-foto]").src); return { s: r.status, t: r.headers.get("content-type"), n: (await r.arrayBuffer()).byteLength }; });
  exigir(foto.s === 200 && foto.t === "image/jpeg" && foto.n > 3000 && foto.n < 1_500_000, `la foto llega achicada y en JPEG (${foto.n} bytes)`);
  exigir(await m.locator("button:has-text('Cambiar mis fotos')").count() === 1 && await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "el botón pasa a «Cambiar mis fotos» y sigue cabiendo en celular");
  const mala = await m.evaluate(async (u) => (await fetch(u, { method: "POST", body: new Uint8Array(5000) })).status, `${enlace}/fotos/1`);
  const cuarta = await m.evaluate(async (u) => (await fetch(u, { method: "POST", body: new Uint8Array(5000) })).status, `${enlace}/fotos/4`);
  exigir(mala === 400 && cuarta === 404, "lo que no es una foto no entra, ni una cuarta");
  exigir(await esperarAvisos(3), "y a Jay le suena el celular: subió sus fotos");
  await m.evaluate(() => document.querySelectorAll("img[data-foto]").forEach((i) => { i.loading = "eager"; }));
  await m.waitForTimeout(600);
  await m.screenshot({ path: join(capturas, "1b-con-fotos.png"), fullPage: true });

  // 4c · El asistente de demostración (sistema/87): contesta con los datos del negocio y enseña el aviso que le llegaría.
  await m.locator("[data-asistente-abrir]").click();
  const chat = m.locator("[data-asistente]");
  exigir(await espera(chat) && /Demostración/.test(await chat.innerText()), "la muestra tiene un asistente para probar, y dice que es una demostración");
  await chat.locator("button:has-text('¿Qué horario tienen?')").click();
  exigir(await espera(chat.locator("text=Lunes a domingo: 10:00 – 20:00")), "contesta el horario real del negocio");
  await chat.getByLabel("Escribe una pregunta").fill("quiero un turno para el sábado");
  await chat.getByLabel("Enviar").click();
  exigir(await espera(chat.locator("[data-aviso]")) && /quiero un turno para el sábado/.test(await chat.locator("[data-aviso]").innerText()), "si alguien quiere un turno, enseña el aviso que le llegaría al dueño");
  await chat.getByLabel("Escribe una pregunta").fill("aceptan tarjeta de crédito?");
  await chat.getByLabel("Escribe una pregunta").press("Enter");
  exigir(await espera(chat.locator("text=Eso todavía no lo sé")), "lo que no sabe, no lo inventa");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "el asistente cabe en celular");
  await m.waitForTimeout(500);
  await m.screenshot({ path: join(capturas, "1c-asistente.png") });
  await m.keyboard.press("Escape");
  exigir(!(await chat.count()) && await m.locator("[data-asistente-abrir]").count() === 1, "se cierra con Esc");
  await m.waitForTimeout(800);
  exigir(avisos.length === 3, "probar el asistente no hace sonar el celular");
  await p.reload();
  exigir(await espera(p.locator("ul[aria-label=Negocios] li", { hasText: "Barbería Don Bigote" }).locator("text=Probó el asistente")), "pero la tarjeta dice que probó el asistente");

  // 5 · «Quiero esta web».
  await m.locator("button:has-text('Quiero esta web')").click();
  await m.waitForURL(/wa\.me/, { timeout: 10000 }).catch(() => {});
  const aAnonymo = wa.find((u) => u.includes("wa.me/593995550000"));
  exigir(!!aAnonymo && decodeURIComponent(aAnonymo).includes("vi la idea de web para Barbería Don Bigote"), "«Quiero esta web» abre el WhatsApp de ANONYMO con el mensaje listo");
  exigir(await esperarAvisos(4), "y vuelve a sonar el celular");
  await negocio.close();
  await p.reload();
  exigir(/Barbería Don Bigote quiere su web/.test(await p.locator("section[aria-label='Ahora mismo']").innerText()), "el escritorio lo pone primero: quiere su web");

  // 5a · Ventas de un vistazo (sistema/89): el inicio dice qué toca hoy, el marcador cuenta la semana y el tablero ordena por etapa.
  const v = await p.context().newPage();
  v.on("pageerror", (e) => fallas.push(`error en ventas: ${e.message}`));
  await v.goto(`${B}/estudio`);
  const hoyVentas = v.locator("[data-ventas-hoy]");
  exigir(await espera(hoyVentas) && /Hoy en ventas/.test(await hoyVentas.innerText()) && /de 20 enviados hoy/.test(await hoyVentas.innerText()), "el inicio abre con lo que toca hoy en ventas");
  exigir(/de 50 mensajes/.test(await v.locator("[data-marcador]").first().innerText()) && /1\s*abrió su muestra/.test(await v.locator("[data-marcador]").first().innerText()), "y con el marcador de la semana: mensajes contra la meta y quién abrió");
  await v.screenshot({ path: join(capturas, "3-inicio-ventas.png"), fullPage: true });
  await hoyVentas.locator("a:has-text('Ver el tablero')").click();
  await v.waitForURL(/clientes\/tablero/);
  await v.waitForSelector("[data-etapa=cliente]");
  exigir(await v.locator("[data-etapa]").count() === 6, "el tablero tiene las seis etapas");
  exigir(await v.locator("[data-etapa=quiere] li", { hasText: "Barbería Don Bigote" }).count() === 1 && /Tocó «Quiero esta web»/.test(await v.locator("[data-etapa=quiere]").innerText()), "quien tocó «Quiero esta web» pasó solo a «Quieren su web»");
  exigir(!(await v.locator("[data-etapa=nuevo] li", { hasText: "Barbería Don Bigote" }).count()) && !(await v.locator("[data-etapa=escrito] li", { hasText: "Barbería Don Bigote" }).count()), "y ya no está en las etapas anteriores");
  await v.screenshot({ path: join(capturas, "3-tablero.png"), fullPage: true });
  await v.setViewportSize({ width: 390, height: 844 });
  await v.reload();
  await v.waitForSelector("[data-etapa=cliente]");
  await v.waitForTimeout(500);
  exigir(await v.evaluate(() => document.documentElement.scrollWidth) <= 392, "el tablero cabe en celular: las columnas se deslizan dentro");
  await v.screenshot({ path: join(capturas, "3-tablero-celular.png") });
  await v.goto(`${B}/estudio`);
  await v.waitForSelector("[data-ventas-hoy]");
  await v.waitForTimeout(500);
  exigir(await v.evaluate(() => document.documentElement.scrollWidth) <= 392, "y el inicio con ventas también cabe en celular");
  await v.screenshot({ path: join(capturas, "3-inicio-ventas-celular.png") });
  const meta = await v.evaluate(async () => { const r = await fetch("/estudio/clientes/ajustes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ meta: 30 }) }); const mala = await fetch("/estudio/clientes/ajustes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ meta: 2 }) }); return [r.status, (await r.json()).meta, mala.status]; });
  exigir(meta[0] === 200 && meta[1] === 30 && meta[2] === 400, "la meta de la semana se puede cambiar, dentro de lo razonable");
  await v.close();

  // 5b · Plantillas (sistema/79): cada muestra sale con una de dos, y Jay puede cambiarla.
  const tarjetaDon = p.locator("ul[aria-label=Negocios] li", { hasText: "Barbería Don Bigote" });
  await tarjetaDon.getByRole("button", { name: "Más", exact: true }).click();
  const sel = tarjetaDon.locator("select[aria-label=Plantilla]");
  const antesPl = await sel.inputValue();
  const otra = antesPl === "sereno" ? "grafico" : "sereno";
  await sel.selectOption(otra);
  exigir(await espera(p.locator("[role=status]:has-text('Su muestra ahora es')")), "cambiar la plantilla dice qué pasó");
  const m2 = await (await nav.newContext()).newPage();
  await m2.goto(enlace);
  exigir(await m2.locator(`[data-plantilla=${otra}]`).count() === 1, `la muestra ya se ve en «${otra}»`);
  exigir(await m2.evaluate(() => document.documentElement.scrollWidth) <= 1300, "y no se desborda");
  await m2.context().close();
  await p.goto(`${B}/estudio/clientes/plantillas`);
  exigir(await p.locator("iframe").count() === 5, "la página de plantillas muestra las 5");
  exigir(/Todavía no hay muestras enviadas/.test(await p.locator("section[aria-label='Cuál funciona mejor']").innerText()), "y dice que aún no hay con qué comparar");
  const ej = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const rEj = await ej.goto(`${B}/m/ejemplo/salud/grafico`);
  exigir(rEj?.status() === 200 && await ej.locator("[data-plantilla=grafico]").count() === 1 && await ej.evaluate(() => document.documentElement.scrollWidth) <= 392, "el ejemplo público abre y cabe en celular");
  exigir((await ej.locator("meta[name=robots]").getAttribute("content"))?.includes("noindex"), "y Google no lo indexa");
  const rMal = await ej.goto(`${B}/m/ejemplo/nada/raro`);
  exigir(rMal?.status() === 404, "un ejemplo que no existe da 404");
  await ej.context().close();

  // 6a · En computadora, la tanda se despacha con el teclado (sistema/77): S salta sin tocar nada.
  await p.goto(`${B}/estudio/clientes/tanda`);
  const primero = (await p.locator("article h2").innerText()).trim();
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.locator("article").click({ position: { x: 5, y: 5 } }).catch(() => {});
  await p.keyboard.press("s");
  exigir(await p.locator("article h2").filter({ hasNotText: primero }).waitFor({ timeout: 5000 }).then(() => true, () => false), "la tecla S salta al siguiente");
  exigir(await p.locator("a:has-text('Enviar por WhatsApp') kbd").isVisible(), "los botones muestran su tecla");

  // 6 · La tanda en el celular, de uno en uno.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  await atajarWa(cel);
  const t = await cel.newPage();
  t.on("pageerror", (e) => fallas.push(`error en la tanda: ${e.message}`));
  await t.goto(`${B}/estudio/clientes/nuevos`);
  await t.click("a:has-text('Empezar la tanda')");
  await t.waitForURL(/clientes\/tanda$/);
  const tarjeta = t.locator("article");
  exigir(/Barbería Don Bigote/.test(await tarjeta.innerText()), "la tanda empieza por el de más puntaje");
  const enviar = t.locator("a:has-text('Enviar por WhatsApp')");
  const caja = await enviar.boundingBox();
  const encima = caja && await t.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent, { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 });
  exigir(encima?.startsWith("Enviar por WhatsApp") && caja.y + caja.height <= 844, "el botón de enviar se ve y no lo tapa la barra del celular");
  await t.screenshot({ path: join(capturas, "2-tanda.png") });
  await t.click("button:has-text('Saltar')");
  exigir(/Barbería La Navaja/.test(await tarjeta.innerText()), "Saltar pasa al siguiente");
  const antes = wa.length;
  const [ventana] = await Promise.all([cel.waitForEvent("page"), enviar.click()]);
  await ventana.close().catch(() => {});
  exigir(await espera(t.locator("[role=status]:has-text('Enviado a Barbería La Navaja')")), "Enviar abre WhatsApp, lo marca y sigue");
  exigir(wa.slice(antes).some((u) => u.includes("593991110002") && decodeURIComponent(u).includes("/m/barberia-la-navaja-")), "el WhatsApp va al negocio con su muestra");
  exigir(/1 de 20/.test(await t.locator("text=enviados hoy").locator("..").innerText()), "cuenta lo enviado hoy");
  exigir(/Barbería Don Bigote/.test(await tarjeta.innerText()), "el saltado vuelve al final");
  await t.click("button:has-text('Descartar')");
  exigir(await espera(t.locator("text=Tanda lista por hoy.")), "al terminar lo dice");
  await cel.close();

  const fuera = await nav.newContext();
  const r404 = await (await fuera.newPage()).goto(enlace);
  exigir(r404?.status() === 404, "la muestra de un descartado ya no se abre");
  await fuera.close();
} catch (e) {
  fallas.push(`se cortó: ${e.message}`);
  await p.screenshot({ path: join(capturas, "error.png") }).catch(() => {});
} finally {
  await nav.close();
  servidor.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}` : "\nTodo bien.");
process.exit(fallas.length ? 1 : 0);
