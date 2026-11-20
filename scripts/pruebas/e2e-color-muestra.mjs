// «Pruébala con tu color» (sistema/94), con nube.sh recién levantado (Supabase falso).
// Levanta su Google Maps falso y un servicio de avisos falso en 45999. Un consultorio sin web: su muestra llega en blanco
// y negro, el negocio elige su color (de la lista, de su logo o a mano), toda la página cambia, queda guardado y avisa a Jay.
// Uso: node scripts/pruebas/e2e-color-muestra.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { createECDH, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const F = "http://127.0.0.1:45999";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-color";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

// Los fondos de las muestras en blanco y negro (paleta.ts, NEUTRAS).
const FONDO_NEUTRO = { grafico: "#F4F4F2", sereno: "#F3F3F1", mosaico: "#FAFAF9", revista: "#FAFAF8", noche: "#0C0C0C" };
const LUGARES = [
  { id: "color-uno", displayName: { text: "Consultorio Dental Prisma" }, rating: 4.8, userRatingCount: 90, nationalPhoneNumber: "099 222 0001", googleMapsUri: "https://maps.google.com/?cid=21", formattedAddress: "Av. Solano 2-10, Cuenca" },
];
const avisos = [];
const servidor = createServer((req, res) => {
  const partes = [];
  req.on("data", (d) => partes.push(d));
  req.on("end", () => {
    if (req.url === "/v1/places:searchText") {
      const q = JSON.parse(Buffer.concat(partes).toString()).textQuery ?? "";
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ places: q.startsWith("odontólogo prueba") ? LUGARES : [] }));
    }
    if (req.url === "/push") { avisos.push({ bytes: Buffer.concat(partes).length }); res.writeHead(201); return res.end(); }
    res.writeHead(404); res.end();
  });
}).listen(45999, "127.0.0.1");
const esperarAvisos = async (n, ms = 15000) => { const t = Date.now(); while (avisos.length < n && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 200)); return avisos.length >= n; };
const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
const suscripcion = { endpoint: `${F}/push`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en el estudio: ${e.message}`));
const variable = (pg, nombre, donde = "[data-muestra]") => pg.evaluate(([n, d]) => getComputedStyle(document.querySelector(d)).getPropertyValue(n).trim().toUpperCase(), [nombre, donde]);
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  await p.goto(`${B}/estudio/clientes/nuevos`);
  await p.waitForSelector("button:has-text('Que Imán busque')");
  const r = await p.evaluate(async (s) => (await fetch("/estudio/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suscripcion: s, equipo: "Android" }) })).status, suscripcion);
  exigir(r === 200 && await esperarAvisos(1), "el celular de Jay recibe avisos");
  for (const g of ["Salud", "Legal y contable", "Belleza y bienestar"]) { const b = p.locator(`button[aria-pressed=true]:has-text('${g}')`); if (await b.count()) await b.click(); }
  await p.fill("input[placeholder^='Otras búsquedas']", "odontólogo prueba");
  await p.click("button:has-text('Que Imán busque')");
  exigir(await espera(p.locator("[role=status]:has-text('Listo: 1 negocio nuevo')"), 60000), "Imán encuentra el consultorio");
  const fila = p.locator("ul[aria-label=Negocios] > li", { hasText: "Consultorio Dental Prisma" });
  const enlace = await fila.locator("a:has-text('Muestra ↗')").getAttribute("href");

  // 1 · El negocio abre su muestra: sin su color, va en blanco y negro, y la barra se ve sin bajar.
  const negocio = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await negocio.newPage();
  m.on("pageerror", (e) => fallas.push(`error en la muestra: ${e.message}`));
  await m.goto(enlace);
  await m.waitForSelector("h1");
  const plantilla = await m.locator("[data-plantilla]").getAttribute("data-plantilla");
  exigir(await variable(m, "--m-fondo") === FONDO_NEUTRO[plantilla], `sin su color, la muestra va en blanco y negro (${plantilla})`);
  exigir((await m.locator("text=Es un boceto").count()) === 1 && /los textos, las fotos y los colores finales los definimos contigo/.test(await m.locator("[data-muestra] > p").first().innerText()), "dice una sola vez que es un boceto");
  const barra = m.locator("[data-color-muestra]");
  await m.waitForTimeout(2600); // el saludo se va solo
  const caja = await barra.boundingBox();
  exigir(!!caja && caja.y < 140, "«Pruébala con tu color» se ve arriba, sin bajar");
  exigir(await m.locator("[data-color-muestra] [role=radio][aria-checked=true]").getAttribute("aria-label") === "Blanco y negro", "empieza marcado «Blanco y negro»");
  await m.mouse.wheel(0, 1600); await m.waitForTimeout(400);
  const fija = await barra.boundingBox();
  exigir(!!fija && fija.y <= 1, "al bajar, la barra se queda arriba");
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "en celular nada se sale de la pantalla");
  await m.evaluate(() => scrollTo(0, 0));
  await m.screenshot({ path: join(capturas, "1-neutra.png") });

  // 2 · Elige un color de la lista: toda la página cambia al instante, también el asistente.
  const fondo0 = await variable(m, "--m-fondo"), bloque0 = await variable(m, "--m-bloque");
  await esperarAvisos(2, 8000); // el de «está viendo su muestra»
  const n0 = avisos.length;
  await barra.getByRole("radio", { name: "Azul", exact: true }).click();
  await m.waitForTimeout(200);
  const bloque1 = await variable(m, "--m-bloque");
  exigir(bloque1 !== bloque0 || (await variable(m, "--m-fondo")) !== fondo0, `la página cambia de color al instante (${bloque0} → ${bloque1})`);
  exigir(await variable(m, "--m-acento", "html") === await variable(m, "--m-acento"), "el asistente toma los mismos colores");
  await m.screenshot({ path: join(capturas, "2-azul.png") });

  // 3 · Queda guardado: al volver, la ve con su color, y a Jay le suena el celular una sola vez.
  exigir(await esperarAvisos(n0 + 1, 8000), "a Jay le llega el aviso de que eligió su color");
  await barra.getByRole("radio", { name: "Verde", exact: true }).click();
  await m.waitForTimeout(1600);
  await m.reload(); await m.waitForSelector("h1");
  exigir(await m.locator("[data-color-muestra] [role=radio][aria-checked=true]").getAttribute("aria-label") === "Verde", "al volver, su muestra tiene el último color que eligió");
  exigir(avisos.length === n0 + 1, `cambiar de color otra vez no vuelve a avisar (${avisos.length - n0})`);

  // 4 · Desde su logo: el color sale de la imagen, en su celular.
  const png = await m.evaluate(() => { const c = document.createElement("canvas"); c.width = 120; c.height = 60; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 120, 60); x.fillStyle = "#6A1B9A"; x.fillRect(10, 10, 60, 40); x.fillStyle = "#111"; x.fillRect(80, 20, 30, 20); return c.toDataURL("image/png").split(",")[1]; });
  await m.locator("[data-color-muestra] input[type=file]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  exigir(await espera(m.locator("[data-color-muestra] [role=status]:has-text('tomamos el color de tu logo')")), "con su logo, dice que tomó su color");
  const deLogo = await m.locator("[data-color-muestra] [role=radio][aria-checked=true]").getAttribute("aria-label");
  exigir(/^Tu color #[0-9A-F]{6}$/.test(deLogo ?? "") || deLogo === "Morado", `y queda elegido el color de su logo (${deLogo})`);

  // 5 · A mano: un gris no sirve, y lo dice.
  await m.locator("[data-color-muestra] input[type=color]").fill("#808080");
  exigir(await espera(m.locator("[data-color-muestra] [role=status]:has-text('casi blanco, negro o gris')")), "un gris no se acepta y dice por qué");
  await m.locator("[data-color-muestra] input[type=color]").fill("#0a7a52");
  await m.waitForTimeout(1600);
  await m.screenshot({ path: join(capturas, "3-a-mano.png"), fullPage: false });

  // 6 · En el estudio se ve que lo eligió el negocio.
  await p.goto(`${B}/estudio/clientes/nuevos`);
  const otra = p.locator("ul[aria-label=Negocios] > li", { hasText: "Consultorio Dental Prisma" });
  await otra.locator("button:has-text('Más')").click();
  exigir(await espera(otra.locator("text=Lo eligió el negocio en su muestra.")), "el estudio dice que el color lo eligió el negocio");

  // 7 · En escritorio, la barra entra en una línea.
  const esc = await negocio.browser().newContext({ viewport: { width: 1440, height: 900 } });
  const e = await esc.newPage();
  await e.goto(enlace); await e.waitForSelector("h1"); await e.waitForTimeout(6000);
  const alto = (await e.locator("[data-color-muestra]").boundingBox())?.height ?? 999;
  exigir(alto <= 64, `en escritorio la barra es de una línea (${Math.round(alto)} px)`);
  await e.screenshot({ path: join(capturas, "4-escritorio.png") });
  await esc.close();
  await negocio.close();
} catch (x) {
  fallas.push(`la prueba se cayó: ${x.message}`);
  console.log(`✗ la prueba se cayó: ${x.message}`);
} finally {
  await nav.close();
  servidor.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
