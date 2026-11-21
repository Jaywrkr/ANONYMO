import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { esRobot, leerVisitas, mesAnterior, nombreDelMes, origenDe, paginaEnVivo, registrarVisita, resumenVisitas, textoInforme, type EstadoMiWeb } from "../src/index.ts";

test("de dónde llegan y quién es robot", () => {
  assert.equal(origenDe("https://www.google.com/"), "google");
  assert.equal(origenDe("https://l.instagram.com/?u=x"), "instagram");
  assert.equal(origenDe("https://m.facebook.com/"), "facebook");
  assert.equal(origenDe(""), "directo");
  assert.equal(origenDe("https://anonymo.app/w/x/index.html", "anonymo.app"), "directo", "moverse dentro de la web no es otro origen");
  assert.equal(origenDe("https://otra.com/"), "otro");
  assert.equal(origenDe("no es una dirección"), "otro");
  assert.ok(esRobot("Googlebot/2.1") && esRobot("Mozilla/5.0 HeadlessChrome/120") && esRobot(null) && esRobot("WhatsApp/2.23"));
  assert.ok(!esRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"));
});

test("cuenta por día, compara con el mes anterior y arma el texto para el cliente", async () => {
  const id = "visitas-prueba";
  const nov = (d: number) => new Date(`2026-11-${String(d).padStart(2, "0")}T15:00:00Z`);
  await registrarVisita(id, { evento: "visita", pagina: "index.html", origen: "google" }, new Date("2026-10-10T15:00:00Z"));
  await registrarVisita(id, { evento: "visita", pagina: "index.html", origen: "google" }, nov(3));
  await registrarVisita(id, { evento: "visita", pagina: "servicios.html", origen: "instagram" }, nov(3));
  await registrarVisita(id, { evento: "whatsapp" }, nov(3));
  await registrarVisita(id, { evento: "visita", pagina: "../malo", origen: "google" }, nov(20));
  await Promise.all([1, 2, 3].map(() => registrarVisita(id, { evento: "visita", pagina: "index.html" }, nov(21))));
  const m = await leerVisitas(id, "2026-11");
  assert.equal(m.dias["2026-11-21"]!.visita, 3, "tres a la vez no se pisan");
  assert.equal(m.paginas["../malo"], undefined);
  const r = resumenVisitas(m, await leerVisitas(id, mesAnterior("2026-11")));
  assert.deepEqual([r.visita, r.whatsapp, r.contactos, r.conversion, r.mejorDia], [6, 1, 1, 16.7, "2026-11-21"]);
  assert.deepEqual(r.origen.slice(0, 2), [["directo", 3], ["google", 2]], "sin dirección anterior cuenta como directo");
  const t = textoInforme("Consultorio Luz", "2026-11", r);
  assert.match(t, /^Tu web en noviembre 2026 · Consultorio Luz/);
  assert.match(t, /Visitas: 6 \(500 % más que el mes anterior\)/);
  assert.match(t, /De cada 100 visitas, 16.7 te contactaron\./);
  assert.equal(nombreDelMes("2027-01"), "enero 2027");
  assert.equal(mesAnterior("2027-01"), "2026-12");
  assert.equal((await leerVisitas("../x", "2026-11")).actualizado, "", "un id raro no lee nada");
});

test("la página en vivo lleva lo que mide, una sola vez, antes del último </body>", () => {
  const e = { activa: true, plan: "cuidado", paginas: {}, asistente: { activo: false, preguntas: [] } } as unknown as EstadoMiWeb;
  const h = paginaEnVivo("<html><body><p>Hola</p><script>var a='</body>'</script></body></html>", e, "index.html", "/a.js", "/w/x/_registro");
  assert.equal(h.match(/_registro/g)?.length, 1);
  assert.match(h, /mwMedir[\s\S]*<\/script><\/body><\/html>$/);
  assert.ok(!paginaEnVivo("<p>x</p>", e, "index.html", "/a.js").includes("_registro"), "sin registro no mide");
});

test("preguntas sin respuesta y asistente con IA: plan, tope y ritmo", async () => {
  const { anotarSinRespuesta, leerVisitas, limpiarPregunta, responderConIA, cambiarMes, TOPE_IA_MES } = await import("../src/index.ts");
  assert.equal(limpiarPregunta("  mi número es 099 222 0001,   llámenme "), "mi número es …, llámenme");
  const ahora = new Date("2026-11-21T15:00:00Z");
  await anotarSinRespuesta("sin-resp", "¿Hacen envíos?", false, ahora);
  await anotarSinRespuesta("sin-resp", "¿hacen envíos?", false, ahora);
  await anotarSinRespuesta("sin-resp", "x", false, ahora);
  assert.deepEqual((await leerVisitas("sin-resp", "2026-11")).sinRespuesta, [{ q: "¿Hacen envíos?", dia: "2026-11-21" }]);
  const e = { activa: true, plan: "autonomo", negocio: "Luz", paginas: {}, asistente: { activo: true, preguntas: [{ pregunta: "¿Horario?", respuesta: "9 a 6" }] } } as never;
  assert.deepEqual(await responderConIA("ia-prueba", e, "¿hacen envíos?", "", ahora), { sin: "plan" });
  const pro = { ...(e as object), plan: "pro" } as never;
  assert.deepEqual(await responderConIA("ia-prueba", pro, "¿hacen envíos?", "", ahora), { sin: "ia" }, "sin clave de IA no responde, pero no rompe");
  assert.equal((await leerVisitas("ia-prueba", "2026-11")).ia, 1, "cuenta para el tope");
  await cambiarMes("ia-prueba", ahora, (m) => ({ ...m, ia: TOPE_IA_MES }));
  assert.deepEqual(await responderConIA("ia-prueba", pro, "¿hacen envíos?", "", ahora), { sin: "tope" });
  const otra = new Date("2026-12-02T15:00:00Z");
  const r = await Promise.all(Array.from({ length: 10 }, () => responderConIA("ia-ritmo", pro, "¿hacen envíos?", "", otra)));
  assert.equal(r.filter((x) => "sin" in x && x.sin === "rapido").length, 2, "más de 8 por minuto, espera");
});
