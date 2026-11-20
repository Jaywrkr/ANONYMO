// La ficha se llena sola desde la web del negocio (sistema/93; Instagram queda a pedido desde sistema/94), con nube.sh levantado.
// Levanta aquí mismo una web de negocio falsa en el puerto 45777. Nada sale a internet.
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
<a href="https://wa.me/593987654321">Escríbenos por WhatsApp</a><a href="https://www.instagram.com/consultorio.luz/">Instagram</a><a href="https://www.tiktok.com/@consultorio.luz">TikTok</a></body></html>`;
const SERVICIOS = `<html><body><h1>Servicios</h1><h3>Medicina general</h3><h3>Control de presión</h3><h3>Certificados médicos</h3><h3>Visitas a domicilio</h3></body></html>`;
const sitio = createServer((q, r) => {
  const u = new URL(q.url, SITIO);
  r.writeHead(u.pathname === "/" || u.pathname === "/servicios" ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  r.end(u.pathname === "/" ? PORTADA : u.pathname === "/servicios" ? SERVICIOS : "no");
}).listen(45777, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Un cliente nuevo, sin web: no hay nada que leer y se dice qué anotar.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Consultorio Luz");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/consultorio-luz/);
  const caja = p.locator("[data-buscar-datos]");
  exigir(await espera(caja) && await caja.locator("button:has-text('Buscar datos')").isDisabled() && /Anota su web/.test(await caja.innerText()), "sin web, el botón está apagado y dice qué anotar");

  // 2 · Se anota su web y se busca: salen propuestas con su fuente.
  await p.locator("summary:has-text('Editar contacto y notas')").click();
  await p.locator("form:has([name=notas]) [name=web]").fill(`${SITIO}/`);
  await p.locator("form:has([name=notas]) button:has-text('Guardar')").click();
  await espera(p.locator("[role=status]:has-text('Ficha guardada')"));
  const cuenta = async () => Number((await p.locator("#saber").innerText()).match(/(\d+) de 22 datos/)?.[1] ?? -1);
  const antes = await cuenta();
  await caja.locator("button:has-text('Buscar datos')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Encontramos')"), 40000), "buscar dice cuántos datos encontró");
  exigir(/Su web: leída · 2 páginas/.test(await caja.innerText()), "leyó su web: la portada y la de servicios");
  const propuestas = await caja.locator("[data-propuesta]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-propuesta")));
  exigir(["celular", "direccion", "horario", "servicios", "color", "instagram", "canales"].every((k) => propuestas.includes(k)), `propone lo que encontró (${propuestas.join(", ")})`);
  exigir(/de su web \(página \/servicios\)/.test(await caja.locator("[data-propuesta=servicios]").innerText()), "cada dato dice de dónde salió");
  exigir(await caja.locator("[name=valor-servicios]").inputValue() === "Medicina general\nControl de presión\nCertificados médicos\nVisitas a domicilio", "los servicios salen de su página de servicios, uno por línea");
  exigir(await caja.locator("[name=valor-canales]").inputValue() === "Instagram, TikTok", "dónde publica sale de los enlaces a sus redes");
  exigir(await cuenta() === antes, "lo encontrado no cuenta hasta aprobarlo");
  await p.screenshot({ path: join(capturas, "1-propuestas.png"), fullPage: true });

  // 3 · Se aprueba lo que está bien, con una corrección, y se deja fuera lo que no.
  await caja.locator("#tomar-color").uncheck();
  await caja.locator("[name=valor-servicios]").fill("Medicina general\nControl de presión\nCertificados médicos\nVisitas a domicilio\nTerapia respiratoria");
  await caja.locator("button:has-text('Guardar los marcados')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Guardamos')")), "guardar dice cuántos datos guardó");
  exigir(await caja.locator("[data-lectura]").count() === 0, "las propuestas se cierran al guardar");
  exigir(await cuenta() > antes + 4, `ahora se saben más datos (${antes} → ${await cuenta()})`);
  const f = p.locator("[data-form-saber]");
  if (!(await f.isVisible())) await p.locator("summary:has-text('Lo que sabemos de')").click();
  exigir(/Terapia respiratoria/.test(await f.locator("[name=saber-servicios]").inputValue()) && await f.locator("[name=saber-celular]").inputValue() === "0987654321", "se guardó lo corregido, como escrito a mano");
  exigir(await f.locator("[name=saber-color]").inputValue() === "", "lo desmarcado no se guardó");
  exigir(/Su Instagram \(@consultorio\.luz\) no se lee solo/.test(await caja.innerText()), "su Instagram queda a pedido, sin pedir conectar nada");

  // 4 · Buscar de nuevo solo trae lo que quedó fuera; descartar no guarda nada.
  await caja.locator("button:has-text('Buscar datos')").click();
  await espera(p.locator("[role=status]:has-text('Encontramos')"), 40000);
  const otra = await caja.locator("[data-propuesta]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-propuesta")));
  exigir(otra.join() === "color", `la segunda vez no repite lo guardado, aunque se haya corregido (${otra.join(", ")})`);
  await caja.locator("button:has-text('Descartar')").click();
  exigir(await espera(p.locator("[role=status]:has-text('Descartado')")) && await f.locator("[name=saber-color]").inputValue() === "", "descartar no guarda nada");
  await ctx.close();

  // 6 · En celular: la caja cabe y se puede usar.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: undefined });
  const m = await cel.newPage();
  await m.goto(`${B}/entrar`); await m.check('input[name="quien"][value="jay"]', { force: true }); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
  await m.goto(`${B}/estudio/cliente/consultorio-luz`);
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
