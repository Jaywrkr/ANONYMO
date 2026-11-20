// La ficha se llena sola (sistema/93), con nube.sh levantado. Levanta aquí mismo una web de negocio y un Instagram falsos
// en el puerto 45777 (nube.sh apunta INSTAGRAM_API_URL ahí). Nada sale a internet.
// Uso: node scripts/pruebas/e2e-ficha-sola.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const SITIO = "http://127.0.0.1:45777";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-ficha-sola";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const PORTADA = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta name="theme-color" content="#2A4D8F"><title>Consultorio Luz</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Physician","name":"Consultorio Luz","address":{"streetAddress":"Calle Larga 4-56","addressLocality":"Cuenca"},"openingHours":["Mo-Fr 08:30-17:30"]}</script></head>
<body><nav><a href="/">Inicio</a><a href="/servicios">Servicios</a></nav><h1>Consultorio Luz</h1>
<h2>Servicios</h2><ul><li>Medicina general</li><li>Control de presión</li></ul>
<a href="https://wa.me/593987654321">Escríbenos por WhatsApp</a><a href="https://www.tiktok.com/@consultorio.luz">TikTok</a></body></html>`;
const SERVICIOS = `<html><body><h1>Servicios</h1><h3>Medicina general</h3><h3>Control de presión</h3><h3>Certificados médicos</h3><h3>Visitas a domicilio</h3></body></html>`;
const hoy = Date.now();
const IG = { business_discovery: { username: "consultorio.luz", name: "Consultorio Luz", biography: "Medicina general en Cuenca. Citas al 098 765 4321", website: `${SITIO}/`, followers_count: 830, media_count: 120,
  media: { data: Array.from({ length: 12 }, (_, i) => ({ media_type: i % 4 ? "IMAGE" : "VIDEO", timestamp: new Date(hoy - i * 4 * 864e5).toISOString(), caption: "x" })) } } };

const sitio = createServer((q, r) => {
  const u = new URL(q.url, SITIO);
  if (u.pathname.startsWith("/graph/")) {
    const pide = decodeURIComponent(u.searchParams.get("fields") ?? "");
    const ok = pide.includes("username(consultorio.luz)") && u.searchParams.get("access_token") === "token-de-prueba";
    r.writeHead(ok ? 200 : 400, { "content-type": "application/json" });
    return r.end(JSON.stringify(ok ? IG : { error: { code: 110, message: "Invalid user id" } }));
  }
  r.writeHead(u.pathname === "/" || u.pathname === "/servicios" ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  r.end(u.pathname === "/" ? PORTADA : u.pathname === "/servicios" ? SERVICIOS : "no");
}).listen(45777, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Un cliente nuevo, sin web ni Instagram: no hay nada que leer y se dice qué anotar.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Consultorio Luz");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/consultorio-luz/);
  const caja = p.locator("[data-buscar-datos]");
  exigir(await espera(caja) && await caja.locator("button:has-text('Buscar datos')").isDisabled() && /Anota su Instagram/.test(await caja.innerText()), "sin web ni Instagram, el botón está apagado y dice qué anotar");

  // 2 · Se anota su Instagram y se busca: su Instagram lleva a su web, y de las dos salen propuestas con su fuente.
  await p.locator("[data-form-saber] [name=saber-instagram]").fill("@consultorio.luz");
  await p.locator("button:has-text('Guardar lo que sabemos')").click();
  await espera(p.locator("[role=status]:has-text('Guardado')"));
  const cuenta = async () => Number((await p.locator("#saber").innerText()).match(/(\d+) de 22 datos/)?.[1] ?? -1);
  const antes = await cuenta();
  await caja.locator("button:has-text('Buscar datos')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Encontramos')"), 40000), "buscar dice cuántos datos encontró");
  exigir(await caja.locator("[data-estado=ok]").count() === 2 && /Su web: leída · 2 páginas/.test(await caja.innerText()), "leyó su Instagram y su web (portada y servicios)");
  const propuestas = await caja.locator("[data-propuesta]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-propuesta")));
  exigir(["celular", "direccion", "horario", "servicios", "fotos", "canales", "frecuencia", "color"].every((k) => propuestas.includes(k)) && !propuestas.includes("instagram"), `propone lo que falta y no lo que ya sabía (${propuestas.join(", ")})`);
  exigir(/de su web \(página \/servicios\)/.test(await caja.locator("[data-propuesta=servicios]").innerText()), "cada dato dice de dónde salió");
  exigir(await caja.locator("[name=valor-servicios]").inputValue() === "Medicina general\nControl de presión\nCertificados médicos\nVisitas a domicilio", "los servicios salen de su página de servicios, uno por línea");
  exigir(/TikTok/.test(await caja.locator("[name=valor-canales]").inputValue()) && /Instagram/.test(await caja.locator("[name=valor-canales]").inputValue()), "dónde publica junta lo de su web y su Instagram");
  exigir(await cuenta() === antes, "lo encontrado no cuenta hasta aprobarlo");
  await p.screenshot({ path: join(capturas, "1-propuestas.png"), fullPage: true });

  // 3 · Se aprueba lo que está bien, con una corrección, y se deja fuera lo que no.
  await caja.locator("#tomar-logo").uncheck();
    await caja.locator("[name=valor-servicios]").fill("Medicina general\nControl de presión\nCertificados médicos\nVisitas a domicilio\nTerapia respiratoria");
  await caja.locator("button:has-text('Guardar los marcados')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Guardamos')")), "guardar dice cuántos datos guardó");
  exigir(await caja.locator("[data-lectura]").count() === 0, "las propuestas se cierran al guardar");
  exigir(await cuenta() > antes + 5, `ahora se saben más datos (${antes} → ${await cuenta()})`);
  const f = p.locator("[data-form-saber]");
  exigir(/Terapia respiratoria/.test(await f.locator("[name=saber-servicios]").inputValue()) && await f.locator("[name=saber-celular]").inputValue() === "0987654321", "se guardó lo corregido, como escrito a mano");
  exigir(await f.locator("[name=saber-logo]").inputValue() === "", "lo desmarcado no se guardó");

  // 4 · Buscar de nuevo solo trae lo que quedó fuera; descartar no guarda nada.
  await caja.locator("button:has-text('Buscar datos')").click();
  await espera(p.locator("[role=status]:has-text('Encontramos')"), 40000);
  const otra = await caja.locator("[data-propuesta]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-propuesta")));
  exigir(otra.join() === "logo" && !otra.includes("servicios") && !otra.includes("celular"), `la segunda vez no repite lo guardado, aunque se haya corregido (${otra.join(", ")})`);
  await caja.locator("button:has-text('Descartar')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Descartado')")) && await f.locator("[name=saber-logo]").inputValue() === "", "descartar no guarda nada");

  // 5 · Una cuenta que Instagram no deja leer lo dice, sin romper nada.
  if (!(await f.isVisible())) await p.locator("summary:has-text('Lo que sabemos de')").click();
  await f.locator("[name=saber-instagram]").fill("@cuenta.personal");
  await f.locator("button:has-text('Guardar lo que sabemos')").click();
  await espera(p.locator("[role=status]:has-text('Guardado')"));
  await caja.locator("button:has-text('Buscar datos')").click();
  await espera(caja.locator("[data-lectura]"), 40000);
  exigir(/Su Instagram: no se pudo leer · No se pudo leer: la cuenta no existe o no es una cuenta de empresa/.test(await caja.innerText()), "una cuenta que no se puede leer dice por qué");
  exigir(!/token-de-prueba/.test(await p.content()), "la clave de Instagram nunca aparece en la página");
  await caja.locator("button:has-text('Descartar'), button:has-text('Cerrar')").first().click();
  await espera(p.locator("[role=status]:has-text('Descartado')"));
  await ctx.close();

  // 6 · En celular: la caja cabe y se puede usar.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: undefined });
  const m = await cel.newPage();
  await m.goto(`${B}/entrar`); await m.check('input[name="quien"][value="jay"]', { force: true }); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
  await m.goto(`${B}/estudio/cliente/consultorio-luz`);
  if (!(await m.locator("[data-form-saber]").isVisible())) await m.locator("summary:has-text('Lo que sabemos de')").click();
  await m.locator("[data-form-saber] [name=saber-instagram]").fill("@consultorio.luz");
  await m.locator("button:has-text('Guardar lo que sabemos')").click();
  await espera(m.locator("[role=status]:has-text('Guardado')"));
  await m.locator("[data-buscar-datos] button:has-text('Buscar datos')").click();
  await espera(m.locator("[data-propuesta]").first(), 40000);
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "en celular nada se sale de la pantalla");
  const alto = await m.locator("[data-buscar-datos] button:has-text('Guardar los marcados')").boundingBox();
  exigir(!!alto && alto.height >= 44, "los botones se tocan bien con el dedo");
  await m.locator("[data-buscar-datos]").screenshot({ path: join(capturas, "2-celular.png") });
  await cel.close();
} catch (e) {
  fallas.push(`la prueba se cayó: ${e.message}`);
  console.log(`✗ la prueba se cayó: ${e.message}`);
} finally {
  await nav.close();
  sitio.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
