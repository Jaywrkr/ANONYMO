// El recordatorio a los 3 días y la propuesta con «Aceptar» (sistema/80), con nube.sh recién levantado (Supabase falso).
// Siembra la lista de prospectos en la nube falsa (uno contactado hace 4 días, otro ayer, uno nuevo), despacha la tanda,
// abre la propuesta como el negocio, la acepta (suena el celular) y revisa que el escritorio lo ponga primero.
// Uso: node scripts/pruebas/e2e-seguimiento.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { createECDH, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const F = "http://127.0.0.1:45999";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-seguimiento";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

// 0 · La lista sembrada en la nube falsa (con la misma función que usa el estudio para guardar).
const dia = 24 * 60 * 60 * 1000;
const hace = (d) => new Date(Date.now() - d * dia).toISOString();
const prospecto = (id, nombre, telefono, estado, contactado) => ({
  id, nombre, ciudad: "Cuenca", rubro: "notaría", resenas: 40, estrellas: 4.7, telefono, estado,
  agregado: hace(6), actualizado: hace(contactado ?? 6), historial: contactado === undefined ? [] : [{ cuando: hace(contactado), que: "Pasó a «Contactado»", por: "jay" }],
});
const lista = {
  actualizado: new Date().toISOString(), firma: "Jay, de ANONYMO", numero: "099 555 0000",
  prospectos: {
    "seg-uno": prospecto("seg-uno", "Notaría Vega", "099 111 0010", "contactado", 4),
    "seg-dos": prospecto("seg-dos", "Notaría Ayer", "099 111 0011", "contactado", 1),
    "seg-tres": prospecto("seg-tres", "Notaría Nueva", "099 111 0012", "nuevo"),
  },
};
execFileSync("node", ["--experimental-strip-types", "-e", `const pl = await import("./packages/pipeline/src/index.ts"); await pl.cambiarProspectos((l) => { Object.assign(l, ${JSON.stringify(lista)}); });`], {
  env: { ...process.env, ANONYMO_NUBE: "1", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_KEY: "x", SUPABASE_BUCKET: "proyectos", ANONYMO_PROYECTOS: "/tmp/anonymo-pruebas/seguimiento" },
  stdio: "inherit",
});

