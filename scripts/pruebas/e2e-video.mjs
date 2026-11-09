// Departamento de video de punta a punta (sistema/62), con nube.sh levantado (Supabase y Whisper falsos).
// Sube un video de prueba, espera la transcripción, quita una palabra tocando el texto, cambia la plantilla,
// arma el 9:16, lo descarga y comprueba su tamaño y duración. Uso: node scripts/pruebas/e2e-video.mjs [carpeta-capturas]
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

// Un video de 9 s: imagen de prueba y un tono (el texto lo pone el Whisper falso).
const dir = mkdtempSync(join(tmpdir(), "e2e-video-"));
const entrada = join(dir, "Reel lanzamiento.mp4");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=9", "-f", "lavfi", "-i", "sine=f=330:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", entrada]);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="luna"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-luna"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

// La barra lateral lleva a Video.
await p.click("nav >> text=Video");
await p.waitForURL(/estudio\/video$/);
exigir(await p.locator("h1", { hasText: "Video." }).waitFor({ timeout: 15000 }).then(() => true, () => false), "la página de video abre desde la barra");
await p.setInputFiles('input[type="file"]', entrada);
await p.fill('input[placeholder^="Por ejemplo"]', "Marca de prueba");
await p.screenshot({ path: join(capturas, "1-subir.png") });
await p.click("button:has-text('Subir y transcribir')");
// Al instante: la pantalla de espera bloquea.
exigir(await p.locator("[role=alertdialog]").first().isVisible({ timeout: 3000 }).catch(() => false), "al subir aparece la espera de inmediato");
await p.waitForURL(/estudio\/video\/v-reel-lanzamiento-/, { timeout: 60000 });
const id = p.url().split("/").pop();
// Se transcribe solo y muestra el avance.
await p.locator("[role=alertdialog]:has-text('Transcribiendo')").waitFor({ timeout: 15000 });
await p.screenshot({ path: join(capturas, "2-transcribiendo.png") });
await p.locator("text=Texto del video").waitFor({ timeout: 60000 });
await p.waitForLoadState("networkidle");
exigir(await p.locator("[role=status]:has-text('transcrito')").isVisible().catch(() => false), "dice que terminó de transcribir");
const palabras = await p.locator("section[aria-labelledby=titulo-texto] p button").allInnerTexts();
exigir(palabras.join(" ").includes("ANONYMO.") && palabras.length === 13, `el texto llegó con puntuación (${palabras.length} palabras)`);
const resumen = await p.locator("text=/Queda .* de 0:09/").innerText();
exigir(/pausas/.test(resumen) && /muletillas/.test(resumen), `quita pausas y la muletilla solo: «${resumen}»`);

// Quitar «Hoy» tocándolo.
await p.locator("section[aria-labelledby=titulo-texto] p button", { hasText: /^Hoy$/ }).click();
exigir(await p.locator("section[aria-labelledby=titulo-texto] p button.line-through", { hasText: /^Hoy$/ }).count() === 1, "tocar una palabra la tacha");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });
// Plantilla «Limpio» y vista previa con subtítulos.
await p.click("button:has-text('Limpio')");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });
await p.evaluate(() => { const v = document.querySelector("video"); v.muted = true; });
await p.click("button[aria-label=Reproducir]");
await p.waitForTimeout(1200);
const sub = await p.locator("section[aria-label='Vista previa'] [aria-hidden] span").first().innerText().catch(() => "");
exigir(sub.length > 0, `la vista previa muestra subtítulos («${sub}»)`);
await p.click("button[aria-label=Pausar]").catch(() => {});
await p.screenshot({ path: join(capturas, "3-editor.png") });

// Armar el 9:16 y descargarlo.
const fila = p.locator("li", { hasText: "Vertical 9:16" });
await fila.locator("button:has-text('Armar')").click();
exigir(await p.locator("[role=alertdialog]:has-text('Armando')").isVisible({ timeout: 3000 }).catch(() => false), "al armar aparece la espera con el formato");
await p.locator("[role=status]:has-text('armado')").waitFor({ timeout: 120000 });
exigir(await fila.locator("a:has-text('Descargar')").isVisible(), "aparece «Descargar» al terminar");
const [descarga] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), fila.locator("a:has-text('Descargar')").click()]);
exigir(/Reel lanzamiento 9x16\.mp4$/.test(descarga.suggestedFilename()), `la descarga se llama como el video (${descarga.suggestedFilename()})`);
const salida = join(dir, "final.mp4");
await descarga.saveAs(salida);
const info = (() => { try { execFileSync(ffmpeg, ["-hide_banner", "-i", salida], { stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { return String(e.stderr); } return ""; })();
const dur = /Duration: 00:00:(\d+\.\d+)/.exec(info)?.[1];
exigir(/1080x1920/.test(info), "el video final es 1080×1920");
exigir(dur && Number(dur) > 3 && Number(dur) < 7, `el video final quedó más corto que el original (${dur} s de 9 s)`);
await p.screenshot({ path: join(capturas, "4-listo.png") });

// Si cambia la edición, el resultado queda viejo y se ofrece volver a armar.
await p.click("button:has-text('Marca')");
await fila.locator("button:has-text('Volver a armar')").waitFor({ timeout: 10000 }).then(() => exigir(true, "cambiar la edición pide volver a armar"), () => exigir(false, "cambiar la edición pide volver a armar"));

// La lista muestra el video con su formato listo.
await p.goto(`${B}/estudio/video`);
exigir(await p.locator(`a[href="/estudio/video/${id}"]:has-text('1 formato listo')`).isVisible(), "la lista muestra el video con 1 formato listo");

// Celular: el editor se puede usar.
const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const m = await cel.newPage();
await m.goto(`${B}/estudio/video/${id}`);
await m.locator("text=Texto del video").waitFor();
const ancho = await m.evaluate(() => document.documentElement.scrollWidth);
exigir(ancho <= 392, `sin desplazamiento horizontal en celular (${ancho}px)`);
await m.screenshot({ path: join(capturas, "5-celular.png"), fullPage: true });

// Sin sesión no se ve nada.
const ajeno = await (await nav.newContext()).request.get(`${B}/estudio/video/${id}/estado`, { maxRedirects: 0 });
exigir(ajeno.status() === 307 || ajeno.status() === 403, `sin sesión no hay acceso (${ajeno.status()})`);

await nav.close();
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien. Capturas en " + capturas);
if (fallas.length) process.exitCode = 1;
