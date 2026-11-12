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
  { id: "muestra-uno", displayName: { text: "Barbería Don Bigote" }, rating: 4.9, userRatingCount: 150, nationalPhoneNumber: "099 111 0001", googleMapsUri: "https://maps.google.com/?cid=11", formattedAddress: "Calle Larga 7-41, Cuenca" },
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
  exigir(await m.locator("text=Calle Larga 7-41, Cuenca").count() === 1 && await m.locator("text=4,9 en Google").count() === 1, "con su dirección y su fama");
  exigir(await m.locator("text=USD 390 + IVA").count() === 1 && await m.locator("text=Lista en 7 días").count() === 1, "la barra dice plazo y precio");
  exigir((await m.locator("meta[name=robots]").getAttribute("content"))?.includes("noindex"), "Google no la indexa");
  exigir(!(await m.locator("text=Puntaje").count()) && !(await m.locator("text=Sin web").count()), "no muestra nada interno");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 392, "la muestra cabe en celular");
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

  // 5 · «Quiero esta web».
  await m.locator("button:has-text('Quiero esta web')").click();
  await m.waitForURL(/wa\.me/, { timeout: 10000 }).catch(() => {});
  const aAnonymo = wa.find((u) => u.includes("wa.me/593995550000"));
  exigir(!!aAnonymo && decodeURIComponent(aAnonymo).includes("vi la idea de web para Barbería Don Bigote"), "«Quiero esta web» abre el WhatsApp de ANONYMO con el mensaje listo");
  exigir(await esperarAvisos(3), "y vuelve a sonar el celular");
  await negocio.close();
  await p.reload();
  exigir(/Barbería Don Bigote quiere su web/.test(await p.locator("section[aria-label='Ahora mismo']").innerText()), "el escritorio lo pone primero: quiere su web");

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
  exigir(encima === "Enviar por WhatsApp" && caja.y + caja.height <= 844, "el botón de enviar se ve y no lo tapa la barra del celular");
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
