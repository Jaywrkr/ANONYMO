// La caja única de Atlas (sistema/95), con nube.sh recién levantado (Supabase y Anthropic falsos).
// Levanta su Google Maps falso en 45999 para tener un cliente nuevo de Imán con muestra.
// Uso: node scripts/pruebas/e2e-caja-atlas.mjs [carpeta-capturas]
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const B = "http://127.0.0.1:3100";
const capturas = process.argv[2] ?? "/tmp/anonymo-pruebas/capturas-caja";
mkdirSync(capturas, { recursive: true });
const registro = process.env.ANTHROPIC_REGISTRO ?? "/tmp/anonymo-pruebas/pedidos-ia.jsonl";
// Solo los pedidos a Faro: otras partes del estudio pueden usar la IA falsa mientras corre la prueba.
const pedidosIA = () => { try { return readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes("Faro, contenido de ANONYMO")).length; } catch { return 0; } };
const fallas = [];
const exigir = (ok, texto) => { console.log(`${ok ? "✓" : "✗"} ${texto}`); if (!ok) fallas.push(texto); };
const espera = (loc, ms = 20000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

const LUGARES = [{ id: "caja-uno", displayName: { text: "Consultorio Dental Prisma" }, rating: 4.8, userRatingCount: 90, nationalPhoneNumber: "099 222 0001", googleMapsUri: "https://maps.google.com/?cid=21", formattedAddress: "Av. Solano 2-10, Cuenca" }];
const servidor = createServer((req, res) => {
  const partes = [];
  req.on("data", (d) => partes.push(d));
  req.on("end", () => {
    if (req.url === "/v1/places:searchText") {
      const q = JSON.parse(Buffer.concat(partes).toString()).textQuery ?? "";
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ places: q.startsWith("odontólogo prueba") ? LUGARES : [] }));
    }
    res.writeHead(404); res.end();
  });
}).listen(45999, "127.0.0.1");

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const ctx = await nav.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: B });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fallas.push(`error en la página: ${e.message}`));
  await p.goto(`${B}/entrar`); await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);

  // Un cliente nuevo de Imán, para tener muestra y mensaje.
  await p.goto(`${B}/estudio/clientes/nuevos`);
  await p.waitForSelector("button:has-text('Que Imán busque')");
  for (const g of ["Salud", "Legal y contable", "Belleza y bienestar"]) { const b = p.locator(`button[aria-pressed=true]:has-text('${g}')`); if (await b.count()) await b.click(); }
  await p.fill("input[placeholder^='Otras búsquedas']", "odontólogo prueba");
  await p.click("button:has-text('Que Imán busque')");
  await espera(p.locator("[role=status]:has-text('Listo: 1 negocio nuevo')"), 60000);

  // 1 · Fuera de un proyecto, Atlas abre en «Pedir», con ayuda de cómo escribir.
  await p.goto(`${B}/estudio`);
  await p.locator("button[aria-label='Abrir chat de Atlas']").click();
  const panel = p.getByRole("dialog", { name: "Chat con Atlas" });
  const caja = panel.locator("#caja-atlas");
  exigir(await espera(caja) && await panel.getByRole("tab", { name: "Pedir" }).getAttribute("aria-selected") === "true", "Atlas abre en «Pedir» con la caja lista");
  exigir(/quién lo hace: Faro, Imán o Atlas/.test(await panel.innerText()), "explica @, # y / antes de empezar");
  await espera(panel.locator("#caja-atlas[placeholder^='Ej.']"));

  // 2 · @ sugiere quién lo hace; Enter lo pone.
  await caja.click(); await caja.pressSequentially("@");
  const sug = panel.getByRole("listbox", { name: "Sugerencias" });
  exigir(await espera(sug) && (await sug.getByRole("option").allInnerTexts()).map((t) => t.split("\n")[0]).join() === "Faro,Imán,Atlas", "@ sugiere a Faro, Imán y Atlas");
  await caja.press("Enter");
  exigir((await caja.inputValue()) === "@Faro ", "Enter pone al elegido");
  await caja.pressSequentially("un reel de por qué una web propia vende más que solo Instagram");
  exigir(/Hace\s*Faro · Guion de video/.test(await panel.locator("[data-entendi]").innerText()), "muestra lo que entendió: Faro hace un guion");

  // 3 · Lo que usa IA pregunta primero; cancelar no gasta.
  const antes = pedidosIA();
  await panel.getByRole("button", { name: "Pedirle a Faro" }).click();
  exigir(await espera(panel.getByRole("alertdialog", { name: "Confirmar" })) && /Usa IA/.test(await panel.getByRole("alertdialog").innerText()), "antes de usar IA pide confirmación");
  await panel.getByRole("button", { name: "Cancelar" }).click();
  exigir(pedidosIA() === antes && (await caja.inputValue()).includes("un reel"), "cancelar no gasta y deja lo escrito");
  await panel.getByRole("button", { name: "Pedirle a Faro" }).click();
  await panel.getByRole("button", { name: "Sí, hazlo" }).click();
  exigir(await espera(panel.locator("[data-tarjeta]").filter({ hasText: "Guion:" }), 60000), "Faro escribe y el guion llega como tarjeta");
  exigir(pedidosIA() === antes + 1 && (await caja.inputValue()) === "", "se gastó una sola vez y la caja queda limpia");
  exigir(await panel.locator("[data-tarjeta] a:has-text('Abrir en Video')").count() === 1, "la tarjeta lleva a Video");

  // 4 · # sugiere clientes; si falta lo mínimo, no se puede y dice qué falta.
  await caja.pressSequentially("#sonr");
  exigir(await espera(sug.getByRole("option", { name: /Clínica Sonrisa/ })), "# sugiere clientes mientras escribes");
  await caja.press("Tab");
  await caja.pressSequentially("/gu");
  await caja.press("Tab");
  await caja.pressSequentially("un video para el día de la madre");
  exigir((await caja.inputValue()) === "#clinica-sonrisa /guion un video para el día de la madre", "Tab pone el cliente y la acción");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('A Clínica Sonrisa le falta')")) && await panel.getByRole("button", { name: "Pedirle a Faro" }).isDisabled(), "sin lo mínimo, no se puede pedir y dice qué falta");
  exigir(await panel.locator("[data-aviso-caja] a:has-text('Completar en su ficha')").getAttribute("href") === "/estudio/cliente/clinica-sonrisa#saber", "y lleva a su ficha");

  // 5 · Su proyecto: abre la conversación del proyecto en la otra pestaña.
  await caja.fill("#clinica-sonrisa /proyecto");
  await panel.getByRole("button", { name: "Hacerlo" }).click();
  await espera(panel.locator("[data-tarjeta]").filter({ hasText: "Proyecto de Clínica Sonrisa" }));
  await panel.getByRole("button", { name: "Abrir la conversación" }).click();
  exigir(await panel.getByRole("tab", { name: "Proyecto" }).getAttribute("aria-selected") === "true" && await panel.getByLabel("Proyecto de la conversación").inputValue() === "clinica-sonrisa", "«Abrir la conversación» pasa a su proyecto");
  await panel.getByRole("tab", { name: "Pedir" }).click();

  // 6 · Imán: su muestra y su mensaje. El cliente se mantiene para lo siguiente.
  await caja.fill("#prisma /muestra");
  await panel.getByRole("button", { name: "Hacerlo" }).click();
  const tMuestra = panel.locator("[data-tarjeta]").filter({ hasText: "Muestra de Consultorio Dental Prisma" });
  exigir(await espera(tMuestra) && /\/m\/consultorio-dental-prisma-[0-9a-f]{6}$/.test(await tMuestra.locator("a:has-text('Abrir la muestra')").getAttribute("href") ?? ""), "la muestra llega con su enlace");
  await caja.fill("/mensaje");
  exigir(/Para\s*Consultorio Dental Prisma/.test(await panel.locator("[data-entendi]").innerText()), "sin nombrarlo, sigue con el mismo cliente");
  await panel.getByRole("button", { name: "Hacerlo" }).click();
  const tMensaje = panel.locator("[data-tarjeta]").filter({ hasText: "Mensaje para Consultorio Dental Prisma" });
  exigir(await espera(tMensaje) && /\/m\/consultorio-dental-prisma-/.test(await tMensaje.innerText()), "el mensaje lleva el enlace de su muestra");
  exigir(await tMensaje.locator("a:has-text('Abrir en WhatsApp')").count() === 1, "se puede abrir en WhatsApp: lo mandas tú");
  await tMensaje.getByRole("button", { name: "Copiar" }).click();
  exigir(await espera(tMensaje.getByRole("button", { name: "Copiado" }), 3000), "copiar dice que copió");

  // 7 · Lo que no se puede todavía, o lo que falta, se dice sin gastar.
  await caja.fill("/contenido");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('todavía no se puede pedir')")) && await panel.getByRole("button", { name: /Pedirle a Faro|Hacerlo/ }).isDisabled(), "el mes de contenido dice que todavía no");
  await caja.fill("/datos");
  await panel.getByRole("button", { name: "Hacerlo" }).click();
  exigir(await espera(panel.locator("[data-tarjeta] [role=alert]:has-text('No sé la web de Consultorio Dental Prisma')")), "sin su web, lo dice y lleva a su ficha");
  await caja.fill("@vector hola");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('No conozco a «@vector»')")), "un agente que no recibe pedidos se dice claro");
  await caja.fill("@faro /muestra");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('Faro no hace «Ver su muestra»: lo hace Imán')")), "si el agente no hace eso, dice quién lo hace");
  await caja.fill("");
  await p.screenshot({ path: join(capturas, "1-escritorio.png") });
  await ctx.close();

  // 8 · En celular, desde la barra de abajo.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await cel.newPage();
  m.on("pageerror", (e) => fallas.push(`error en celular: ${e.message}`));
  await m.goto(`${B}/entrar`); await m.check('input[name="quien"][value="jay"]', { force: true }); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
  await m.getByRole("navigation", { name: "Accesos móviles" }).getByRole("button", { name: "Atlas", exact: true }).click();
  const pm = m.getByRole("dialog", { name: "Chat con Atlas" });
  await espera(pm.locator("#caja-atlas[placeholder^='Ej.']"));
  await pm.locator("#caja-atlas").fill("#prisma /muestra");
  await pm.getByRole("button", { name: "Hacerlo" }).click();
  await espera(pm.locator("[data-tarjeta]"));
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "en celular nada se sale de la pantalla");
  const b = await pm.getByRole("button", { name: /Hacerlo|Enviar/ }).boundingBox();
  exigir(!!b && b.height >= 44, "el botón se toca bien con el dedo");
  await m.screenshot({ path: join(capturas, "2-celular.png") });
  await cel.close();
} catch (e) {
  fallas.push(`la prueba se cayó: ${e.message}`);
  console.log(`✗ la prueba se cayó: ${e.message}`);
} finally {
  await nav.close();
  servidor.close();
}
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nTodo bien");
process.exit(fallas.length ? 1 : 0);
