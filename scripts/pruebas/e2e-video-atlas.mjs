// Atlas en el departamento de video (sistema/63–64), con nube.sh levantado (Supabase y Anthropic falsos).
// Luna sube el video con el pedido escrito; Atlas lo aplica solo apenas termina de escucharse y arma el 9:16.
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
// «Voz» (un tono) en 0,9–2,4 · 4,0–5,2 · 5,6–7,9 s: tres partes.
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=9", "-f", "lavfi", "-i", "aevalsrc='if(between(t,0.9,2.4)+between(t,4.0,5.2)+between(t,5.6,7.9),0.4*sin(2*PI*330*t),0.003*sin(2*PI*50*t))':s=44100:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", entrada]);

// Solo cuentan los pedidos a la IA de esta corrida.
const yaHabia = (() => { try { return readFileSync(registro, "utf8").trim().split("\n").filter(Boolean).length; } catch { return 0; } })();
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
await p.fill("textarea", "Corta los silencios, quita el arranque, ponle subtítulos, zoom en la frase clave y el logo al final, y expórtalo vertical");
await p.screenshot({ path: join(capturas, "1-subir-con-pedido.png") });
await p.click("button:has-text('Subir video')");
await p.waitForURL(/estudio\/video\/v-testimonio-clinica-/, { timeout: 60000 });

// 2. Se escucha, Atlas aplica el pedido solo y arma el 9:16.
exigir(await espera(p.locator("[role=status]:has-text('armado')"), 120000), "avisa que el 9:16 está listo");
const orden = await vistas();
console.log("   esperas:", orden.join(" → "));
const i = orden.indexOf("Corte está leyendo tu pedido"), j = orden.indexOf("Armando el vertical 9:16");
exigir(orden.indexOf("Escuchando el video") >= 0 && i > orden.indexOf("Escuchando el video"), "Atlas lee el pedido apenas termina de escuchar el video");
exigir(j > i, "después arma el 9:16 que pidió, sin tocar nada");
await p.screenshot({ path: join(capturas, "2-listo.png") });
const chat = p.locator("ol[aria-label='Conversación con Corte']");
const textoChat = await chat.innerText();
exigir(/Corta los silencios/.test(textoChat), "el pedido de Luna queda en la conversación");
exigir(/✓ Quitar la parte 1/.test(textoChat), "Atlas dice qué cambió (quitó la parte 1)");
exigir(/donde todavía no empieza/.test(textoChat), "Atlas recibió la hoja de miniaturas");
exigir((await p.locator("section[aria-labelledby=titulo-partes] li > button[aria-label^='Parte '][aria-pressed=true]").count()) === 1, "la parte 1 quedó quitada en el editor");
exigir(/Todavía no: Subtítulos/.test(textoChat) && /Todavía no: Logo y música: este video no tiene marca/.test(textoChat), "Atlas dice con claridad que no hay subtítulos y que falta elegir la marca para el logo");
exigir(/✓ Zoom en cada corte/.test(textoChat), "el zoom ya se puede (fase 3)");
const fila = p.locator("li", { hasText: "Vertical 9:16" });
exigir(await fila.locator("a:has-text('Descargar')").isVisible(), "el 9:16 se puede descargar");
await p.screenshot({ path: join(capturas, "3-pedido-aplicado.png") });

// 3. Un cambio con una frase.
await p.fill("#pedido-atlas", "Más dinámico");
await p.keyboard.press("Enter");
exigir(await espera(chat.locator("li", { hasText: "ritmo más rápido" })), "Atlas responde al cambio por chat");
exigir((await vistas()).filter((x) => x === "Corte está leyendo tu pedido").length === 2, "al pedir por chat, la espera aparece");
exigir(/Pausas de más de 0,3 s/.test(await p.locator("section[aria-labelledby=titulo-cortes]").innerText()), "las pausas pasaron a 0,3 s");
exigir(await espera(fila.locator("button:has-text('Volver a armar')"), 5000), "el 9:16 armado queda marcado como viejo");

// 4. Deshacer lo de Atlas vuelve a la edición de antes (y el 9:16 vuelve a estar al día).
await p.click("button:has-text('Deshacer lo de Corte')");
exigir(await espera(p.locator("section[aria-labelledby=titulo-cortes]", { hasText: "Pausas de más de 0,6 s" }), 5000), "deshacer devuelve las pausas de 0,6 s");
exigir(await espera(fila.locator("a:has-text('Descargar')"), 10000), "el 9:16 vuelve a estar al día");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });

// 5. Un pedido que no se entiende: Atlas pregunta y no cambia nada.
await p.fill("#pedido-atlas", "hola");
await p.click("button:has-text('Pedir a Corte')");
exigir(await espera(chat.locator("li", { hasText: "No entendí" })), "si no entiende, pregunta");
exigir(await p.locator("button:has-text('Deshacer lo de Corte')").count() === 0, "y no hay nada que deshacer");

// 6. La conversación queda guardada.
await p.reload();
await p.locator("text=Pídeselo a Corte").waitFor();
const mensajes = await chat.locator(":scope > li").count();
exigir(mensajes === 6, `la conversación sigue al volver (${mensajes} mensajes)`);
await p.screenshot({ path: join(capturas, "4-conversacion.png"), fullPage: true });

// La IA recibió el texto numerado y no se forzó la herramienta (Sonnet 5.5 lo rechaza).
const pedidos = readFileSync(registro, "utf8").trim().split("\n").slice(yaHabia).map((l) => JSON.parse(l)).filter((x) => x.system?.startsWith("Corte, editor de video"));
exigir(pedidos.length === 3, `3 pedidos a Atlas (${pedidos.length})`);
exigir(pedidos.every((x) => x.tool_choice?.type === "auto"), "la herramienta va sin forzar");
const bloques = pedidos[0].messages[0].content;
exigir(bloques[0]?.type === "image" && bloques[0].source?.media_type === "image/jpeg", "Atlas recibe la hoja de miniaturas como imagen");
exigir(/## Partes \(3\)\n1\. 0\.9–2\.4 s/.test(bloques[1]?.text ?? ""), "Atlas lee las partes numeradas con sus tiempos");

// Celular.
const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const m = await cel.newPage();
await m.goto(p.url());
await m.locator("text=Pídeselo a Corte").waitFor();
exigir((await m.evaluate(() => document.documentElement.scrollWidth)) <= 392, "sin desplazamiento horizontal en celular");
await m.locator("#titulo-atlas").scrollIntoViewIfNeeded();
await m.screenshot({ path: join(capturas, "5-celular.png") });

await nav.close();
console.log(fallas.length ? `\n${fallas.length} fallas` : `\nTodo bien. Capturas en ${capturas}`);
if (fallas.length) process.exitCode = 1;
