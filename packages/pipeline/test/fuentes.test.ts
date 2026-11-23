import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { celularLocal, direccionPermitida, guardarFicha, leerFichas, leerFuentes, leerPaginaNegocio, leerWebNegocio, usuarioInstagram } from "../src/index.ts";

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

test("se propone solo lo que falta o no está cubierto, y su Instagram queda a pedido", async () => {
  const f = falso({ "https://clinicasonrisa.ec/tratamientos": TRATAMIENTOS, "https://clinicasonrisa.ec": PORTADA });
  const l = await leerFuentes({ saber: { celular: { valor: "0991234567", origen: "maps" } }, web: "https://clinicasonrisa.ec" }, f);
  assert.equal(l.web?.estado, "ok");
  assert.equal(l.instagram?.estado, "a-pedido", "el Instagram que se encontró en su web no se lee solo");
  assert.equal(l.instagram?.direccion, "@clinica.sonrisa");
  const claves = l.propuestas.map((p) => p.clave);
  assert.ok(!claves.includes("celular"), "lo que ya se sabe igual no se vuelve a proponer");
  assert.ok(claves.includes("instagram") && claves.includes("servicios"));
  // Si ya se sabe una lista más larga que incluye la leída, no se vuelve a proponer.
  const corregido = await leerFuentes({ saber: { servicios: { valor: "Ortodoncia invisible\nBlanqueamiento\nImplantes\nCarillas de porcelana\nLimpieza dental\nCoronas", origen: "mano" } }, web: "https://clinicasonrisa.ec" }, f);
  assert.ok(!corregido.propuestas.some((p) => p.clave === "servicios"));
  // Sin web no hay nada que leer, aunque se sepa su Instagram.
  const nada = await leerFuentes({ saber: { instagram: { valor: "@clinica.sonrisa", origen: "mano" } } }, f);
  assert.deepEqual([nada.web, nada.instagram?.estado, nada.propuestas.length], [undefined, "a-pedido", 0]);
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

test("Unmake: lo que ya sabe el estudio se propone sin leer ninguna web, y no repite lo que ya está", async () => {
  const { leerFuentes, PROPIAS_ANONYMO, esAnonymo } = await import("../src/index.ts");
  assert.ok(esAnonymo("anonymo") && !esAnonymo("consultorio-luz"));
  const nada = (() => { throw new Error("no debía leer la web"); }) as unknown as typeof fetch;
  const l = await leerFuentes({ saber: { nombre: { valor: "Unmake", origen: "mano" }, canales: { valor: "Instagram", origen: "mano" } }, propias: PROPIAS_ANONYMO }, nada);
  const claves = l.propuestas.map((p) => p.clave);
  assert.ok(["rubro", "oferta", "publico", "temas", "tono", "frecuencia", "aprueba"].every((k) => claves.includes(k as never)), claves.join());
  assert.ok(!claves.includes("canales"), "lo que ya dice igual no se repite");
  assert.equal(l.web, undefined);
  assert.ok(l.propuestas.every((p) => p.fuente === "estudio"));
});
