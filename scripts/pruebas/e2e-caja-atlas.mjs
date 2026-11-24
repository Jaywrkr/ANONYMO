// Atlas, una sola conversación (sistema/106; antes la caja de sistema/95), con nube.sh recién levantado (Supabase y Anthropic falsos).
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
const pedidosIA = () => { try { return readFileSync(registro, "utf8").trim().split("\n").filter((l) => l.includes("Faro, contenido de Unmake")).length; } catch { return 0; } };
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

  // 1 · Atlas abre en una sola conversación: lo que te toca hoy arriba y cómo escribirle.
  await p.goto(`${B}/estudio`);
  await p.locator("button[aria-label='Abrir chat de Atlas']").click();
  const panel = p.getByRole("dialog", { name: "Chat con Atlas" });
  const caja = panel.locator("#caja-atlas");
  await espera(panel.locator("#caja-atlas:not([disabled])"));
  exigir(await panel.getByRole("tab").count() === 0, "ya no hay pestañas «Pedir» y «Proyecto»: una sola conversación");
  exigir(await espera(panel.locator("[data-hoy]")) && /Hoy te toca · \d/.test(await panel.locator("[data-hoy]").innerText()), "arriba dice lo que te toca hoy");
  exigir(/Escríbeme normal/.test(await panel.innerText()) && /quién lo hace: Faro, Imán o Atlas/.test(await panel.innerText()), "explica que se le escribe normal y los atajos");
  const ultima = () => panel.locator("article").last();
  const respuesta = async (n, ms = 60000) => { await espera(panel.locator("article").nth(n), ms); await espera(panel.locator("[role=status]:has-text('Atlas está en eso')"), 300).then(() => null); return panel.locator("article").nth(n); };
  const decir = async (t) => { const n = await panel.locator("article").count(); await caja.fill(t); await caja.press("Enter"); return respuesta(n); };

  // 2 · En palabras normales: entiende qué es y para quién.
  let r = await decir("¿qué me toca hoy?");
  exigir(/Hoy te toca/.test(await r.innerText()) && await r.locator("[data-tarjeta] a").count() > 0, "«¿qué me toca hoy?» responde la lista con un botón para cada cosa");
  r = await decir("cómo va la web de clínica sonrisa");
  exigir(/Preguntar por su proyecto · Clínica Sonrisa · lo entendí con IA/.test(await r.locator("[data-entendi]").innerText()) && /Proyecto de Clínica Sonrisa/.test(await r.innerText()), "una pregunta normal va al proyecto correcto y dice que lo entendió con IA");
  exigir(await r.locator("a:has-text('Ver la conversación')").getAttribute("href") === "/estudio/clinica-sonrisa/atlas", "la conversación del proyecto queda en su página de memoria");
  r = await decir("el mensaje para el consultorio dental");
  exigir(await espera(r.getByRole("button", { name: "Consultorio Dental Prisma" })) && await r.getByRole("button").count() >= 2, "si hay dos clientes posibles, pregunta con botones");
  await r.getByRole("button", { name: "Consultorio Dental Prisma" }).click();
  const tMensaje0 = panel.locator("[data-tarjeta]").filter({ hasText: "Mensaje para Consultorio Dental Prisma" });
  exigir(await espera(tMensaje0, 60000), "al tocar la opción, lo hace");
  r = await decir("¿qué sabes de café lento?");
  exigir(/Lo que sé de Café Lento/.test(await r.innerText()) && await r.locator("a:has-text('Corregir en su ficha')").getAttribute("href") === "/estudio/cliente/cafe-lento#saber", "muestra lo que sabe de un cliente y dónde corregirlo");

  // 3 · Con atajos: @ sugiere quién lo hace; Enter lo pone; muestra lo que entendió antes de mandar.
  await caja.fill(""); await caja.click(); await caja.pressSequentially("@");
  const sug = panel.getByRole("listbox", { name: "Sugerencias" });
  exigir(await espera(sug) && (await sug.getByRole("option").allInnerTexts()).map((t) => t.split("\n")[0]).join() === "Faro,Imán,Atlas", "@ sugiere a Faro, Imán y Atlas");
  await caja.press("Enter");
  exigir((await caja.inputValue()) === "@Faro ", "Enter pone al elegido");
  await caja.pressSequentially("un reel de por qué una web propia vende más que solo Instagram");
  exigir(/Hace\s*Faro · Guion de video/.test(await panel.locator("form [data-entendi]").innerText()), "antes de mandar, muestra lo que entendió: Faro hace un guion");

  // 4 · Lo que usa IA pregunta primero; cancelar no gasta.
  const antes = pedidosIA();
  let n = await panel.locator("article").count();
  await caja.press("Enter");
  r = await respuesta(n);
  exigir(await espera(r.getByRole("alertdialog", { name: "Confirmar" })) && /Usa IA/.test(await r.getByRole("alertdialog").innerText()), "antes de usar IA pide confirmación");
  await r.getByRole("button", { name: "Cancelar" }).click();
  exigir(pedidosIA() === antes && /no se gastó nada/.test(await r.innerText()), "cancelar no gasta y lo dice");
  await caja.fill("@Faro un reel de por qué una web propia vende más que solo Instagram"); n = await panel.locator("article").count(); await caja.press("Enter"); r = await respuesta(n);
  await r.getByRole("button", { name: "Sí, hazlo" }).click();
  exigir(await espera(panel.locator("[data-tarjeta]").filter({ hasText: "Guion:" }), 60000), "Faro escribe y el guion llega como tarjeta");
  exigir(pedidosIA() === antes + 1 && (await caja.inputValue()) === "", "se gastó una sola vez y la caja queda limpia");
  exigir(await panel.locator("[data-tarjeta] a:has-text('Abrir en Video')").count() >= 1, "la tarjeta lleva a Video");

  // 5 · # sugiere clientes; si falta lo mínimo, no se puede y dice qué falta.
  await caja.pressSequentially("#sonr");
  exigir(await espera(sug.getByRole("option", { name: /Clínica Sonrisa/ })), "# sugiere clientes mientras escribes");
  await caja.press("Tab"); await caja.pressSequentially("/gu"); await caja.press("Tab"); await caja.pressSequentially("un video para el día de la madre");
  { const v = await caja.inputValue(); exigir(v === "#clinica-sonrisa /guion un video para el día de la madre", `Tab pone el cliente y la acción (${v})`); }
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('A Clínica Sonrisa le falta')")) && await panel.getByRole("button", { name: "Enviar" }).isDisabled(), "sin lo mínimo, no se puede pedir y dice qué falta");
  exigir(await panel.locator("[data-aviso-caja] a:has-text('Completar en su ficha')").getAttribute("href") === "/estudio/cliente/clinica-sonrisa#saber", "y lleva a su ficha");

  // 6 · Preguntar por su proyecto: responde aquí y queda en la memoria del proyecto.
  r = await decir("#clinica-sonrisa /proyecto en qué fase va el proyecto");
  exigir(/Atlas · Preguntar por su proyecto/.test(await r.locator("[data-entendi]").innerText()) && !/Pregúntame lo que quieras/.test(await r.innerText()), "con marcas, pregunta por su proyecto y responde");
  // Un cambio: pregunta antes; con sí, queda anotado y se ve el avance en vivo.
  r = await decir("#clinica-sonrisa /cambio que el botón de reservar diga «Agenda tu cita»");
  exigir(await espera(r.getByRole("alertdialog", { name: "Confirmar" })) && /anotar este cambio en el proyecto de Clínica Sonrisa/.test(await r.innerText()), "un cambio pide confirmación");
  await r.getByRole("button", { name: "Sí, hazlo" }).click();
  exigir(await espera(panel.locator("[data-tarjeta]").filter({ hasText: "Cambio en el proyecto de Clínica Sonrisa" }), 60000), "el cambio queda anotado y llega como tarjeta");
  exigir(await espera(panel.locator("[data-avance]").last(), 10000), "debajo se ve el avance del equipo en vivo");

  // 7 · Imán: su muestra y su mensaje. El cliente queda como contexto, a la vista y se puede quitar.
  r = await decir("#prisma /muestra");
  const tMuestra = panel.locator("[data-tarjeta]").filter({ hasText: "Muestra de Consultorio Dental Prisma" }).last();
  exigir(await espera(tMuestra) && /\/m\/consultorio-dental-prisma-[0-9a-f]{6}$/.test(await tMuestra.locator("a:has-text('Abrir la muestra')").getAttribute("href") ?? ""), "la muestra llega con su enlace");
  exigir(/Consultorio Dental Prisma/.test(await panel.locator("[data-contexto]").innerText()), "el cliente queda arriba de la caja como contexto");
  await caja.fill("/mensaje");
  exigir(/Para\s*Consultorio Dental Prisma/.test(await panel.locator("form [data-entendi]").innerText()), "sin nombrarlo, sigue con el mismo cliente");
  n = await panel.locator("article").count(); await caja.press("Enter"); r = await respuesta(n);
  const tMensaje = r.locator("[data-tarjeta]").filter({ hasText: "Mensaje para Consultorio Dental Prisma" });
  exigir(await espera(tMensaje) && /\/m\/consultorio-dental-prisma-/.test(await tMensaje.innerText()), "el mensaje lleva el enlace de su muestra");
  exigir(await tMensaje.locator("a:has-text('Abrir en WhatsApp')").count() === 1, "se puede abrir en WhatsApp: lo mandas tú");
  await tMensaje.getByRole("button", { name: "Copiar" }).click();
  exigir(await espera(tMensaje.getByRole("button", { name: "Copiado" }), 3000), "copiar dice que copió");

  // 8 · Lo que no se puede o lo que falta se dice sin gastar.
  await caja.fill("/contenido");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('Consultorio Dental Prisma le falta')")) && await panel.getByRole("button", { name: "Enviar" }).isDisabled(), "al mes de contenido le falta lo mínimo");
  r = await decir("/datos");
  exigir(await espera(r.locator("[role=alert]:has-text('No sé la web de Consultorio Dental Prisma')")) && await r.locator("a:has-text('Completar en su ficha')").count() === 1, "sin su web, lo dice y lleva a su ficha");
  await caja.fill("@vector hola");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('No conozco a «@vector»')")), "un agente que no recibe pedidos se dice claro");
  await caja.fill("@faro /muestra");
  exigir(await espera(panel.locator("[data-aviso-caja]:has-text('Faro no hace «Ver su muestra»: lo hace Imán')")), "si el agente no hace eso, dice quién lo hace");
  await panel.getByRole("button", { name: /Quitar Consultorio Dental Prisma/ }).click();
  exigir(await panel.locator("[data-contexto]").count() === 0, "el contexto se quita con un toque");
  await caja.fill("");

  // 9 · La conversación se guarda: al volver a entrar sigue ahí. Y la memoria del proyecto tiene la pregunta.
  await p.reload(); await p.locator("button[aria-label='Abrir chat de Atlas']").click(); await espera(panel.locator("#caja-atlas:not([disabled])"));
  exigir(await espera(panel.locator("[data-tarjeta]").filter({ hasText: "Mensaje para Consultorio Dental Prisma" }).first()), "al volver, la conversación sigue ahí");
  await p.screenshot({ path: join(capturas, "1-escritorio.png") });
  await p.goto(`${B}/estudio/clinica-sonrisa/atlas`);
  exigir(await espera(p.locator("text=en qué fase va el proyecto").first(), 20000), "la pregunta quedó en la memoria del proyecto");
  // Dentro de un proyecto, ese proyecto es el contexto: se pregunta sin nombrarlo.
  await p.goto(`${B}/estudio/clinica-sonrisa`);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("anonymo:atlas", { detail: {} })));
  exigir(await espera(panel.locator("[data-contexto]:has-text('Clínica Sonrisa')")), "dentro de un proyecto, aparece como contexto");
  await espera(panel.locator("#caja-atlas:not([disabled])"));
  r = await decir("en qué fase va");
  exigir(/Proyecto de Clínica Sonrisa/.test(await r.innerText()), "sin nombrarlo, pregunta por ese proyecto");
  await ctx.close();

  // 10 · En celular, desde la barra de abajo.
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await cel.newPage();
  m.on("pageerror", (e) => fallas.push(`error en celular: ${e.message}`));
  await m.goto(`${B}/entrar`); await m.check('input[name="quien"][value="jay"]', { force: true }); await m.fill('input[name="clave"]', "prueba-clave-jay"); await m.click("text=Entrar al estudio"); await m.waitForURL(/estudio$/);
  await m.getByRole("navigation", { name: "Accesos móviles" }).getByRole("button", { name: "Atlas", exact: true }).click();
  const pm = m.getByRole("dialog", { name: "Chat con Atlas" });
  await espera(pm.locator("#caja-atlas:not([disabled])"));
  const nm = await pm.locator("article").count();
  await pm.locator("#caja-atlas").fill("#prisma /muestra");
  await pm.getByRole("button", { name: "Enviar" }).click();
  await espera(pm.locator("article").nth(nm), 60000);
  exigir(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "en celular nada se sale de la pantalla");
  const b = await pm.getByRole("button", { name: "Enviar" }).boundingBox();
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
