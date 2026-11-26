// La galería de plantillas de Unmake (sistema/115), con nube.sh levantado.
// Todas las plantillas se ven, las imágenes del trabajo cargan, ningún texto se sale y la revisión avisa cuando no entra.
// Uso: node scripts/pruebas/e2e-plantillas.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-plantillas";
mkdirSync(capturas, { recursive: true });
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  await p.goto(`${B}/estudio/contenido`);
  await p.click("[data-ir-plantillas]");
  await p.waitForURL(/contenido\/plantillas/);
  exigir(await p.locator("h1", { hasText: "Plantillas de Unmake" }).count() === 1, "Contenido lleva a la galería de plantillas");
  const tipos = await p.locator("section[data-plantilla]").evaluateAll((s) => s.map((x) => x.getAttribute("data-plantilla")));
  exigir(["caso", "antesdespues", "proceso", "detalle", "frase", "lista", "dato", "portada", "aviso"].every((t) => tipos.includes(t)), `están todas las plantillas (${tipos.join(", ")})`);
  exigir(await p.locator('section[data-plantilla="caso"] [data-vista]').count() === 5, "el caso tiene 5 láminas");
  const revisiones = await p.locator("section[data-plantilla]:not([data-plantilla=aviso]) [data-revision]").allTextContents();
  exigir(revisiones.every((r) => r.includes("todo entra")), "los ejemplos pasan la revisión");
  exigir((await p.locator('section[data-plantilla="aviso"] [data-revision]').textContent()).includes("no entra"), "el ejemplo largo muestra el aviso");

  // Dentro de cada lámina: las imágenes cargan y ningún texto se sale de su caja.
  for (const s of await p.locator("section[data-plantilla] [data-vista]").all()) await s.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  let imagenes = 0, rotas = 0, desbordes = 0;
  for (const f of p.frames().filter((f) => f !== p.mainFrame())) {
    const r = await f.evaluate(() => ({
      img: document.images.length,
      rotas: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
      fuera: [...document.querySelectorAll("[data-caja]")].filter((e) => !e.style.outline && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2)).length,
    })).catch(() => ({ img: 0, rotas: 0, fuera: 0 }));
    imagenes += r.img; rotas += r.rotas; desbordes += r.fuera;
  }
  exigir(imagenes >= 10 && rotas === 0, `las imágenes del trabajo cargan (${imagenes}, ${rotas} rotas)`);
  exigir(desbordes === 0, `ningún texto se sale de su lugar (${desbordes})`);
  await p.screenshot({ path: join(capturas, "galeria-escritorio.png"), fullPage: true });

  const cel = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, storageState: await ctx.storageState() });
  await cel.goto(`${B}/estudio/contenido/plantillas`);
  const ancho = await cel.evaluate(() => document.documentElement.scrollWidth);
  exigir(ancho <= 392, `en el celular no hay scroll de lado (${ancho})`);
  await cel.waitForTimeout(1200);
  await cel.screenshot({ path: join(capturas, "galeria-celular.png") });
  await cel.close();
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
