// Captura las referencias del banco (sistema/55) a 1440 y 390 px y los logos, SOLO para medir al juez.
// Las imágenes van a _banco/capturas en el almacén privado (Supabase) y nunca al repo (proyectos/ está ignorado).
// Uso (en una máquina con internet; con SUPABASE_* en .env.local las sube al almacén privado):
//   node --experimental-strip-types scripts/banco/capturar.ts [--disciplina web] [--id web-x] [--faltan] [--solo-arquetipos]
import "../../packages/pipeline/src/env.ts";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { carpeta } from "../../packages/pipeline/src/almacen.ts";
import { leerBanco, leerCapturas, registrarCaptura, type Referencia } from "../../packages/pipeline/src/banco.ts";
import { bajarProyecto, nubeConfigurada, subirRuta } from "../../packages/pipeline/src/nube.ts";
import { contenidoArquetipo, logoArquetipo, webArquetipo } from "./arquetipos.ts";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const tiene = (k: string) => process.argv.includes(`--${k}`);
const nube = nubeConfigurada() && !tiene("sin-nube");
if (nube) await bajarProyecto("_agencia", fetch, false).catch(() => 0);

const dir = join(carpeta(), "_banco", "capturas");
mkdirSync(dir, { recursive: true });
const ya = leerCapturas();
let refs = leerBanco().filter((r) => r.disciplina !== "naming"); // naming es texto: no tiene imagen
if (arg("disciplina")) refs = refs.filter((r) => r.disciplina === arg("disciplina"));
if (arg("id")) refs = refs.filter((r) => r.id === arg("id"));
if (tiene("faltan")) refs = refs.filter((r) => !ya[r.id]?.length);
if (tiene("solo-arquetipos")) refs = refs.filter((r) => r.plantilla);

const nav: Browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let bien = 0, mal = 0;
async function guardar(r: Referencia, archivo: string, ancho: number | undefined, tipo: "image/jpeg" | "image/png", b: Buffer) {
  writeFileSync(join(dir, archivo), b);
  registrarCaptura(r.id, { archivo, ancho, tipo, sha256: createHash("sha256").update(b).digest("hex"), fecha: new Date().toISOString() });
  if (nube) await subirRuta(`_banco/capturas/${archivo}`);
}
async function sacar(r: Referencia, ancho: number, html?: string) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: ancho > 1000 ? 900 : 844 }, isMobile: ancho < 1000, deviceScaleFactor: 1, locale: "es-EC" });
  const p = await ctx.newPage();
  try {
    if (html) await p.setContent(html, { waitUntil: "load" });
    else await p.goto(r.url!, { waitUntil: "load", timeout: 45_000 });
    await p.waitForTimeout(html ? 200 : 4000); // las webs premiadas suelen tener una entrada animada
    const alto = Math.min(await p.evaluate(() => document.documentElement.scrollHeight), ancho > 1000 ? 2400 : 1700);
    const b = await p.screenshot({ type: "jpeg", quality: 70, fullPage: true, clip: { x: 0, y: 0, width: ancho, height: Math.max(alto, 600) } });
    await guardar(r, `${r.id}-${ancho}.jpg`, ancho, "image/jpeg", b);
  } finally { await ctx.close(); }
}
async function logo(r: Referencia) {
  const ctx = await nav.newContext({ viewport: { width: 800, height: 800 } });
  const p = await ctx.newPage();
  try {
    if (r.plantilla) await p.setContent(`<body style="margin:0">${logoArquetipo(r.plantilla, r.rubro)}</body>`);
    else {
      const resp = await fetch(r.imagen!, { headers: { "user-agent": "Mozilla/5.0 (banco de calibración)" }, signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) throw new Error(`imagen ${resp.status}`);
      const tipo = resp.headers.get("content-type") ?? "";
      const bytes = Buffer.from(await resp.arrayBuffer());
      const src = `data:${tipo.includes("svg") ? "image/svg+xml" : tipo || "image/png"};base64,${bytes.toString("base64")}`;
      await p.setContent(`<body style="margin:0;display:grid;place-items:center;width:800px;height:800px;background:#fff"><img src="${src}" style="max-width:640px;max-height:640px"></body>`);
    }
    // En redes la imagen es una pieza; en identidad, el logo.
    await guardar(r, `${r.id}-${r.disciplina === "contenido" ? "pieza" : "logo"}.png`, undefined, "image/png", await p.screenshot({ type: "png" }));
  } finally { await ctx.close(); }
}

for (const r of refs) {
  try {
    if (r.disciplina === "web") {
      if (r.plantilla) { const h = webArquetipo(r.plantilla, r.rubro); await sacar(r, 1440, h); await sacar(r, 390, h); }
      else if (r.url) { await sacar(r, 1440); await sacar(r, 390); }
      else continue;
    } else if (r.disciplina === "contenido") {
      // Redes (sistema/60): feed genérico dibujado, o la pieza si hay imagen, o la página del caso.
      if (r.plantilla) { const h = contenidoArquetipo(r.plantilla, r.rubro); await sacar(r, 1440, h); await sacar(r, 390, h); }
      else if (r.imagen) await logo(r);
      else if (r.url) { await sacar(r, 1440); await sacar(r, 390); }
      else continue;
    } else if (r.plantilla || r.imagen) await logo(r);
    else if (r.url) await sacar(r, 1440); // sin imagen directa del logo: la página del caso
    else continue;
    bien++; console.log("✓", r.id);
  } catch (e) { mal++; console.log("✗", r.id, (e as Error).message.split("\n")[0]); }
}
await nav.close();
if (nube) await subirRuta("_agencia/banco-capturas.json");
console.log(`Listo: ${bien} capturadas, ${mal} con error${nube ? " · subidas al almacén privado" : " · solo en disco (sin nube)"}. Carpeta: ${dir}`);
