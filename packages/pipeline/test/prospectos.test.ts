import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
const { puntuar, mensajeInicial, numeroInternacional, esCelular, enlaceWhatsapp, pedidoDesdeProspecto } = await import("../src/prospectos/puntaje.ts");
const { leerHtml, revisarWeb } = await import("../src/prospectos/revisar-web.ts");
const { buscarLugares } = await import("../src/prospectos/buscar-lugares.ts");
const { leerProspectos, cambiarProspectos, sumarLugares, porRevisar, aplicarCambio } = await import("../src/prospectos/almacen-prospectos.ts");

type P = Parameters<typeof puntuar>[0];
const hoy = new Date("2026-11-11T12:00:00Z");
const base = (x: Partial<P> = {}): P => ({ id: "x1", nombre: "Dental Sonrisa", direccion: "Cuenca", ciudad: "Cuenca", rubro: "odontólogo", estrellas: 4.8, resenas: 120, estado: "nuevo", agregado: "", actualizado: "", ...x });
const ok = (x = {}) => ({ estado: "ok" as const, https: true, celular: true, titulo: "Sonrisa", ms: 800, ...x });

test("sin web y con buena fama queda arriba; la fama no cuenta como problema de la web", () => {
  const a = puntuar(base(), hoy);
  assert.equal(a.puntaje, 90);
  assert.deepEqual(a.motivos, ["Sin web"]);
  assert.equal(a.buenaFama, true);
  const b = puntuar(base({ web: "https://x.ec", revision: ok() }), hoy);
  assert.deepEqual(b.motivos, []);
  assert.equal(b.puntaje, 35);
});

test("una web propia suma por cada problema y nunca pasa de 100", () => {
  const r = puntuar(base({ estrellas: 4, resenas: 8, web: "x.ec", revision: ok({ https: false, celular: false, anio: 2019, ms: 5000 }) }), hoy);
  assert.equal(r.puntaje, 85);
  assert.deepEqual(r.motivos, ["No se ve bien en celular", "Sin candado (https)", "Sin actualizar desde 2019", "Carga lenta"]);
  assert.equal(puntuar(base({ web: "x", revision: { estado: "rota", motivo: "La web no abre" } }), hoy).puntaje, 100);
  assert.equal(puntuar(base({ web: "x" }), hoy).puntaje, 20, "sin revisar todavía: solo la fama");
  assert.equal(puntuar(base({ estrellas: 3, resenas: 4 }), hoy).puntaje, 60);
});

test("el mensaje nombra lo que falla y firma la casa", () => {
  const m = mensajeInicial(base({ web: "instagram.com/x", revision: { estado: "social", red: "Instagram" } }), "Jay · ANONYMO", hoy);
  assert.match(m, /Dental Sonrisa/);
  assert.match(m, /4\.8 estrellas con 120 reseñas/);
  assert.match(m, /lleva a Instagram/);
  assert.ok(m.endsWith("Jay · ANONYMO"));
  assert.match(mensajeInicial(base({ web: "x", revision: ok() }), "J", hoy), /más pacientes/);
  assert.match(mensajeInicial(base({ rubro: "abogado", web: "x", revision: ok() }), "J", hoy), /más clientes/);
  assert.match(mensajeInicial(base({ web: "x", revision: ok({ anio: 2020 }) }), "J", hoy), /desde 2020/);
});

test("teléfonos de Ecuador: celular con WhatsApp, fijo aparte", () => {
  assert.equal(numeroInternacional("099 123 4567"), "593991234567");
  assert.equal(numeroInternacional("+593 98 765 4321"), "593987654321");
  assert.equal(numeroInternacional("07-282-1234"), "59372821234");
  assert.equal(numeroInternacional("123"), undefined);
  assert.equal(esCelular("099 123 4567"), true);
  assert.equal(esCelular("07-282-1234"), false);
  assert.equal(enlaceWhatsapp("0991234567", "hola qué tal"), "https://wa.me/593991234567?text=hola%20qu%C3%A9%20tal");
  assert.equal(enlaceWhatsapp(undefined, "x"), undefined);
});

