import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activarMiWeb, aplicarCambios, asistenteVisible, CODIGO_RESPONDER, crear, deshacerMiWeb, editablesDe, fotosDe, guardarAsistente, guardarCambios,
  guardarFotoMiWeb, guardarSitio, leerMiWeb, paginaEnVivo, planificar, responderAsistente, revisarMiWeb, usarVersionNueva,
} from "../src/index.ts";

const HTML = `<!doctype html><html><head><style>h1{color:red}</style></head><body>
<nav><a href="index.html">Inicio</a><a href="#contacto"><svg><title>x</title></svg></a></nav>
<h1 class="t">Sonrisa <em>sana</em> en Cuenca</h1>
<p>Atendemos de lunes a viernes.<br>Sábados con cita.</p>
<ul><li>Limpieza: USD 30</li><li>Blanqueamiento: USD 120</li></ul>
<p>Atendemos de lunes a viernes.<br>Sábados con cita.</p>
<p><img src="img/consultorio.jpg" alt="El consultorio"></p>
<img src="./img/equipo.jpg"><img src="https://x.com/a.png">
<p data-no-editar>Hecho por ANONYMO</p>
<script>var p = "<p>no tocar</p>";</script>
<button type="button">Agenda tu cita</button>
</body></html>`;

test("encuentra lo editable: títulos, textos, listas y botones, nunca código ni bloques con otras etiquetas", () => {
  const e = editablesDe(HTML);
  assert.deepEqual(e.map((x) => [x.tipo, x.texto]), [
    ["boton", "Inicio"], ["titulo", "Sonrisa sana en Cuenca"], ["texto", "Atendemos de lunes a viernes.\nSábados con cita."],
    ["lista", "Limpieza: USD 30"], ["lista", "Blanqueamiento: USD 120"], ["texto", "Atendemos de lunes a viernes.\nSábados con cita."], ["boton", "Agenda tu cita"],
  ]);
  assert.notEqual(e[2]!.clave, e[5]!.clave, "dos textos iguales tienen claves distintas");
  assert.equal(editablesDe(HTML.replace("<h1", "<section></section><h1"))[1]!.clave, e[1]!.clave, "la clave no depende de la posición");
  assert.deepEqual(fotosDe(HTML), [{ src: "img/consultorio.jpg", alt: "El consultorio" }, { src: "img/equipo.jpg", alt: "" }]);
});

test("aplica los cambios: escapa el texto, respeta los atributos y avisa lo que ya no encaja", () => {
  const e = editablesDe(HTML);
  const { html, sinEncajar } = aplicarCambios(HTML, {
    textos: { [e[1]!.clave]: "Tu sonrisa <segura>", [e[3]!.clave]: "Limpieza: USD 35\nIncluye revisión", "p-zzz": "nada" },
    fotos: { "img/equipo.jpg": { nuevo: "mw-abc.webp", alt: "Nuestro equipo" } },
  });
  assert.match(html, /<h1 class="t">Tu sonrisa &lt;segura&gt;<\/h1>/);
  assert.match(html, /<li>Limpieza: USD 35<br>Incluye revisión<\/li>/);
  assert.match(html, /<img alt="Nuestro equipo" src="img\/mw-abc.webp">/);
  assert.match(html, /var p = "<p>no tocar<\/p>";/);
  assert.deepEqual(sinEncajar, ["p-zzz"]);
});

test("el asistente responde por parecido de palabras, sin IA, igual en el servidor y en la web", () => {
  const P = [{ pregunta: "¿Cuál es el horario de atención?", respuesta: "Lunes a viernes de 9 a 6." }, { pregunta: "¿Aceptan tarjetas de crédito?", respuesta: "Sí, todas." }, { pregunta: "¿Dónde están ubicados?", respuesta: "Av. Solano." }];
  assert.equal(responderAsistente(P, "qué horario tienen")?.respuesta, "Lunes a viernes de 9 a 6.");
  assert.equal(responderAsistente(P, "aceptan tarjeta?")?.respuesta, "Sí, todas.");
  assert.equal(responderAsistente(P, "hacen envíos a Quito"), undefined);
  const web = new Function(`${CODIGO_RESPONDER}; return responder;`)() as typeof responderAsistente;
  for (const t of ["qué horario tienen", "aceptan tarjeta?", "hacen envíos a Quito", "donde estan ubicados"]) assert.deepEqual(web(P, t), responderAsistente(P, t), t);
});

