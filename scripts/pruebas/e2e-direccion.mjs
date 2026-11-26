// La Dirección del cliente (sistema/117), con nube.sh levantado (IA falsa). Levanta aquí una web falsa en el 45778.
// Leer la marca de su web, aprobar «esto entendí», subir su guía en PDF (manda sobre la web), escribir lo de ustedes
// y ver que todo queda con su origen. Nada sale a internet.
// Uso: node scripts/pruebas/e2e-direccion.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const SITIO = "http://127.0.0.1:45778";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-direccion";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const PORTADA = `<!doctype html><html><head><title>Peluquería Sol</title><link rel="stylesheet" href="/estilo.css">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet"></head>
<body><header><img class="logo" src="/logo.svg" alt="Peluquería Sol"></header><h1>Peluquería Sol</h1><p>Cortes y color en Cuenca.</p></body></html>`;
const CSS = `body{background:#fffaf3;color:#1b1b1b;font-family:Inter,sans-serif}h1{font-family:"Space Grotesk";color:#e4572e}.b{background:#e4572e}a{color:#e4572e}`;
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#e4572e"/></svg>`;
const sitio = createServer((q, r) => {
  const u = new URL(q.url, SITIO);
  const [tipo, cuerpo] = u.pathname === "/" ? ["text/html; charset=utf-8", PORTADA] : u.pathname === "/estilo.css" ? ["text/css", CSS] : u.pathname === "/logo.svg" ? ["image/svg+xml", LOGO] : ["text/plain", "no"];
  r.writeHead(cuerpo === "no" ? 404 : 200, { "content-type": tipo }); r.end(cuerpo);
}).listen(45778, "127.0.0.1");
const PDF = join(capturas, "guia-de-marca.pdf");
writeFileSync(PDF, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Un cliente nuevo: la Dirección es lo primero y dice cómo empezar.
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Peluquería Sol");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/peluqueria-sol/);
  exigir(await espera(p.locator("[data-direccion-vacia]")), "sin Dirección, dice cómo empezar");
  const orden = await p.locator("#direccion, #saber").evaluateAll((xs) => xs.map((x) => x.id));
  exigir(orden[0] === "direccion", "la Dirección va antes que «Qué se puede hacer»");
  exigir(await p.locator("[data-leer-marca]").isDisabled(), "sin web, leer la marca está apagado");

  // 2 · Con su web: «esto entendí» con colores, letras y logo; al aprobar, queda con su origen.
  await p.locator("summary:has-text('Editar contacto y notas')").click();
  await p.locator("form:has([name=notas]) [name=web]").fill(`${SITIO}/`);
  await p.locator("form:has([name=notas]) button:has-text('Guardar')").click();
  await espera(p.locator("[role=status]"));
  await p.goto(`${B}/estudio/cliente/peluqueria-sol`);
  await p.locator("[data-leer-marca]").click();
  const entendi = p.locator("[data-entendi]");
  exigir(await espera(entendi, 30000), "leer la web muestra «esto entendí»");
  const hexes = await entendi.locator("[data-colores] li").allInnerTexts();
  exigir(hexes.some((h) => h.includes("#e4572e")) && hexes.some((h) => h.includes("#1b1b1b")), `saca los colores de su web (${hexes.map((h) => h.split("\n")[0]).join(", ")})`);
  exigir(/Space Grotesk/.test(await entendi.locator("[data-letras]").innerText()), "saca la letra que carga de Google Fonts");
  exigir(await entendi.locator("[data-logo]").count() === 1, "encuentra el logo");
  await p.screenshot({ path: join(capturas, "1-entendi-web.png"), fullPage: true });
  await p.locator("[data-aprobar-direccion]").click();
  exigir(await espera(p.locator("[role=status]:has-text('Aprobado')")), "al aprobar dice que los agentes ya la usan");
  exigir(await p.locator("[data-entendi]").count() === 0 && await p.locator("#direccion [data-direccion] [data-colores] li").count() >= 2, "queda en la Dirección");
  exigir(await p.locator("#direccion [data-colores] [aria-label='de su web']").count() >= 2, "cada color dice que salió de su web");

  // 3 · Su guía en PDF manda: sus colores reemplazan a los de la web.
  await p.locator("[data-guia]").setInputFiles(PDF);
  await p.locator("button:has-text('Leer la guía')").click();
  exigir(await espera(p.locator("[data-entendi]:has-text('su guía')"), 30000), "la guía muestra «esto entendí de su guía»");
  await p.locator("[data-aprobar-direccion]").click();
  await espera(p.locator("[role=status]:has-text('Aprobado')"));
  const col = await p.locator("#direccion [data-direccion] [data-colores]").innerText();
  exigir(/#01095c/.test(col) && !/#e4572e/.test(col), "los colores de la guía mandan sobre los de la web");
  exigir(/No deformar el logo/.test(await p.locator("#direccion").innerText()), "lo que la guía prohíbe queda en «No»");
  exigir(/Guía: guia-de-marca\.pdf/.test(await p.locator("#direccion").innerText()), "queda guardada qué guía se subió");

  // 4 · Lo de ustedes: qué es bueno para este cliente, lo que sí y lo que no.
  await p.locator("[data-editar-direccion] summary").click();
  await p.locator("[data-editar-direccion] [name=referencias]").fill("https://notfound.es — cómo muestran el trabajo");
  await p.locator("[data-editar-direccion] [name=si]").fill("Fotos reales del local");
  await p.locator("[data-guardar-direccion]").click();
  exigir(await espera(p.locator("[role=status]:has-text('Dirección guardada')")), "guardar lo de ustedes avisa");
  exigir(/notfound\.es/.test(await p.locator("[data-bueno]").innerText()), "«qué es bueno» muestra la referencia con su nota");
  exigir(/No deformar el logo/.test(await p.locator("#direccion").innerText()), "escribir lo de ustedes no borra lo de la guía");
  await p.screenshot({ path: join(capturas, "2-direccion.png"), fullPage: true });

  // 5 · Celular: entra en 390 px.
  const cel = await nav.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await ctx.storageState() });
  await cel.goto(`${B}/estudio/cliente/peluqueria-sol#direccion`);
  const ancho = await cel.evaluate(() => document.documentElement.scrollWidth);
  exigir(ancho <= 392, `en el celular no hay scroll de lado (${ancho})`);
  await cel.locator("#direccion").screenshot({ path: join(capturas, "3-celular.png") });
  await cel.close();
  await ctx.close();
} finally {
  await nav.close();
  sitio.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
