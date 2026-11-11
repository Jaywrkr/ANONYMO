// Guiones de Faro (sistema/71), con nube.sh levantado (Supabase y Anthropic falsos).
// Luna pide el guion, Faro lo escribe, Luna lo aprueba, sube lo grabado unido al guion y Corte lo lee al editar.
// Cada paso queda firmado. Uso: node scripts/pruebas/e2e-guiones.mjs [carpeta-capturas]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-guiones";
mkdirSync(capturas, { recursive: true });
const ffmpeg = process.env.ANONYMO_FFMPEG ?? join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const yaHabia = (() => { try { return readFileSync(registro, "utf8").trim().split("\n").filter(Boolean).length; } catch { return 0; } })();

const dir = mkdtempSync(join(tmpdir(), "e2e-guiones-"));
const entrada = join(dir, "Lanzamiento.mp4");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=6", "-f", "lavfi", "-i", "aevalsrc='if(between(t,0.8,2.4)+between(t,3.4,5.2),0.4*sin(2*PI*330*t),0.003*sin(2*PI*50*t))':s=44100:d=6", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", entrada]);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
try {
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="luna"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-luna"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  await p.goto(`${B}/estudio/video`);
  exigir(await espera(p.locator("text=Corte edita · Faro escribe los guiones")), "Video dice quién edita y quién escribe");

  // 1 · Faro escribe.
  const seccion = p.locator("section[aria-labelledby=titulo-guiones]");
  await seccion.locator("textarea").fill("Un reel para el lanzamiento de ANONYMO, que muestre que somos una agencia con agentes de IA");
  await seccion.locator("input").fill("ANONYMO");
  await seccion.locator("select").selectOption("60");
  await seccion.locator("button:has-text('Que Faro escriba el guion')").click();
  exigir(await p.locator("[role=alertdialog][aria-label='Faro está escribiendo el guion']").isVisible({ timeout: 3000 }).catch(() => false) || await espera(seccion.locator("[role=status]:has-text('Faro escribió')"), 1000), "al pedir el guion aparece la espera");
  exigir(await espera(seccion.locator("[role=status]:has-text('Faro escribió')"), 60000), "Faro escribió el guion");
  const guion = seccion.locator("ul[aria-label=Guiones] > li").first();
  exigir(/Por aprobar/.test(await guion.innerText()), "queda por aprobar");
  const texto = await guion.innerText();
  exigir(/¿Y si tu agencia trabajara mientras duermes\?/.test(texto) && /Toma: Plano medio de Jay y Luna/.test(texto) && /Lista de rodaje/.test(texto), "el guion trae gancho, partes con su toma y lista de rodaje");
  exigir(/Luna: pidió el video · Atlas: se lo pasó a faro · Faro: escribió el guion/.test(texto), "cada paso firmado: Luna, Atlas, Faro");
  await p.screenshot({ path: join(capturas, "1-guion.png"), fullPage: true });

  // 2 · Luna aprueba y sube lo grabado unido al guion.
  await guion.locator("button:has-text('Aprobar el guion')").click();
  exigir(await espera(seccion.locator("[role=status]:has-text('Guion aprobado')")), "aprobar dice qué pasó");
  exigir(/Luna: aprobó el guion/.test(await guion.innerText()), "la aprobación queda firmada");
  await guion.locator("a:has-text('Ya lo grabé: subir el video')").click();
  await p.waitForURL(/estudio\/video\?guion=g-/);
  exigir(await espera(p.locator("text=queda unido al guion de Faro")), "la subida avisa que queda unida al guion");
  await p.setInputFiles('input[type="file"]', entrada);
  await p.locator("#subir textarea").fill("Corta los silencios");
  await p.click("button:has-text('Subir video')");
  await p.waitForURL(/estudio\/video\/v-lanzamiento-/, { timeout: 60000 });
  const idVideo = p.url().split("/").pop();
  exigir(await espera(p.locator("text=Grabado con el guion de Faro")), "el editor dice con qué guion se grabó");
  exigir(await espera(p.locator("a:has-text('Ficha de ANONYMO')")), "y lleva a la ficha del cliente");
  exigir(await espera(p.locator("ol[aria-label='Conversación con Corte'] li", { hasText: "corté los silencios" }), 120000), "Corte aplica el pedido");
  await p.screenshot({ path: join(capturas, "2-editor.png") });

  // 3 · Corte leyó el guion.
  const pedidos = readFileSync(registro, "utf8").trim().split("\n").slice(yaHabia).map((l) => JSON.parse(l));
  const aCorte = pedidos.filter((x) => x.system?.startsWith("Corte, editor de video"));
  const textoCorte = JSON.stringify(aCorte.at(-1)?.messages ?? "");
  exigir(aCorte.length >= 1 && /Guion de Faro/.test(textoCorte) && /Duración buscada: 60 s/.test(textoCorte), "Corte recibe el guion de Faro al editar");
  exigir(pedidos.some((x) => x.system?.startsWith("Faro, contenido de ANONYMO")), "el guion lo escribió Faro");

  // 4 · El guion queda grabado y lleva al video.
  await p.goto(`${B}/estudio/video`);
  const g2 = p.locator("section[aria-labelledby=titulo-guiones] ul[aria-label=Guiones] > li").first();
  exigir(/Grabado/.test(await g2.innerText()), "el guion queda como grabado");
  await g2.locator("button").first().click();
  exigir((await g2.locator("a:has-text('Ver el video')").getAttribute("href")) === `/estudio/video/${idVideo}`, "y lleva al video");
  exigir(/Luna: subió lo grabado/.test(await g2.innerText()), "la subida también queda firmada");

  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const m = await cel.newPage();
  await m.goto(`${B}/estudio/video`);
  exigir((await m.evaluate(() => document.documentElement.scrollWidth)) <= 392, "Video con guiones cabe en celular");
  await m.screenshot({ path: join(capturas, "3-celular.png"), fullPage: true });
  await cel.close();
} catch (e) {
  fallas.push(`se cortó: ${e.message}`);
  await p.screenshot({ path: join(capturas, "error.png") }).catch(() => {});
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}` : "\nTodo bien.");
process.exit(fallas.length ? 1 : 0);
