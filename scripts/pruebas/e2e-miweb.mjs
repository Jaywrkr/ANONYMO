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

  // 2 · Con el plan Cuidado, el cliente ve su web pero no la cambia él.
  const cli = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const c = await cli.newPage();
  c.on("pageerror", (e) => fallas.push(`error en el portal: ${e.message}`));
  exigir((await c.goto(`${B}${enlace?.replace(/t=[^&]+/, "t=otro")}`))?.status() === 404, "con un enlace falso no se entra");
  await c.goto(`${B}${enlace}`);
  exigir(await espera(c.locator("text=Tu plan incluye cambios hechos por nosotros")) && await c.locator("[data-editor-miweb]").count() === 0, "con Cuidado no hay editor: lo hacemos nosotros");
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
  exigir((await vivo()).status === 404, "sacada de línea, la dirección ya no responde");
  await cli.close();
  await ctx.close();
} finally {
  await nav.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
