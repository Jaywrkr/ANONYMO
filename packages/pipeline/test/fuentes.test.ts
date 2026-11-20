import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { celularLocal, direccionPermitida, guardarFicha, leerFichas, leerFuentes, leerInstagram, leerPaginaNegocio, leerWebNegocio, usuarioInstagram } from "../src/index.ts";

// Una web de negocio de verdad, simplificada: menú, sección de servicios, botón de WhatsApp y datos para Google.
const PORTADA = `<!doctype html><html><head><meta name="viewport" content="width=device-width">
<meta name="theme-color" content="#0B5D5A"><title>Clínica Sonrisa</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Dentist","name":"Clínica Sonrisa","telephone":"+593 99 123 4567",
"address":{"@type":"PostalAddress","streetAddress":"Av. Solano 1-23","addressLocality":"Cuenca"},"openingHours":["Mo-Fr 09:00-18:00","Sa 09:00-13:00"],
"logo":"/img/logo.png","sameAs":["https://www.instagram.com/clinica.sonrisa/"]}</script></head>
<body><nav><a href="/">Inicio</a><a href="/tratamientos">Tratamientos</a><a href="#contacto">Contacto</a></nav>
<h1>Tu sonrisa, en buenas manos</h1>
<h2>Nuestros servicios</h2><ul><li>Ortodoncia invisible</li><li>Blanqueamiento</li><li>Implantes</li><li>Ver más</li></ul>
<h2>Contacto</h2><p>Escríbenos</p>
<a href="https://wa.me/593991234567?text=hola">WhatsApp</a>
<a href="https://www.instagram.com/clinica.sonrisa/">Instagram</a><a href="https://facebook.com/clinicasonrisa">Facebook</a>
</body></html>`;
const TRATAMIENTOS = `<html><body><h1>Tratamientos</h1><h3>Ortodoncia invisible</h3><h3>Blanqueamiento</h3><h3>Implantes</h3><h3>Carillas de porcelana</h3><h3>Limpieza dental</h3><h2>Agenda tu cita</h2><h3>Llámanos</h3></body></html>`;

const IG = {
  business_discovery: {
    username: "clinica.sonrisa", name: "Clínica Sonrisa", biography: "Odontología estética en Cuenca 🦷 Citas: 099 123 4567", website: "https://clinicasonrisa.ec",
    followers_count: 1200, media_count: 340,
    media: { data: [
      ...Array.from({ length: 8 }, (_, i) => ({ media_type: "IMAGE", timestamp: new Date(Date.parse("2026-11-19T12:00:00Z") - i * 7 * 864e5).toISOString(), caption: "x" })),
      { media_type: "VIDEO", timestamp: "2026-11-10T12:00:00Z" },
    ] },
  },
};

const falso = (rutas: Record<string, string | object>, vistos: string[] = []): typeof fetch => (async (u: string | URL) => {
  const url = String(u);
  vistos.push(url);
  const clave = Object.keys(rutas).find((k) => url.startsWith(k));
  if (!clave) return new Response("no", { status: 404 });
  const v = rutas[clave];
  return typeof v === "string"
    ? Object.defineProperty(new Response(v, { headers: { "content-type": "text/html" } }), "url", { value: url })
    : new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } });
}) as typeof fetch;

test("los celulares y las cuentas se entienden en cualquier forma", () => {
  assert.equal(celularLocal("+593 99 123 4567"), "0991234567");
  assert.equal(celularLocal("593991234567"), "0991234567");
  assert.equal(celularLocal("07 281 2345"), undefined, "un fijo no sirve para WhatsApp");
  assert.equal(usuarioInstagram("https://www.instagram.com/clinica.sonrisa/"), "clinica.sonrisa");
  assert.equal(usuarioInstagram("@clinica.sonrisa"), "clinica.sonrisa");
  assert.equal(usuarioInstagram("https://www.instagram.com/p/ABC123/"), undefined, "una publicación no es una cuenta");
});

