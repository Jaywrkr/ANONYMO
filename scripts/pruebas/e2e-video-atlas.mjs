// Fase 2 del departamento de video (sistema/63), con nube.sh levantado (Supabase, Whisper y Anthropic falsos).
// Luna sube el video con el pedido escrito; Atlas lo aplica solo al terminar la transcripción y arma el 9:16.
// Después pide un cambio por chat, lo deshace y comprueba que la conversación queda guardada.
// Uso: node scripts/pruebas/e2e-video-atlas.mjs [carpeta-capturas]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-video-atlas";
mkdirSync(capturas, { recursive: true });
const ffmpeg = process.env.ANONYMO_FFMPEG ?? join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const dir = mkdtempSync(join(tmpdir(), "e2e-video-atlas-"));
const entrada = join(dir, "Testimonio clinica.mp4");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=9", "-f", "lavfi", "-i", "sine=f=330:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", entrada]);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
// Anota cada pantalla de espera que aparece, aunque dure un instante (la IA falsa responde muy rápido).
await p.addInitScript(() => {
  window.__esperas = [];
  new MutationObserver(() => document.querySelectorAll("[role=alertdialog]").forEach((d) => { const t = d.getAttribute("aria-label"); if (t && window.__esperas.at(-1) !== t) window.__esperas.push(t); })).observe(document, { subtree: true, childList: true });
});
const vistas = () => p.evaluate(() => window.__esperas);
await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="luna"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-luna"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

// 1. Subir con el pedido escrito (el ejemplo del documento del módulo).
await p.goto(`${B}/estudio/video`);
await p.setInputFiles('input[type="file"]', entrada);
await p.fill("textarea", "Corta los silencios, pon subtítulos estilo marca, zoom en la frase clave y el logo al final, y expórtalo vertical");
await p.screenshot({ path: join(capturas, "1-subir-con-pedido.png") });
await p.click("button:has-text('Subir y transcribir')");
await p.waitForURL(/estudio\/video\/v-testimonio-clinica-/, { timeout: 60000 });

// 2. Transcribe, Atlas aplica el pedido solo y arma el 9:16.
exigir(await espera(p.locator("[role=status]:has-text('armado')"), 120000), "avisa que el 9:16 está listo");
const orden = await vistas();
console.log("   esperas:", orden.join(" → "));
const i = orden.indexOf("Atlas está leyendo tu pedido"), j = orden.indexOf("Armando el vertical 9:16");
exigir(i >= 0, "Atlas lee el pedido apenas termina la transcripción");
exigir(j > i, "después arma el 9:16 que pidió, sin tocar nada");
await p.screenshot({ path: join(capturas, "2-listo.png") });
const chat = p.locator("ol[aria-label='Conversación con Atlas']");
const textoChat = await chat.innerText();
exigir(/Corta los silencios/.test(textoChat), "el pedido de Luna queda en la conversación");
exigir(/✓ Quitar pausas de más de 0,6 s/.test(textoChat), "Atlas dice qué cambió (pausas)");
exigir(/Todavía no: Zoom/.test(textoChat) && /Todavía no: Logo/.test(textoChat), "Atlas dice con claridad que el zoom y el logo todavía no se pueden");
exigir(await p.locator("button[aria-pressed=true] span", { hasText: /^Marca$/ }).count() === 1, "la plantilla Marca quedó elegida en el editor");
const fila = p.locator("li", { hasText: "Vertical 9:16" });
exigir(await fila.locator("a:has-text('Descargar')").isVisible(), "el 9:16 se puede descargar");
await p.screenshot({ path: join(capturas, "3-pedido-aplicado.png") });

// 3. Un cambio con una frase.
await p.fill("#pedido-atlas", "Subtítulos más grandes");
await p.keyboard.press("Enter");
exigir(await espera(chat.locator("li", { hasText: "agrandé el texto" })), "Atlas responde al cambio por chat");
exigir((await vistas()).filter((x) => x === "Atlas está leyendo tu pedido").length === 2, "al pedir por chat, la espera aparece");
exigir(await p.locator("button[aria-pressed=true]", { hasText: /^Grande$/ }).count() === 1, "el tamaño pasó a Grande");
exigir(await espera(fila.locator("button:has-text('Volver a armar')"), 5000), "el 9:16 armado queda marcado como viejo");

// 4. Deshacer lo de Atlas vuelve a la edición de antes (y el 9:16 vuelve a estar al día).
await p.click("button:has-text('Deshacer lo de Atlas')");
exigir(await espera(p.locator("button[aria-pressed=true]", { hasText: /^Normal$/ }), 5000), "deshacer devuelve el tamaño Normal");
exigir(await espera(fila.locator("a:has-text('Descargar')"), 10000), "el 9:16 vuelve a estar al día");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });

// 5. Un pedido que no se entiende: Atlas pregunta y no cambia nada.
await p.fill("#pedido-atlas", "hola");
await p.click("button:has-text('Pedir a Atlas')");
exigir(await espera(chat.locator("li", { hasText: "No entendí" })), "si no entiende, pregunta");
exigir(await p.locator("button:has-text('Deshacer lo de Atlas')").count() === 0, "y no hay nada que deshacer");

// 6. La conversación queda guardada.
await p.reload();
await p.locator("text=Pídeselo a Atlas").waitFor();
const mensajes = await chat.locator(":scope > li").count();
exigir(mensajes === 6, `la conversación sigue al volver (${mensajes} mensajes)`);
await p.screenshot({ path: join(capturas, "4-conversacion.png"), fullPage: true });

// La IA recibió el texto numerado y no se forzó la herramienta (Sonnet 5.5 lo rechaza).
const pedidos = readFileSync(registro, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.system?.startsWith("Atlas, departamento de video"));
exigir(pedidos.length === 3, `3 pedidos a Atlas (${pedidos.length})`);
exigir(pedidos.every((x) => x.tool_choice?.type === "auto"), "la herramienta va sin forzar");
exigir(/\[3\]ANONYMO\.@2\.2/.test(pedidos[0].messages[0].content), "Atlas lee el texto con índices y tiempos");

// Celular.
const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const m = await cel.newPage();
await m.goto(p.url());
await m.locator("text=Pídeselo a Atlas").waitFor();
exigir((await m.evaluate(() => document.documentElement.scrollWidth)) <= 392, "sin desplazamiento horizontal en celular");
await m.locator("#titulo-atlas").scrollIntoViewIfNeeded();
await m.screenshot({ path: join(capturas, "5-celular.png") });

await nav.close();
console.log(fallas.length ? `\n${fallas.length} fallas` : `\nTodo bien. Capturas en ${capturas}`);
if (fallas.length) process.exitCode = 1;
