// Departamento de video de punta a punta (sistema/62, por partes y sin transcripción desde sistema/64),
// con nube.sh levantado (Supabase falso). Sube un video con sonido en tres partes, espera a que se escuche,
// quita una parte tocándola, arma el 9:16, lo descarga y comprueba tamaño y duración.
// Uso: node scripts/pruebas/e2e-video.mjs [carpeta-capturas]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-video";
mkdirSync(capturas, { recursive: true });
const ffmpeg = process.env.ANONYMO_FFMPEG ?? join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

/** Video de 9 s con «voz» (un tono) en 0,9–2,4 · 4,0–5,2 · 5,6–7,9 s y casi silencio en el resto. */
function videoDePrueba(ruta) {
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=9", "-f", "lavfi", "-i", "aevalsrc='if(between(t,0.9,2.4)+between(t,4.0,5.2)+between(t,5.6,7.9),0.4*sin(2*PI*330*t),0.003*sin(2*PI*50*t))':s=44100:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", ruta]);
  return ruta;
}

const dir = mkdtempSync(join(tmpdir(), "e2e-video-"));
const entrada = videoDePrueba(join(dir, "Reel lanzamiento.mp4"));

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="luna"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-luna"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

await p.click("nav >> text=Video");
await p.waitForURL(/estudio\/video$/);
exigir(await espera(p.locator("h1", { hasText: "Video." }), 15000), "la página de video abre desde la barra");
exigir(!/transcri|Whisper|OPENAI/i.test(await p.locator("body").innerText()), "no se habla de transcripción");
await p.setInputFiles('input[type="file"]', entrada);
await p.fill('input[placeholder^="Por ejemplo"]', "Marca de prueba");
await p.screenshot({ path: join(capturas, "1-subir.png") });
await p.click("button:has-text('Subir video')");
exigir(await p.locator("[role=alertdialog]").first().isVisible({ timeout: 3000 }).catch(() => false), "al subir aparece la espera de inmediato");
await p.waitForURL(/estudio\/video\/v-reel-lanzamiento-/, { timeout: 60000 });
const id = p.url().split("/").pop();
exigir(await espera(p.locator("[role=alertdialog]:has-text('Escuchando el video')"), 15000), "se escucha solo y muestra la espera");
await p.screenshot({ path: join(capturas, "2-escuchando.png") });
await p.locator("#titulo-partes").waitFor({ timeout: 60000 });
await p.waitForLoadState("networkidle");
exigir(await p.locator("[role=status]:has-text('dividimos el video en partes')").isVisible().catch(() => false), "dice que terminó de escuchar");
const partes = p.locator("section[aria-labelledby=titulo-partes] li > button[aria-pressed]");
exigir((await partes.count()) === 3, `encontró las 3 partes con sonido (${await partes.count()})`);
const fondo = await partes.first().evaluate((b) => getComputedStyle(b).backgroundImage);
exigir(/cuadros\.jpg/.test(fondo), "cada parte muestra su miniatura");
const hoja = await p.evaluate((u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(`${i.naturalWidth}x${i.naturalHeight}`); i.onerror = () => ok(""); i.src = u; }), `/estudio/video/${id}/archivo/cuadros.jpg`);
// 3 miniaturas de 120×214 en una fila, con 4 px entre ellas.
exigir(hoja === "368x214", `la hoja de miniaturas carga en el navegador (${hoja || "no cargó"})`);
const resumen = await p.locator("text=/Queda .* de 0:09/").innerText();
exigir(/pausas/.test(resumen), `quita las pausas solo: «${resumen}»`);

// Quitar la parte 2 tocándola.
await partes.nth(1).click();
exigir((await partes.nth(1).getAttribute("aria-pressed")) === "true", "tocar una parte la quita");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });
exigir(/partes que quitaste/.test(await p.locator("text=/Queda .* de 0:09/").innerText()), "el resumen cuenta la parte quitada");
await p.evaluate(() => { const v = document.querySelector("video"); v.muted = true; });
await p.click("button[aria-label=Reproducir]");
await p.waitForTimeout(800);
exigir(await p.locator("button[aria-label=Pausar]").isVisible(), "la vista previa se reproduce");
await p.click("button[aria-label=Pausar]").catch(() => {});
await p.screenshot({ path: join(capturas, "3-editor.png") });

// Armar el 9:16 y descargarlo.
const fila = p.locator("li", { hasText: "Vertical 9:16" });
await fila.locator("button:has-text('Armar')").click();
exigir(await p.locator("[role=alertdialog]:has-text('Armando')").isVisible({ timeout: 3000 }).catch(() => false), "al armar aparece la espera con el formato");
await p.locator("[role=status]:has-text('armado')").waitFor({ timeout: 120000 });
const [descarga] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), fila.locator("a:has-text('Descargar')").click()]);
exigir(/Reel lanzamiento 9x16\.mp4$/.test(descarga.suggestedFilename()), `la descarga se llama como el video (${descarga.suggestedFilename()})`);
const salida = join(dir, "final.mp4");
await descarga.saveAs(salida);
const info = (() => { try { execFileSync(ffmpeg, ["-hide_banner", "-i", salida], { stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { return String(e.stderr); } return ""; })();
const dur = Number(/Duration: 00:00:(\d+\.\d+)/.exec(info)?.[1]);
exigir(/1080x1920/.test(info), "el video final es 1080×1920");
// Quedan las partes 1 y 3 (1,5 s + 2,3 s) más los respiros de cada corte: unos 4,3 s.
exigir(dur > 3.6 && dur < 5, `el video final dura lo que queda (${dur} s de 9 s)`);
await p.screenshot({ path: join(capturas, "4-listo.png") });

// Devolver la parte deja el 9:16 viejo.
await partes.nth(1).click();
exigir(await espera(fila.locator("button:has-text('Volver a armar')"), 10000), "cambiar la edición pide volver a armar");

await p.goto(`${B}/estudio/video`);
exigir(await p.locator(`a[href="/estudio/video/${id}"]:has-text('1 formato listo')`).isVisible(), "la lista muestra el video con 1 formato listo");

const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const m = await cel.newPage();
await m.goto(`${B}/estudio/video/${id}`);
await m.locator("#titulo-partes").waitFor();
const ancho = await m.evaluate(() => document.documentElement.scrollWidth);
exigir(ancho <= 392, `sin desplazamiento horizontal en celular (${ancho}px)`);
await m.locator("#titulo-partes").scrollIntoViewIfNeeded();
await m.screenshot({ path: join(capturas, "5-celular.png") });

const ajeno = await (await nav.newContext()).request.get(`${B}/estudio/video/${id}/estado`, { maxRedirects: 0 });
exigir(ajeno.status() === 307 || ajeno.status() === 403, `sin sesión no hay acceso (${ajeno.status()})`);

await nav.close();
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien. Capturas en " + capturas);
if (fallas.length) process.exitCode = 1;