test("de la portada salen los datos con su fuente, sin inventar nada", () => {
  const { propuestas, enlaces } = leerPaginaNegocio(PORTADA, "https://clinicasonrisa.ec/");
  const v = Object.fromEntries(propuestas.map((p) => [p.clave, p.valor]));
  assert.equal(v.instagram, "@clinica.sonrisa");
  assert.equal(v.celular, "0991234567");
  assert.equal(v.canales, "Instagram, Facebook");
  assert.equal(v.direccion, "Av. Solano 1-23, Cuenca");
  assert.equal(v.horario, "Lunes a Viernes: 09:00–18:00 · Sábado: 09:00–13:00");
  assert.equal(v.servicios, "Ortodoncia invisible\nBlanqueamiento\nImplantes", "«Ver más» no es un servicio");
  assert.equal(v.color, "#0B5D5A");
  assert.equal(v.logo, "https://clinicasonrisa.ec/img/logo.png");
  assert.ok(propuestas.every((p) => p.fuente === "web" && p.detalle), "cada dato dice de dónde salió");
  assert.deepEqual(enlaces.map((e) => e.href), ["https://clinicasonrisa.ec/tratamientos"]);
  // Una página sin nada útil no propone nada.
  assert.deepEqual(leerPaginaNegocio("<html><body><h1>Hola</h1></body></html>", "https://x.ec/").propuestas, []);
});

test("la web se lee con su página de servicios, y la lista más completa gana", async () => {
  const r = await leerWebNegocio("clinicasonrisa.ec", falso({ "https://clinicasonrisa.ec/tratamientos": TRATAMIENTOS, "https://clinicasonrisa.ec": PORTADA }));
  assert.equal(r.estado.estado, "ok");
  assert.equal(r.estado.paginas, 2);
  assert.equal(r.propuestas.find((p) => p.clave === "servicios")?.valor.split("\n").length, 5);
  assert.equal(r.propuestas.find((p) => p.clave === "servicios")?.detalle, "página /tratamientos");
  const rota = await leerWebNegocio("https://no-existe.ec", falso({}));
  assert.equal(rota.estado.estado, "fallo");
  assert.match(rota.estado.motivo ?? "", /error \(404\)/);
  const red = await leerWebNegocio("https://instagram.com/x", falso({}));
  assert.match(red.estado.motivo ?? "", /red social/);
});

test("no se leen direcciones internas", () => {
  assert.equal(direccionPermitida("http://127.0.0.1:3000", false), false);
  assert.equal(direccionPermitida("http://192.168.1.10", false), false);
  assert.equal(direccionPermitida("file:///etc/passwd", false), false);
  assert.equal(direccionPermitida("https://clinicasonrisa.ec", false), true);
});

test("Instagram sin conectar lo dice; conectado trae lo suyo y nunca muestra la clave", async () => {
  const antes = { ...process.env };
  delete process.env.INSTAGRAM_TOKEN;
  const sin = await leerInstagram("@clinica.sonrisa", falso({}));
  assert.equal(sin.estado.estado, "sin-conexion");
  process.env.INSTAGRAM_TOKEN = "token-secreto-de-prueba";
  process.env.INSTAGRAM_CUENTA_ID = "17841400000000000";
  process.env.INSTAGRAM_API_URL = "https://graph.prueba";
  const vistos: string[] = [];
  const r = await leerInstagram("clinica.sonrisa", falso({ "https://graph.prueba/17841400000000000": IG }, vistos), new Date("2026-11-20T00:00:00Z"));
  assert.match(vistos[0], /business_discovery\.username\(clinica\.sonrisa\)/);
  const v = Object.fromEntries(r.propuestas.map((p) => [p.clave, p.valor]));
  assert.equal(v.celular, "0991234567");
  assert.match(v.fotos, /^8 fotos/);
  assert.equal(v.frecuencia, "Hoy publica más o menos una vez por semana");
  assert.equal(v.tono, undefined, "el tono no se adivina");
  assert.equal(r.web, "https://clinicasonrisa.ec");
  const mala = await leerInstagram("personal", falso({ "https://graph.prueba": { error: { code: 190, message: "token-secreto-de-prueba expired" } } }));
  assert.match(mala.estado.motivo ?? "", /venció/);
  assert.ok(!JSON.stringify(mala).includes("token-secreto"), "la clave no aparece en lo que se guarda");
  process.env = antes;
});