const avisos = [];
const servidor = createServer((req, res) => {
  const partes = [];
  req.on("data", (d) => partes.push(d));
  req.on("end", () => {
    if (req.url === "/push") { avisos.push(Buffer.concat(partes).length); res.writeHead(201); return res.end(); }
    res.writeHead(404); res.end();
  });
}).listen(45999, "127.0.0.1");
const esperarAvisos = async (n, ms = 15000) => { const t = Date.now(); while (avisos.length < n && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 200)); return avisos.length >= n; };
const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
const suscripcion = { endpoint: `${F}/push`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const wa = [];
const atajarWa = (c) => c.route(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => { wa.push(r.request().url()); return r.fulfill({ status: 200, body: "whatsapp" }); });
await atajarWa(ctx);
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en el estudio: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  const r = await p.evaluate(async (s) => (await fetch("/estudio/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suscripcion: s, equipo: "Android" }) })).status, suscripcion);
  exigir(r === 200 && await esperarAvisos(1), "el celular queda anotado para avisos");

  // 1 · La tanda empieza por el recordatorio.
  await p.goto(`${B}/estudio/clientes/tanda`);
  const tarjeta = p.locator("article");
  exigir(/Notaría Vega/.test(await tarjeta.innerText()) && /Recordatorio · le escribiste hace 4 días/.test(await tarjeta.innerText()), "la tanda empieza por el recordatorio de hace 4 días");
  const texto = await tarjeta.innerText();
  const propuesta = texto.match(/http:\/\/127\.0\.0\.1:3100\/p\/[a-z0-9-]+/)?.[0];
  exigir(!!propuesta && /no es el momento/.test(texto), `el recordatorio lleva la propuesta y no presiona (${propuesta})`);
  await p.screenshot({ path: join(capturas, "1-recordatorio.png") });
  const enviar = p.locator("a:has-text('Enviar recordatorio')");
  const [ventana] = await Promise.all([ctx.waitForEvent("page"), enviar.click()]);
  await ventana.close().catch(() => {});
  exigir(await espera(p.locator("[role=status]:has-text('Recordatorio enviado a Notaría Vega')")), "enviar el recordatorio dice qué pasó");
  exigir(wa.some((u) => u.includes("593991110010") && decodeURIComponent(u).includes("/p/")), "el WhatsApp va al negocio con su propuesta");
  exigir(/Notaría Nueva/.test(await tarjeta.innerText()) && await p.locator("a:has-text('Enviar por WhatsApp')").count() === 1, "después sigue la tanda de nuevos");
  exigir(!/Notaría Ayer/.test(await p.locator("body").innerText()), "al de ayer todavía no le toca");
  exigir(/0 de 20/.test(await p.locator("text=enviados hoy").locator("..").innerText()), "el recordatorio no cuenta para el tope de nuevos");
  await p.reload();
  exigir(!/Recordatorio/.test(await p.locator("article").innerText()), "el recordatorio no se repite");

  // 2 · La propuesta, como el negocio.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await atajarWa(cel);
  const n = await cel.newPage();
  n.on("pageerror", (e) => fallas.push(`error en la propuesta: ${e.message}`));
  const rp = await n.goto(propuesta);
  exigir(rp?.status() === 200 && /Notaría Vega/.test(await n.locator("h1").innerText()), "la propuesta abre con el nombre del negocio");
  exigir(await n.locator("text=USD 390 + IVA").count() >= 1 && await n.locator("text=Lista en 7 días").count() === 1 && await n.locator("text=50 % al aceptar").count() >= 1, "dice precio, plazo y forma de pago");
  exigir(await n.locator("text=USD 19 + IVA").count() >= 1 && await n.locator("text=Sesión de fotos con Luna").count() === 1, "y el plan mensual y los extras");
  exigir((await n.locator("meta[name=robots]").getAttribute("content"))?.includes("noindex"), "Google no la indexa");
  exigir(await n.evaluate(() => document.documentElement.scrollWidth) <= 392, "la propuesta cabe en celular");
  exigir(!(await n.locator("header nav").count()) && !(await n.locator("text=Puntaje").count()) && !(await n.getByText(/Despertando agentes/).count()) && await n.locator("text=Parte de la muestra que ya viste").count() === 1, "sin el menú ni el arranque de la web, sin nada interno y hablándole de tú");
  exigir(await esperarAvisos(2), "abrir la propuesta hace sonar el celular");
  await n.screenshot({ path: join(capturas, "2-propuesta.png"), fullPage: true });
  await n.click("button:has-text('Aceptar propuesta')");
  await n.waitForURL(/wa\.me/, { timeout: 10000 }).catch(() => {});
  const aAnonymo = wa.find((u) => u.includes("wa.me/593995550000"));
  exigir(!!aAnonymo && decodeURIComponent(aAnonymo).includes("acepto la propuesta de web para Notaría Vega"), "«Aceptar» abre el WhatsApp de ANONYMO con el mensaje listo");
  exigir(await esperarAvisos(3), "y suena el celular");
  const n2 = await cel.newPage();
  await n2.goto(propuesta);
  exigir(await n2.locator("[role=status]:has-text('Propuesta aceptada')").count() === 1, "al volver, la propuesta ya dice que está aceptada");
  await cel.close();

  // 3 · El escritorio lo pone primero.
  await p.goto(`${B}/estudio/clientes/nuevos`);
  exigir(/Notaría Vega aceptó la propuesta/.test(await p.locator("section[aria-label='Ahora mismo']").innerText()), "«Ahora mismo» dice quién aceptó la propuesta");
  await p.selectOption("select[aria-label=Estado] >> nth=0", "todos");
  exigir(await p.locator("ul[aria-label=Negocios] li", { hasText: "Notaría Vega" }).locator("text=Aceptó la propuesta").count() >= 1, "y la tarjeta lo marca");
  exigir(await p.evaluate(() => document.documentElement.scrollWidth) <= 392, "el escritorio sigue cabiendo en celular");

  const fuera = await nav.newContext();
  exigir((await (await fuera.newPage()).goto(`${B}/p/no-existe-123`))?.status() === 404, "una propuesta que no existe da 404");
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
