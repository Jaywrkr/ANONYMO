// Piezas de Faro (sistema/123), con nube.sh levantado (IA falsa). Web falsa en el 45781.
// Se suben imágenes de «qué es bueno», Faro diseña una pieza de un proyecto real viéndolas, la revisión la compara y
// la rehace sola si no llega; se ve a tamaño real con todas sus láminas y se aprueba o se pide un cambio.
// Uso: node scripts/pruebas/e2e-faro.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const SITIO = "http://127.0.0.1:45781";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-faro";
mkdirSync(capturas, { recursive: true });
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const TRAMO = (bg, fg, t) => `<section style="min-height:100vh;background:${bg};color:${fg};padding:12vh 7vw;box-sizing:border-box"><h1 style="font-size:72px;margin:0">${t}</h1></section>`;
const PAGINA = `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;font-family:sans-serif">
<header style="position:absolute;top:0;left:0;padding:24px 48px"><svg class="logo" width="220" height="28" viewBox="0 0 220 28"><circle cx="14" cy="14" r="12" fill="#fff"/><text x="34" y="20" fill="#fff" font-size="16" font-weight="700">Proyecto</text></svg></header>
${TRAMO("#01095c", "#fff", "Infraestructura.")}${TRAMO("#ffffff", "#01095c", "Cloud.")}${TRAMO("#8a97ff", "#01095c", "Quince años.")}</body></html>`;
const sitio = createServer((q, r) => { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); r.end(PAGINA); }).listen(45781, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // 1 · Un cliente con un proyecto en «Su trabajo real» (se captura solo).
  await p.goto(`${B}/estudio/clientes`);
  await p.locator("summary:has-text('Agregar un cliente a mano')").click();
  await p.getByLabel("Nombre del cliente").fill("Estudio Faro");
  await p.locator("button:has-text('Crear ficha')").click();
  await p.waitForURL(/estudio\/cliente\/estudio-faro/);
  await p.locator("[data-editar-direccion] summary").click();
  await p.locator("[data-editar-direccion] [name=trabajos]").fill(`${SITIO}/ — Coresolutions: web corporativa`);
  await p.locator("[data-guardar-direccion]").click();
  await espera(p.locator("[role=status]:has-text('Dirección guardada')"));
  exigir(await espera(p.locator("[data-capturas=listo]"), 120000), "el proyecto se captura solo");

  // 2 · Qué es bueno, en imágenes: se suben dos referencias.
  const png = join(capturas, "ref.png");
  const pg2 = await ctx.newPage(); await pg2.setViewportSize({ width: 600, height: 750 }); await pg2.setContent('<body style="margin:0;background:#111;color:#fff;font:120px sans-serif;display:grid;place-items:center;height:750px">Ola!</body>'); writeFileSync(png, await pg2.screenshot()); await pg2.close();
  await p.reload();
  await p.locator("[data-imagenes-buenas] input[type=file]").setInputFiles([png, png]);
  await espera(p.locator("[data-imagenes-buenas] [role=status]:has-text('Faro ya las ve')"), 30000);
  await p.waitForTimeout(800);
  exigir(await p.locator("[data-imagen-buena]").count() === 1, `las referencias quedan en su Dirección (iguales se guardan una vez: ${await p.locator("[data-imagen-buena]").count()})`);

  // 3 · Faro diseña una pieza del proyecto: no llega a la primera, la rehace sola, y se ve a tamaño real.
  await p.goto(`${B}/estudio/contenido`);
  await p.locator("[data-ir-piezas]").click();
  await p.waitForURL(/contenido\/faro$/);
  await p.locator("[data-pedir-pieza]").first().click();
  exigir(await espera(p.locator("[role=status]:has-text('Faro')"), 5000), "mientras diseña, lo dice");
  const pieza = p.locator("[data-pieza-faro]").first();
  exigir(await espera(pieza.locator("[data-nota='8']"), 200000), `no llegaba a la vara y la rehízo sola hasta llegar (${await pieza.locator("[data-nota]").innerText().catch(() => "")})`);
  const imgs = pieza.locator("[data-laminas] img");
  const tam = await imgs.evaluateAll((xs) => Promise.all(xs.map((i) => new Promise((r) => { const v = () => r(`${i.naturalWidth}x${i.naturalHeight}`); if (i.complete) v(); else i.onload = v; }))));
  exigir(tam.length === 2 && tam.every((t) => t === "1080x1350"), `todas las láminas del carrusel, al tamaño exacto del post (${tam.join(", ")})`);
  const log = readFileSync(registro, "utf8").trim().split("\n");
  const disenos = log.filter((l) => l.includes('"disenar_pieza"')), juicios = log.filter((l) => l.includes('"juzgar_pieza"'));
  exigir(disenos.length === 2 && disenos.every((l) => l.includes("Referencia de lo que es bueno") && l.includes("Material del proyecto") && (l.match(/"type":"image"/g) ?? []).length >= 3), "Faro diseña viendo las referencias y el material como imágenes");
  exigir(disenos[1]?.includes("Lo que hay que cambiar") && disenos[1]?.includes("le falta aire"), "la segunda vez Faro recibe lo que hay que cambiar");
  exigir(disenos[0]?.includes("La marca del proyecto (la pieza va con esto)") && disenos[0]?.toLowerCase().includes("#01095c") && disenos[0]?.includes("Criterio y voz de la cuenta que publica"), "Faro recibe la marca del proyecto (sus colores), no la de la cuenta");
  exigir(juicios.length === 2 && juicios.every((l) => l.includes("La pieza a juzgar")), "la revisión mira la pieza dibujada al lado de las referencias");
  // El sparring de Nova (sistema/124): antes de diseñar, tres caminos; el cliché se descarta y Faro sigue el elegido.
  const sp = pieza.locator("[data-sparring]");
  exigir(await sp.count() === 1 && /El tramo a sangre/.test(await sp.innerText()), `Nova discute la pieza antes y descarta el cliché (${await sp.innerText().catch(() => "")})`);
  exigir(disenos[0]?.includes("El camino que eligió Nova") && disenos[0]?.includes("El tramo a sangre") && disenos[0]?.includes("Descartados por cliché: La web en una laptop"), "Faro diseña siguiendo el camino de Nova");
  await p.screenshot({ path: join(capturas, "1-pieza.png"), fullPage: true });

  // 4 · Pedir un cambio con una nota: Faro la rehace con eso. Después, aprobar.
  await pieza.locator("input").fill("el logo más chico");
  await pieza.locator("[data-cambio]").click();
  await p.waitForFunction(() => document.querySelector("[data-pieza-faro]")?.textContent?.includes("Versión 3"), null, { timeout: 200000 }).catch(() => {});
  const ultimo = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes('"disenar_pieza"')).pop() ?? "";
  exigir(ultimo.includes("Jay o Luna pidieron: el logo más chico"), "el cambio pedido le llega a Faro");
  await pieza.locator("[data-aprobar]").click();
  exigir(await espera(p.locator("[data-pieza-faro][data-estado=aprobada]"), 15000), "la pieza queda aprobada");
  await p.screenshot({ path: join(capturas, "2-aprobada.png"), fullPage: true });
  exigir(await p.locator("[data-pieza-faro][data-estado=aprobada] [data-paquete] [data-bajar-zip]").count() === 1, "la pieza aprobada se puede bajar para subir");

  // 5 · El mes con Faro (sistema/127): el calendario se arma y Faro diseña cada publicación, sin plantillas.
  await p.goto(`${B}/estudio/cliente/estudio-faro`);
  const fs = p.locator("[data-form-saber]");
  if (!(await fs.isVisible())) await p.locator("summary:has-text('Lo que sabemos de')").click();
  const saber = { rubro: "Estudio de diseño", oferta: "Webs y marcas", publico: "Empresas medianas", canales: "Instagram", temas: "Proyectos, detalles, logos", tono: "Directo", frecuencia: "3 veces por semana", aprueba: "Jay" };
  for (const [k, v] of Object.entries(saber)) await fs.locator(`[name=saber-${k}]`).fill(v);
  await fs.locator("button:has-text('Guardar lo que sabemos')").click();
  await espera(p.locator("[role=status]:has-text('Guardado.')"));
  const armado = await p.evaluate(() => fetch("/estudio/contenido/armar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cliente: "estudio-faro", mes: "2027-01", pedido: "las primeras 4 publicaciones" }) }).then((r) => r.json()));
  exigir(armado.mes?.piezas === 4, `el mes se arma (${JSON.stringify(armado).slice(0, 160)})`);
  const antesVara = readFileSync(registro, "utf8").split("\n").filter((l) => l.includes("\"revisar_con_vara\"")).length;
  await p.goto(`${B}/estudio/contenido/c-estudio-faro-2027-01`);
  exigir(await espera(p.locator("[data-faro-mes] [data-disenar-mes]")), "el mes ofrece que Faro lo diseñe");
  await p.locator("[data-disenar-mes]").click();
  exigir(/cerca de un dólar/.test(await p.locator("[data-faro-mes]").innerText()), "antes de gastar, dice cuánto cuesta");
  await p.locator("[data-disenar-mes-si]").click();
  exigir(await espera(p.locator("[data-faro-mes] [role=status]:has-text('Faro diseñando')"), 10000), "mientras diseña, dice cuál va");
  exigir(await espera(p.locator("[data-faro-mes]:has-text('Faro terminó: 4 de 4')"), 500000), `Faro diseña las 4 publicaciones (${await p.locator("[data-faro-mes]").innerText().catch(() => "")})`);
  exigir(await p.locator("[data-faro-mini]").count() === 4, `el calendario muestra el arte de Faro (${await p.locator("[data-faro-mini]").count()})`);
  const disMes = readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes('"disenar_pieza"') && l.includes("La publicación del calendario"));
  exigir(disMes.length >= 4, `cada publicación del mes le llega a Faro con su idea del calendario (${disMes.length})`);
  exigir(disMes.some((l) => l.includes("La PORTADA de un reel")), "el reel se diseña como portada vertical");
  exigir(disMes.every((l) => l.includes("Lo que ya corrigieron Jay y Luna") && l.includes("el logo más chico")), "Faro recibe lo que ya corrigieron, aparte");
  exigir(disMes.slice(1).every((l) => l.includes("El feed de la cuenta")), "Faro ve el feed de la cuenta antes de diseñar");
  exigir(readFileSync(registro, "utf8").split("\n").filter((l) => l.includes("\"revisar_con_vara\"")).length === antesVara, "no se gasta en revisar plantillas que no se van a usar");
  // El reel: portada 1080×1920 y el video del recorrido.
  const reel = p.locator("[data-pieza]").nth(3);
  await reel.click();
  const det = p.locator("[data-detalle]");
  const tamReel = await det.locator("[data-laminas] img").first().evaluate((i) => new Promise((r) => { const v = () => r(`${i.naturalWidth}x${i.naturalHeight}`); if (i.complete) v(); else i.onload = v; }));
  exigir(tamReel === "1080x1920" && await det.locator("[data-laminas][data-formato=reel]").count() === 1, `el reel trae su portada vertical (${tamReel})`);
  // Como su perfil: la grilla de 3, sin historias.
  await p.locator("[data-vista-mes=perfil]").click();
  exigir(await p.locator("[data-perfil] [data-perfil-pieza] img").count() === 4, "el mes se ve como su perfil de Instagram");
  await p.screenshot({ path: join(capturas, "3-perfil.png"), fullPage: true });
  await p.locator("[data-perfil-pieza]").first().click();
  await det.locator("[data-aprobar]").click();
  exigir(await espera(det.locator("[data-paquete] [data-bajar-zip]"), 20000), "al aprobar, queda el paquete para subir");
  exigir(await espera(p.locator("[data-detalle][data-estado=aprobada]"), 5000), "la publicación del mes queda aprobada");
  const zip = await p.evaluate((h) => fetch(h).then(async (r) => ({ ok: r.ok, tipo: r.headers.get("content-type"), n: (await r.arrayBuffer()).byteLength })), await det.locator("[data-bajar-zip]").getAttribute("href"));
  exigir(zip.ok && zip.tipo === "application/zip" && zip.n > 10000, `el .zip trae las imágenes y el texto (${JSON.stringify(zip)})`);
  await p.reload();
  exigir(await espera(p.locator("[data-pieza][data-estado=aprobada]")), "después de recargar sigue aprobada");
  await p.screenshot({ path: join(capturas, "4-mes.png"), fullPage: true });
  // En celular: la publicación a pantalla completa con su arte de Faro.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const pc = await cel.newPage();
  await pc.goto(`${B}/estudio/contenido/c-estudio-faro-2027-01`);
  await pc.locator("[data-pieza]").first().click();
  exigir(await espera(pc.locator("[data-detalle] [data-arte-faro] img").first()), "en celular se ve el arte de Faro");
  await pc.screenshot({ path: join(capturas, "5-celular.png") });
  await cel.close();
  await ctx.close();
} finally {
  await nav.close();
  sitio.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