test("se propone solo lo que falta o lo que dice otra cosa, y su Instagram lleva a su web", async () => {
  const antes = { ...process.env };
  Object.assign(process.env, { INSTAGRAM_TOKEN: "t", INSTAGRAM_CUENTA_ID: "1", INSTAGRAM_API_URL: "https://graph.prueba" });
  const f = falso({ "https://graph.prueba/1": IG, "https://clinicasonrisa.ec/tratamientos": TRATAMIENTOS, "https://clinicasonrisa.ec": PORTADA });
  const l = await leerFuentes({ saber: { instagram: { valor: "@clinica.sonrisa", origen: "mano" }, celular: { valor: "0991234567", origen: "maps" } } }, f, new Date("2026-11-20T00:00:00Z"));
  assert.equal(l.instagram?.estado, "ok");
  assert.equal(l.web?.estado, "ok", "la web salió de su biografía");
  const claves = l.propuestas.map((p) => p.clave);
  assert.ok(!claves.includes("instagram") && !claves.includes("celular"), "lo que ya se sabe igual no se vuelve a proponer");
  assert.equal(l.propuestas.find((p) => p.clave === "canales")?.valor, "Instagram, Facebook");
  assert.equal(l.propuestas.find((p) => p.clave === "servicios")?.fuente, "web");
  assert.equal(l.propuestas.find((p) => p.clave === "fotos")?.fuente, "instagram");
  // Si ya se sabe una lista más larga que incluye la leída, no se vuelve a proponer.
  const corregido = await leerFuentes({ saber: { instagram: { valor: "@clinica.sonrisa", origen: "mano" }, servicios: { valor: "Ortodoncia invisible\nBlanqueamiento\nImplantes\nCarillas de porcelana\nLimpieza dental\nCoronas", origen: "mano" } } }, f, new Date("2026-11-20T00:00:00Z"));
  assert.ok(!corregido.propuestas.some((p) => p.clave === "servicios"));
  // Sin web ni Instagram no hay nada que leer.
  const nada = await leerFuentes({ saber: {} }, f);
  assert.deepEqual([nada.web, nada.instagram, nada.propuestas.length], [undefined, undefined, 0]);
  process.env = antes;
});

test("lo leído se guarda en la ficha aparte y se borra al aprobarlo", async () => {
  await guardarFicha("clinica-sonrisa", { nombre: "Clínica Sonrisa", lectura: { cuando: "2026-11-20T00:00:00Z", propuestas: [{ clave: "servicios", valor: "Implantes", fuente: "web" }] } }, "jay");
  assert.equal((await leerFichas()).fichas["clinica-sonrisa"].lectura?.propuestas.length, 1);
  await guardarFicha("clinica-sonrisa", { nombre: "Clínica Sonrisa", notas: "llamar" }, "jay");
  assert.equal((await leerFichas()).fichas["clinica-sonrisa"].lectura?.propuestas.length, 1, "cambiar otra cosa no la borra");
  await guardarFicha("clinica-sonrisa", { nombre: "Clínica Sonrisa", saber: { servicios: "Implantes" }, lectura: null }, "jay");
  const g = (await leerFichas()).fichas["clinica-sonrisa"];
  assert.equal(g.lectura, undefined);
  assert.equal(g.saber?.servicios, "Implantes");
});
