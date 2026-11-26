// Auditoría de la interfaz (sistema/116): captura todas las pantallas del estudio en escritorio y celular
// y mide lo que se puede medir: alto de la página, tamaños de letra, botones visibles, desbordes de lado.
// Uso: node scripts/pruebas/auditar-pantallas.mjs [carpeta]   (con nube.sh levantado y algo de datos)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
const B = "http://127.0.0.1:3100";
const dir = process.argv[2] ?? "/tmp/auditoria"; mkdirSync(dir, { recursive: true });
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
const fijas = ["/estudio", "/estudio?vista=completa", "/estudio/nuevo", "/estudio/clientes", "/estudio/clientes/nuevos", "/estudio/clientes/tanda", "/estudio/clientes/tablero", "/estudio/clientes/plantillas", "/estudio/contenido", "/estudio/video", "/estudio/video/marcas", "/estudio/biblioteca", "/estudio/oficina", "/estudio/estado", "/estudio/gasto", "/estudio/criterio", "/estudio/banco", "/estudio/conexiones", "/estudio/analitica", "/estudio/papelera"];
const enlaces = async (url, re) => { await p.goto(B + url); return [...new Set((await p.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).filter((h) => re.test(h ?? "")))]; };
const dinamicas = [];
const proy = (await enlaces("/estudio?vista=completa", /^\/estudio\/[a-z0-9-]+$/)).filter((h) => !fijas.some((f) => f.split("?")[0] === h) && !/\/(nuevo|clientes|contenido|video|biblioteca|oficina|estado|gasto|criterio|banco|conexiones|analitica|papelera)$/.test(h))[0];
if (proy) dinamicas.push(proy, ...["atlas", "avisos", "calidad", "direcciones", "guardados", "propuesta", "revisar", "web"].map((t) => `${proy}/${t}`));
const cli = (await enlaces("/estudio/clientes", /^\/estudio\/cliente\/[^/?]+$/))[0]; if (cli) dinamicas.push(cli);
const mes = (await enlaces("/estudio/contenido", /^\/estudio\/contenido\/[^/?]+$/))[0]; if (mes) dinamicas.push(mes);
const vid = (await enlaces("/estudio/video", /^\/estudio\/video\/(?!marcas)[^/?]+$/))[0]; if (vid) dinamicas.push(vid);
const filas = [];
const medir = async (pg) => pg.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const main = document.querySelector("main") ?? document.body;
  const tam = [...main.querySelectorAll("h1,h2,h3,p,a,button,span,li,label")].filter(vis).map((e) => parseFloat(getComputedStyle(e).fontSize));
  const botones = [...main.querySelectorAll("button,a[class*='rounded']")].filter(vis);
  return { alto: document.documentElement.scrollHeight, ancho: document.documentElement.scrollWidth, tamanos: [...new Set(tam.map(Math.round))].sort((a, b) => a - b).join(","), botones: botones.length, palabras: (main.innerText.match(/\S+/g) ?? []).length, h1: [...main.querySelectorAll("h1")].map((h) => getComputedStyle(h).fontSize).join(" ") };
});
const cel = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, storageState: await ctx.storageState() });
for (const ruta of [...fijas, ...dinamicas]) {
  const nombre = ruta.replace(/^\/estudio\/?/, "").replace(/[/?=]/g, "_") || "inicio";
  try {
    await p.goto(B + ruta, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    const e = await medir(p); await p.screenshot({ path: join(dir, `e-${nombre}.png`), fullPage: true });
    await cel.goto(B + ruta, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    const c = await medir(cel); await cel.screenshot({ path: join(dir, `c-${nombre}.png`), fullPage: true });
    filas.push({ ruta, escritorio: e, celular: c });
    console.log(`${ruta}\n  escritorio alto ${e.alto} · ${e.palabras} palabras · ${e.botones} botones · h1 ${e.h1} · letras ${e.tamanos}\n  celular alto ${c.alto} · ancho ${c.ancho} · ${c.palabras} palabras · ${c.botones} botones`);
  } catch (x) { console.log(ruta, "falló", x.message); }
}
writeFileSync(join(dir, "medidas.json"), JSON.stringify(filas, null, 1));
await nav.close();