test("el pedido para Atlas lleva el negocio, su fama y lo que falla", () => {
  const t = pedidoDesdeProspecto(base({ web: "x.ec", revision: ok({ celular: false }), notas: "Quiere agendar en línea" }), hoy);
  assert.match(t, /Una web para Dental Sonrisa, odontólogo en Cuenca \(4\.8 estrellas con 120 reseñas/);
  assert.match(t, /no se ve bien en celular/);
  assert.match(t, /Quiere agendar en línea/);
});

test("lee el HTML: celular, título, con qué está hecha y el año", () => {
  const html = `<html><head><title> Clínica X </title><meta name="generator" content="Joomla! - Open Source"></head><body>${"x".repeat(400)}<footer>© 2018 - 2021 Clínica</footer></body></html>`;
  const r = leerHtml(html, "http://x.ec", 1200, hoy);
  assert.deepEqual(r, { estado: "ok", https: false, celular: false, titulo: "Clínica X", hechaCon: "Joomla!", anio: 2021, ms: 1200 });
  const wix = leerHtml(`<meta name="viewport" content="width=device-width"><script src="https://static.wixstatic.com/a.js"></script>${"x".repeat(400)}`, "https://x.ec", 300, hoy);
  assert.equal(wix.estado === "ok" && wix.hechaCon, "Wix");
  assert.equal(wix.estado === "ok" && wix.celular, true);
  assert.deepEqual(leerHtml("<html>This domain is for sale</html>" + "x".repeat(400), "https://x.ec", 1, hoy), { estado: "rota", motivo: "Dominio vacío o suspendido" });
});

test("revisa la web con una red falsa: redes, errores, redirecciones y sin respuesta", async () => {
  const falsa = (async (url: string) => {
    if (url.includes("cae")) throw new TypeError("fetch failed");
    if (url.includes("error")) return new Response("no", { status: 500 });
    if (url.includes("salta")) return Object.defineProperty(new Response("x"), "url", { value: "https://www.facebook.com/clinica" });
    return Object.defineProperty(new Response(`<meta name="viewport"><title>T</title>${"x".repeat(400)}`), "url", { value: "https://bien.ec/" });
  }) as typeof fetch;
  assert.deepEqual(await revisarWeb("https://instagram.com/x", falsa), { estado: "social", red: "Instagram" });
  assert.deepEqual(await revisarWeb("https://clinica.business.site", falsa), { estado: "rota", motivo: "Su página de Google ya no existe" });
  assert.deepEqual(await revisarWeb("cae.ec", falsa), { estado: "rota", motivo: "La web no abre" });
  assert.deepEqual(await revisarWeb("https://error.ec", falsa), { estado: "rota", motivo: "La web da error (500)" });
  assert.deepEqual(await revisarWeb("https://salta.ec", falsa), { estado: "social", red: "Facebook" });
  const b = await revisarWeb("bien.ec", falsa);
  assert.equal(b.estado, "ok");
  assert.equal(b.estado === "ok" && b.https && b.celular && b.titulo, "T");
});

test("busca en un Google falso: pide los campos, pagina y salta los cerrados", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "clave-falsa";
  const pedidos: { cuerpo: Record<string, unknown>; cabeceras: Record<string, string> }[] = [];
  const google = (async (_u: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body));
    pedidos.push({ cuerpo, cabeceras: init.headers as Record<string, string> });
    const pag = cuerpo.pageToken ? 2 : 1;
    return Response.json({
      places: [
        { id: `a${pag}`, displayName: { text: `Clínica ${pag}` }, rating: 4.7, userRatingCount: 30, nationalPhoneNumber: "099 111 2222" },
        { id: `c${pag}`, displayName: { text: "Cerrada" }, businessStatus: "CLOSED_PERMANENTLY" },
      ],
      nextPageToken: pag === 1 ? "sig" : undefined,
    });
  }) as unknown as typeof fetch;
  const l = await buscarLugares("odontólogo", "Cuenca", 3, google);
  assert.deepEqual(l.map((x) => x.id), ["a1", "a2"]);
  assert.equal(pedidos.length, 2);
  assert.equal(pedidos[0].cuerpo.textQuery, "odontólogo en Cuenca, Ecuador");
  assert.equal(pedidos[0].cabeceras["x-goog-api-key"], "clave-falsa");
  assert.match(pedidos[0].cabeceras["x-goog-fieldmask"], /places\.websiteUri/);
  assert.equal(l[0].telefono, "099 111 2222");
  delete process.env.GOOGLE_PLACES_API_KEY;
  await assert.rejects(() => buscarLugares("spa", "Cuenca", 1, google), /GOOGLE_PLACES_API_KEY/);
});

test("la lista se guarda, no duplica, respeta el seguimiento y vuelve a revisar si cambió la web", async () => {
  assert.deepEqual((await leerProspectos()).prospectos, {});
  const lugares = [{ id: "a", nombre: "A", direccion: "d", resenas: 3, web: "https://a.ec" }, { id: "b", nombre: "B", direccion: "d", resenas: 0 }];
  const { valor } = await cambiarProspectos((l) => sumarLugares(l, lugares, "spa", "Cuenca", "jay"));
  assert.equal(valor, 2);
  await cambiarProspectos((l) => {
    l.prospectos.a.revision = { estado: "rota", motivo: "x" };
    aplicarCambio(l.prospectos.a, { estado: "contactado", notas: "Llamar el lunes", mensaje: "Hola" }, "luna");
  });
  const { lista, valor: otraVez } = await cambiarProspectos((l) => sumarLugares(l, [{ ...lugares[0], resenas: 9, web: "https://a-nueva.ec" }], "spa", "Cuenca", "jay"));
  assert.equal(otraVez, 0);
  const a = (await leerProspectos()).prospectos.a;
  assert.equal(a.estado, "contactado");
  assert.equal(a.notas, "Llamar el lunes");
  assert.equal(a.mensaje, "Hola");
  assert.equal(a.por, "luna");
  assert.equal(a.resenas, 9);
  assert.equal(a.revision, undefined, "cambió la web: hay que revisarla de nuevo");
  assert.deepEqual(porRevisar(lista).map((x) => x.id), ["a"]);
  await cambiarProspectos((l) => aplicarCambio(l.prospectos.a, { mensaje: null }, "jay"));
  assert.equal((await leerProspectos()).prospectos.a.mensaje, undefined);
});
