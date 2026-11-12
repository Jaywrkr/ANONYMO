// A prueba de fallos (sistema/78): cambios que no se pisan, mensajes claros de Google y la copia diaria.
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const { cambiarProspectos, leerProspectos } = await import("../src/prospectos/almacen-prospectos.ts");
const { errorPlaces } = await import("../src/prospectos/buscar-lugares.ts");
const { respaldar, ranuraRespaldo, leerEstado, anotarError, contarGoogle, diaCuenca } = await import("../src/estado-sistema.ts");
const { carpeta } = await import("../src/almacen.ts");

test("si alguien guarda en el medio, el cambio se repite sobre lo nuevo y no se pierde nada", async () => {
  await cambiarProspectos((l) => { l.firma = "inicial"; });
  const archivo = join(carpeta(), "_prospectos/lista/lista.json");
  let vueltas = 0;
  await cambiarProspectos((l) => {
    vueltas++;
    if (vueltas === 1) {
      // Otro clic guarda mientras este cambio se arma.
      const otro = JSON.parse(readFileSync(archivo, "utf8"));
      otro.numero = "099 555 0000";
      writeFileSync(archivo, JSON.stringify(otro));
    }
    l.firma = "Luna · ANONYMO";
  });
  const l = await leerProspectos();
  assert.equal(vueltas, 2, "se repitió una vez");
  assert.equal(l.firma, "Luna · ANONYMO", "el cambio propio quedó");
  assert.equal(l.numero, "099 555 0000", "y el del otro también");
});

test("Google dice en palabras simples qué pasó", () => {
  assert.match(errorPlaces(429, "Quota exceeded", "RESOURCE_EXHAUSTED"), /cupo de búsquedas de Google por hoy/);
  assert.match(errorPlaces(403, "API key not valid", "PERMISSION_DENIED"), /rechazó la clave/);
  assert.match(errorPlaces(403, "Billing account is disabled", "PERMISSION_DENIED"), /facturación/);
  assert.match(errorPlaces(500, "oops"), /no respondió bien \(500: oops\)/);
});

test("la copia diaria copia las listas a una de 14 ranuras y lo anota", async () => {
  const r = await respaldar(new Date("2026-11-12T08:00:00Z"));
  assert.match(r.ranura, /^dia-\d{2}$/);
  assert.equal(r.ranura, ranuraRespaldo(new Date("2026-11-12T08:00:00Z")));
  assert.notEqual(ranuraRespaldo(new Date("2026-11-12T12:00:00Z")), ranuraRespaldo(new Date("2026-11-13T12:00:00Z")), "cada día otra ranura");
  assert.equal(ranuraRespaldo(new Date("2026-11-12T12:00:00Z")), ranuraRespaldo(new Date("2026-11-26T12:00:00Z")), "y vuelve a la misma a las dos semanas");
  assert.ok(r.archivos >= 1 && r.faltaron.includes("guiones.json"));
  assert.ok(existsSync(join(carpeta(), `_respaldos/${r.ranura}/prospectos.json`)));
  assert.equal((await leerEstado()).respaldo?.ranura, r.ranura);
});

test("el estado guarda los errores recientes y cuenta Google por día", async () => {
  await anotarError("Prueba", "algo falló");
  await contarGoogle(6);
  await contarGoogle(1);
  const e = await leerEstado();
  assert.equal(e.errores[0].donde, "Prueba");
  assert.equal(e.google.dia, diaCuenca());
  assert.equal(e.google.consultas, 7);
});