test("en vivo: activar, cambiar, deshacer, foto, plan y versión nueva", () => {
  const pedido = { id: "miweb-prueba", cliente: "Clínica Prueba", tipo: "web" as const, descripcion: "x", creado: new Date().toISOString() };
  crear(pedido, planificar(pedido, { tareas: ["4.vector"], preguntas: [] }));
  assert.throws(() => activarMiWeb(pedido.id, "jay"), /todavía no tiene web/);
  guardarSitio(pedido.id, 1, { "index.html": HTML, "estilos.css": "body{}" });
  activarMiWeb(pedido.id, "jay");
  const [pag] = revisarMiWeb(pedido.id);
  const titulo = pag!.editables[1]!;
  assert.throws(() => guardarCambios(pedido.id, "index.html", { textos: { [titulo.clave]: "Hola" } }, "cliente"), /plan Cuidado incluye cambios hechos por nosotros/);
  activarMiWeb(pedido.id, "luna", "autonomo");
  assert.throws(() => guardarCambios(pedido.id, "index.html", { textos: { [titulo.clave]: "  " } }, "cliente"), /no puede quedar vacío/);
  guardarCambios(pedido.id, "index.html", { textos: { [titulo.clave]: "Tu sonrisa, bien cuidada" } }, "cliente");
  const foto = guardarFotoMiWeb(pedido.id, new Uint8Array(500).fill(7), "image/webp");
  assert.match(foto, /^mw-[a-f0-9]{16}\.webp$/);
  assert.throws(() => guardarFotoMiWeb(pedido.id, new Uint8Array(500), "image/gif"), /JPG, PNG o WebP/);
  guardarCambios(pedido.id, "index.html", { fotos: { "img/consultorio.jpg": { nuevo: foto } } }, "cliente");
  let e = leerMiWeb(pedido.id)!;
  assert.match(paginaEnVivo(HTML, e, "index.html", "_a.js"), /Tu sonrisa, bien cuidada[\s\S]*img\/mw-/);
  // Volver a escribir lo original deja de ser un cambio.
  guardarCambios(pedido.id, "index.html", { textos: { [titulo.clave]: titulo.texto } }, "cliente");
  assert.equal(leerMiWeb(pedido.id)!.paginas["index.html"]!.textos, undefined);
  deshacerMiWeb(pedido.id, "cliente");
  assert.equal(leerMiWeb(pedido.id)!.paginas["index.html"]!.textos![titulo.clave], "Tu sonrisa, bien cuidada");
  deshacerMiWeb(pedido.id, "cliente");
  assert.equal(leerMiWeb(pedido.id)!.paginas["index.html"]!.fotos, undefined, "deshacer de nuevo quita la foto");
  // Asistente.
  assert.throws(() => guardarAsistente(pedido.id, { activo: true, preguntas: [] }, "cliente"), /al menos una pregunta/);
  e = guardarAsistente(pedido.id, { activo: true, preguntas: [{ pregunta: "¿Horario?", respuesta: "9 a 6" }], whatsapp: "099 222 0001" }, "cliente");
  assert.ok(asistenteVisible(e) && e.asistente.whatsapp === "593992220001");
  assert.match(paginaEnVivo(HTML, e, "index.html", "_a.js"), /<script src="_a.js" defer><\/script><\/body>/);
  activarMiWeb(pedido.id, "jay", "cuidado");
  assert.ok(!asistenteVisible(leerMiWeb(pedido.id)!), "con Cuidado el asistente no sale");
  // Versión nueva del equipo: el cambio de un texto que el equipo también cambió se avisa.
  activarMiWeb(pedido.id, "jay", "pro");
  guardarCambios(pedido.id, "index.html", { textos: { [titulo.clave]: "Otro título" } }, "cliente");
  guardarSitio(pedido.id, 2, { "index.html": HTML.replace("Sonrisa <em>sana</em> en Cuenca", "Odontología en Cuenca") });
  assert.equal(usarVersionNueva(pedido.id, "jay").sinEncajar, 1);
  assert.equal(leerMiWeb(pedido.id)!.base, 2);
});
