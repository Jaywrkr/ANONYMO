// «Mi web» (sistema/98), con nube.sh levantado y el proyecto de scripts/pruebas/miweb.ts en la nube falsa.
// Jay la pone en vivo; el cliente, desde su portal y sin sesión, cambia textos y fotos, deshace y arma su asistente.
// Uso: node scripts/pruebas/e2e-miweb.mjs [carpeta-capturas]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const ID = "miweb-prueba";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-miweb";
mkdirSync(capturas, { recursive: true });
const foto = fileURLToPath(new URL("./imagen.png", import.meta.url));
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const vivo = async (ruta = "index.html") => { const r = await fetch(`${B}/w/${ID}/${ruta}`); return { status: r.status, texto: await r.text() }; };

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en el estudio: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Nada sale hasta que Jay la pone en vivo.
  exigir((await vivo()).status === 404, "antes de ponerla en vivo, la dirección no existe");
  await p.goto(`${B}/estudio/${ID}/web`);
  const panel = p.locator("[data-en-vivo]");
  exigir(await espera(panel) && /Nada sale hasta que toques el botón/.test(await panel.innerText()), "el estudio explica qué pasa al ponerla en vivo");
  await panel.locator("select[name=plan]").selectOption("cuidado");
  await panel.getByRole("button", { name: "Poner en vivo" }).click();
  exigir(await espera(panel.locator("[role=status]:has-text('en vivo con el plan Cuidado')")), "dice que quedó en vivo y con qué plan");
  const v1 = await vivo();
  exigir(v1.status === 200 && v1.texto.includes("Cuidamos tu sonrisa en Cuenca") && !v1.texto.includes("_asistente.js"), "la web está en línea, sin asistente");
  exigir((await vivo("estilos.css")).status === 200 && (await fetch(`${B}/w/${ID}/img/consultorio.png`)).status === 200, "sus estilos y su foto también");
  exigir((await fetch(`${B}/w/${ID}`, { redirect: "manual" })).headers.get("location")?.endsWith(`/w/${ID}/index.html`), "la dirección corta lleva a la portada");
  const enlace = await panel.locator("a:has-text('Su «Mi web»')").getAttribute("href");

  // 1b · Informe del mes (sistema/99): una visita desde Google y un clic a WhatsApp. Los robots no cuentan.
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const vis = await nav.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA });
  await vis.route(/wa\.me/, (r) => r.fulfill({ status: 200, body: "whatsapp" }));
  const vp = await vis.newPage();
  await vp.goto(`${B}/w/${ID}/index.html`, { referer: "https://www.google.com/" });
  await vp.waitForTimeout(800);
  await vp.reload();
  await vp.waitForTimeout(500);
  await vp.locator("a[href*='wa.me']").click();
  await vp.waitForTimeout(1200);
  await vis.close();
  await fetch(`${B}/w/${ID}/_registro`, { method: "POST", headers: { "user-agent": "Googlebot/2.1" }, body: JSON.stringify({ e: "visita", p: "index.html" }) });
  await p.reload();
  exigir(/Este mes: 1 visita · 1 por WhatsApp · 0 llamadas/.test(await panel.innerText()), "el estudio ve las visitas del mes: recargar no suma y los robots no cuentan");
  await panel.locator("[data-ir-informe]").click();
  await p.waitForURL(/web\/informe/);
  const inf = p.locator("[data-informe-web]");
  exigir(await espera(inf) && /Google/.test(await inf.innerText()), "el informe dice de dónde llegaron");
  exigir(/Visitas: 1\nTe escribieron por WhatsApp: 1\nDe cada 100 visitas, 100 te contactaron\./.test(await p.locator("[data-texto-informe]").innerText()), "el texto para el cliente está listo para copiar");
  await p.screenshot({ path: join(capturas, "0-informe.png"), fullPage: true });
  await p.goto(`${B}/estudio/${ID}/web`);

  // 2 · Con el plan Cuidado, el cliente ve su web pero no la cambia él.
  const cli = await nav.newContext({ viewport: { width: 1280, height: 900 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" });
  const c = await cli.newPage();
  c.on("pageerror", (e) => fallas.push(`error en el portal: ${e.message}`));
  exigir((await c.goto(`${B}${enlace?.replace(/t=[^&]+/, "t=otro")}`))?.status() === 404, "con un enlace falso no se entra");
  await c.goto(`${B}${enlace}`);
  exigir(await espera(c.locator("text=Tu plan incluye cambios hechos por nosotros")) && await c.locator("[data-editor-miweb]").count() === 0, "con Cuidado no hay editor: lo hacemos nosotros");
  exigir(/Visitas\s*1/.test(await c.locator("[data-informe-cliente]").innerText()), "el cliente ve su informe del mes, también con Cuidado");
  await c.goto(`${B}${enlace?.replace("/mi-web", "")}`);
  exigir(await espera(c.locator("[data-ir-miweb]")), "su portal lleva a «Mi web»");

  // 3 · Jay le cambia el plan a Autónomo: el cliente edita y se publica al guardar.
  await panel.locator("select[name=plan]").selectOption("autonomo");
  await panel.getByRole("button", { name: "Cambiar plan" }).click();
  await espera(panel.locator("[role=status]:has-text('Plan cambiado a Autónomo')"));
  await c.goto(`${B}${enlace}`);
  const ed = c.locator("[data-editor-miweb]");
  exigir(await espera(ed), "con Autónomo aparece el editor");
  const titulo = ed.locator("[data-editable]").filter({ hasText: "Título" }).first().locator("input, textarea");
  exigir(await titulo.inputValue() === "Cuidamos tu sonrisa en Cuenca", "trae los textos de su web");
  exigir(await ed.locator("[data-publicar]").isDisabled(), "sin cambios no hay nada que publicar");
  await titulo.fill("Tu sonrisa, en buenas manos");
  await ed.locator("[data-editable]").filter({ hasText: "Lista o precio" }).first().locator("input").fill("Limpieza: USD 35");
  exigir(/Publicar 2 cambios/.test(await ed.locator("[data-publicar]").innerText()), "cuenta los cambios por publicar");
  await ed.locator("[data-publicar]").click();
  exigir(await espera(ed.locator("[role=status]:has-text('Publicado. Ya se ve en tu web.')")), "publicar dice que ya se ve");
  const v2 = await vivo();
  exigir(v2.texto.includes("Tu sonrisa, en buenas manos") && v2.texto.includes("Limpieza: USD 35") && !v2.texto.includes("Cuidamos tu sonrisa"), "la web en vivo ya tiene los textos nuevos");

  // 4 · Cambiar una foto: se achica en el navegador, se sube y se publica.
  await ed.locator("[data-foto='img/consultorio.png'] input[type=file]").setInputFiles(foto);
  exigir(await espera(ed.locator("[role=status]:has-text('Foto lista')"), 30000), "la foto queda lista para publicar");
  await ed.locator("[data-publicar]").click();
  await espera(ed.locator("[role=status]:has-text('Publicado.')"));
  const v3 = await vivo();
  const nueva = v3.texto.match(/img\/(mw-[a-f0-9]{16}\.webp)/)?.[1];
  exigir(!!nueva && !v3.texto.includes("img/consultorio.png"), "la web en vivo usa la foto nueva");
  const f = await fetch(`${B}/w/${ID}/img/${nueva}`);
  exigir(f.status === 200 && f.headers.get("content-type") === "image/webp" && (await f.arrayBuffer()).byteLength < 400_000, "la foto nueva carga y pesa poco");

  // 5 · Deshacer vuelve atrás solo el último cambio.
  await ed.locator("[data-deshacer]").click();
  await espera(ed.locator("[role=status]:has-text('volvió como estaba')"));
  const v4 = await vivo();
  exigir(v4.texto.includes("img/consultorio.png") && v4.texto.includes("Tu sonrisa, en buenas manos"), "deshacer quita la foto y deja los textos");

  // 6 · La otra página.
  await ed.getByRole("tab", { name: "Servicios" }).click();
  await ed.locator("[data-editable]").first().locator("input, textarea").fill("Lo que hacemos");
  await ed.locator("[data-publicar]").click();
  await espera(ed.locator("[role=status]:has-text('Publicado.')"));
  exigir((await vivo("servicios.html")).texto.includes("Lo que hacemos"), "también se cambia la página de servicios");

  // 7 · El asistente: se prueba antes de encenderlo y luego responde en su web.
  const as = c.locator("[data-asistente]");
  await as.getByLabel("Pregunta 1").fill("¿Cuál es el horario de atención?");
  await as.getByLabel("Respuesta 1").fill("De lunes a viernes, de 9 a 18.");
  await as.getByRole("button", { name: "Agregar pregunta" }).click();
  await as.getByLabel("Pregunta 2").fill("¿Aceptan tarjeta?");
  await as.getByLabel("Respuesta 2").fill("Sí, todas las tarjetas.");
  await as.locator("input[inputmode=tel]").fill("099 222 0001");
  await as.locator("[data-probar]").fill("qué horario tienen");
  exigir(/Respondería: De lunes a viernes/.test(await as.locator("[data-prueba-respuesta]").innerText()), "se prueba antes de encenderlo");
  await as.locator("input[type=checkbox]").check();
  await as.locator("[data-guardar-asistente]").click();
  exigir(await espera(c.locator("[role=status]:has-text('Asistente guardado. Ya sale en tu web.')")), "guardar el asistente dice que ya sale");
  const w = await cli.newPage();
  w.on("pageerror", (e) => fallas.push(`error en la web en vivo: ${e.message}`));
  await w.goto(`${B}/w/${ID}/index.html`);
  await w.getByRole("button", { name: "Preguntas" }).click();
  await w.getByLabel("Escribe tu pregunta").fill("horario?");
  await w.getByLabel("Escribe tu pregunta").press("Enter");
  exigir(await espera(w.locator(".mw-el:has-text('De lunes a viernes, de 9 a 18.')")), "en su web, el asistente responde con lo que escribió");
  await w.getByLabel("Escribe tu pregunta").fill("hacen envíos a Quito");
  await w.getByLabel("Escribe tu pregunta").press("Enter");
  exigir(await espera(w.locator(".mw-el a[href='https://wa.me/593992220001']")), "lo que no sabe lo manda a su WhatsApp");
  await w.screenshot({ path: join(capturas, "1-web-en-vivo.png") });

  // 7b · Lo que no sabía queda anotado para el cliente; con Pro, la IA responde con lo de su web (sistema/100).
  await w.waitForTimeout(800);
  await c.reload();
  const sr = c.locator("[data-sin-respuesta]");
  exigir(await espera(sr) && /hacen envíos a Quito/.test(await sr.innerText()), "el cliente ve lo que le preguntaron y no tenía escrito");
  await sr.getByRole("button", { name: "Escribir la respuesta" }).first().click();
  exigir(await c.locator("[data-asistente]").getByLabel("Pregunta 3").inputValue() === "hacen envíos a Quito", "con un toque queda lista para responder");
  await p.goto(`${B}/estudio/${ID}/web`);
  await panel.locator("select[name=plan]").selectOption("pro");
  await panel.getByRole("button", { name: "Cambiar plan" }).click();
  await espera(panel.locator("[role=status]:has-text('Plan cambiado a Pro')"));
  await w.reload();
  await w.getByRole("button", { name: "Preguntas" }).click();
  await w.getByLabel("Escribe tu pregunta").fill("tienen parqueadero");
  await w.getByLabel("Escribe tu pregunta").press("Enter");
  exigir(await espera(w.locator(".mw-el:has-text('Respuesta de prueba con IA sobre «tienen parqueadero»')"), 30000), "con Pro, lo que no estaba escrito lo responde la IA");
  await c.reload();
  exigir(/este mes van 1 de 200/.test(await c.locator("[data-asistente]").innerText()) && /tienen parqueadero[\s\S]*respondió la IA/.test(await c.locator("[data-sin-respuesta]").innerText()), "el cliente ve cuántas van y qué respondió la IA");

  // 8 · En el celular, «Mi web» no se sale de la pantalla.
  const m = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(`${B}${enlace}`);
  await espera(mp.locator("[data-editor-miweb]"));
  exigir(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "en el celular no hay scroll de lado");
  await mp.screenshot({ path: join(capturas, "2-mi-web-celular.png"), fullPage: true });
  await m.close();

  // 9 · El estudio ve lo que hizo el cliente y puede sacarla de línea.
  await p.reload();
  await panel.locator("summary:has-text('Lo último que cambió')").click();
  exigir(/El cliente: Asistente encendido/.test(await panel.innerText()), "el estudio ve lo que cambió el cliente");
  await panel.getByRole("button", { name: "Sacar de línea" }).click();
  await espera(panel.locator("[role=status]:has-text('ya no está en línea')"));
  // La nube puede tardar un instante en reflejarlo: se le da hasta 5 segundos.
  let fuera = false;
  for (let i = 0; i < 10 && !fuera; i++) { fuera = (await vivo()).status === 404; if (!fuera) await p.waitForTimeout(500); }
  exigir(fuera, "sacada de línea, la dirección ya no responde");
  await cli.close();
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
