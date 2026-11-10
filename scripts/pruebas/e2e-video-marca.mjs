// Fase 3 del departamento de video (sistema/65): kits de marca, motion y marca de punta a punta,
// con nube.sh levantado (Supabase y Anthropic falsos). Crea una marca con logo y música, la elige en un video,
// pone zoom, logo en la esquina, cierre y música, mira la vista previa, arma el 9:16 y comprueba el cierre.
// Uso: node scripts/pruebas/e2e-video-marca.mjs [carpeta-capturas]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-video-marca";
mkdirSync(capturas, { recursive: true });
const ffmpeg = process.env.ANONYMO_FFMPEG ?? join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const ff = (...a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...a]);
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const dir = mkdtempSync(join(tmpdir(), "e2e-video-marca-"));
// Un nombre por corrida: así la prueba se puede repetir en el mismo estudio de prueba.
const MARCA = `Clínica Silva ${Date.now().toString(36).slice(-4)}`;
const entrada = join(dir, "Testimonio Silva.mp4"), logo = join(dir, "Logo Silva.png"), musica = join(dir, "Tema Silva.mp3");
ff("-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=9", "-f", "lavfi", "-i", "aevalsrc='if(between(t,0.9,2.4)+between(t,4.0,5.2)+between(t,5.6,7.9),0.4*sin(2*PI*330*t),0.003*sin(2*PI*50*t))':s=44100:d=9", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", entrada);
ff("-f", "lavfi", "-i", "color=c=0xff5a1f:s=300x150", "-frames:v", "1", logo);
ff("-f", "lavfi", "-i", "sine=f=220:d=6", "-c:a", "libmp3lame", musica);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="luna"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-luna"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

// 1. Crear la marca con logo y música.
await p.goto(`${B}/estudio/video`);
await p.click("text=Marcas: logo, colores y música");
await p.waitForURL(/estudio\/video\/marcas$/);
await p.fill('input[placeholder="Por ejemplo: Clínica Silva"]', MARCA);
await p.locator("form input[type=color]").first().fill("#1d3557");
await p.click("button:has-text('Crear marca')");
exigir(await espera(p.locator("[role=status]:has-text('creamos la marca')")), "crea la marca y dice qué sigue");
const tarjeta = p.locator(`section[aria-label='Marca ${MARCA}']`);
await tarjeta.locator("input[type=file][accept^='.png']").setInputFiles(logo);
exigir(await espera(p.locator("[role=status]:has-text('el logo quedó guardado')")), "sube el logo");
const ancho = await tarjeta.locator(`img[alt='Logo de ${MARCA}']`).evaluate((i) => new Promise((ok) => (i.complete ? ok(i.naturalWidth) : (i.onload = () => ok(i.naturalWidth)))));
exigir(ancho === 300, `el logo se ve en el cierre de muestra (${ancho}px)`);
await tarjeta.locator("input[type=file][accept^='.mp3']").setInputFiles(musica);
exigir(await espera(p.locator("[role=status]:has-text('la música quedó guardada')")), "sube la música");
exigir(await tarjeta.locator("text=Tema Silva").isVisible(), "la música se nombra como el archivo");
await p.screenshot({ path: join(capturas, "1-marcas.png") });

// 2. Subir un video y elegir la marca.
await p.goto(`${B}/estudio/video`);
await p.setInputFiles('input[type="file"]', entrada);
await p.click("button:has-text('Subir video')");
await p.waitForURL(/estudio\/video\/v-testimonio-silva-/, { timeout: 60000 });
await p.locator("#titulo-partes").waitFor({ timeout: 60000 });
await p.waitForLoadState("networkidle");
await p.selectOption("#titulo-marca ~ label select, section[aria-labelledby=titulo-marca] select", { label: MARCA });
exigir(await espera(p.locator(`[role=status]:has-text('Marca: ${MARCA}')`)), "elige la marca del video");

// 3. Motion y marca a mano.
const marca = p.locator("section[aria-labelledby=titulo-marca]");
await p.locator("section[aria-labelledby=titulo-motion] label", { hasText: "Zoom en cada corte" }).locator("input").check();
await marca.locator("label", { hasText: "Logo chico en la esquina" }).locator("input").check();
await marca.locator("label", { hasText: "Cerrar con el logo" }).locator("input").check();
await marca.locator("label", { hasText: "Música de la marca" }).locator("input").check();
await p.locator("button[aria-label='Zoom en la parte 3']").click();
exigir((await p.locator("button[aria-label='Zoom en la parte 3']").getAttribute("aria-pressed")) === "true", "zoom en una parte tocando «Zoom»");
await p.locator("text=Guardado").waitFor({ timeout: 10000 });
const vista = p.locator("section[aria-label='Vista previa']");
exigir(await vista.locator("img[aria-hidden]").isVisible(), "la vista previa muestra el logo en la esquina");
exigir(/0:0\d \/ 0:0[6-7]/.test(await vista.locator("span.font-mono").innerText()), `la vista previa suma el cierre (${await vista.locator("span.font-mono").innerText()})`);
// Ir casi al final: aparece el cierre con el logo sobre el color de la marca.
await vista.locator("input[type=range]").fill("6");
exigir(await espera(vista.locator("[aria-label='Cierre de la marca'] img"), 5000), "la vista previa muestra el cierre con el logo");
const fondo = await vista.locator("[aria-label='Cierre de la marca']").evaluate((d) => getComputedStyle(d).backgroundColor);
exigir(fondo === "rgb(29, 53, 87)", `el cierre usa el color de la marca (${fondo})`);
await p.waitForTimeout(500); // el cierre entra con un fundido de 0,35 s
await vista.screenshot({ path: join(capturas, "2-vista-cierre.png") });
await vista.locator("input[type=range]").fill("2");
await p.evaluate(() => { const v = document.querySelector("video"); v.muted = true; });
await p.click("button[aria-label=Reproducir]");
await p.waitForTimeout(700);
const escala = await p.evaluate(() => document.querySelector("video").style.transform);
exigir(/scale\(1\.18\)/.test(escala), `en el segundo tramo el plano está cerrado (${escala || "sin zoom"})`);
await p.click("button[aria-label=Pausar]").catch(() => {});
await p.screenshot({ path: join(capturas, "3-editor.png") });

// 4. Atlas: fundido por chat.
await p.fill("#pedido-atlas", "Ponle fundido entre partes");
await p.keyboard.press("Enter");
exigir(await espera(p.locator("ol[aria-label='Conversación con Atlas'] > li", { hasText: "Fundido corto entre partes" }).first()), "Atlas pone el fundido");
exigir((await p.locator("section[aria-labelledby=titulo-motion] button[aria-pressed=true]").innerText()) === "Fundido corto", "el editor muestra el fundido");

// 5. Armar el 9:16 y comprobar el cierre.
const fila = p.locator("li", { hasText: "Vertical 9:16" });
await fila.locator("button:has-text('Armar')").click();
await p.locator("[role=status]:has-text('armado')").waitFor({ timeout: 120000 });
const [descarga] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), fila.locator("a:has-text('Descargar')").click()]);
const salida = join(dir, "final.mp4");
await descarga.saveAs(salida);
const info = (() => { try { execFileSync(ffmpeg, ["-hide_banner", "-i", salida], { stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { return String(e.stderr); } return ""; })();
const dur = Number(/Duration: 00:00:(\d+\.\d+)/.exec(info)?.[1]);
exigir(/1080x1920/.test(info) && /Audio: aac/.test(info), "el video final es 1080×1920 y tiene sonido");
// Quedan 2 tramos (la parte 1, y las partes 2 y 3 juntas porque la pausa entre ellas es corta): 1,74 s + 4,14 s,
// menos 1 fundido de 0,25 s, más 2 s de cierre = 7,63 s.
exigir(Math.abs(dur - 7.63) < 0.15, `dura lo que queda, menos los fundidos, más el cierre (${dur} s)`);
// El penúltimo cuadro es el cierre: el color de la marca en un borde y el naranja del logo al centro.
const color = (x, y) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-sseof", "-0.2", "-i", salida, "-frames:v", "1", "-vf", `crop=8:8:${x}:${y},scale=1:1`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
const borde = [...color(20, 20)], centro = [...color(536, 956)];
exigir(Math.abs(borde[0] - 29) < 12 && Math.abs(borde[1] - 53) < 12 && Math.abs(borde[2] - 87) < 12, `el cierre es del color de la marca (${borde})`);
exigir(centro[0] > 200 && centro[1] < 130, `con el logo al centro (${centro})`);
await p.screenshot({ path: join(capturas, "4-listo.png") });

// Celular: la página de marcas.
const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const m = await cel.newPage();
await m.goto(`${B}/estudio/video/marcas`);
await m.locator(`section[aria-label='Marca ${MARCA}']`).waitFor();
exigir((await m.evaluate(() => document.documentElement.scrollWidth)) <= 392, "marcas sin desplazamiento horizontal en celular");
await m.screenshot({ path: join(capturas, "5-marcas-celular.png"), fullPage: true });
const ajeno = await (await nav.newContext()).request.post(`${B}/estudio/video/marcas/nueva`, { data: { nombre: "x" }, maxRedirects: 0 });
exigir(ajeno.status() === 307 || ajeno.status() === 403, `sin sesión no se crean marcas (${ajeno.status()})`);

await nav.close();
console.log(fallas.length ? `\n${fallas.length} fallas` : `\nTodo bien. Capturas en ${capturas}`);
if (fallas.length) process.exitCode = 1;
