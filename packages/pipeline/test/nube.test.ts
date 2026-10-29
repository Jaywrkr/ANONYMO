// El estudio en línea (sistema/21): bajar y subir proyectos contra una nube falsa en memoria.
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "clave-falsa";
const { carpeta } = await import("../src/almacen.ts");
const { bajarProyecto, espejarProyecto, subirRuta, nubeActiva } = await import("../src/nube.ts");
const { registrar } = await import("../src/analitica.ts");

/** Imita la API de Supabase Storage con un mapa ruta → contenido. */
function nubeFalsa() {
  const datos = new Map<string, Uint8Array>();
  const f = (async (u: string | URL, init: RequestInit = {}) => {
    const url = String(u);
    const metodo = init.method ?? "GET";
    const m = url.match(/\/storage\/v1\/object\/(list\/)?proyectos\/?(.*)$/)!;
    if (m[1]) {
      const { prefix } = JSON.parse(String(init.body));
      const hijos = new Map<string, boolean>();
      for (const k of datos.keys()) {
        if (prefix && !k.startsWith(prefix + "/")) continue;
        const resto = prefix ? k.slice(prefix.length + 1) : k;
        const [cabeza, ...cola] = resto.split("/");
        hijos.set(cabeza, cola.length > 0 || (hijos.get(cabeza) ?? false));
      }
      return Response.json([...hijos].map(([name, carpeta]) => ({ name, id: carpeta ? null : name })));
    }
    if (metodo === "DELETE") {
      for (const p of JSON.parse(String(init.body)).prefixes) datos.delete(p);
      return Response.json([]);
    }
    if (metodo === "POST") {
      datos.set(m[2], init.body as Uint8Array);
      return Response.json({});
    }
    const d = datos.get(m[2]);
    return d ? new Response(d as unknown as BodyInit) : new Response("no", { status: 404 });
  }) as typeof fetch;
  return { datos, f };
}

test("la nube solo se activa en Vercel o con ANONYMO_NUBE=1", () => {
  delete process.env.VERCEL;
  delete process.env.ANONYMO_NUBE;
  assert.equal(nubeActiva(), false);
  process.env.ANONYMO_NUBE = "1";
  assert.equal(nubeActiva(), true);
  delete process.env.ANONYMO_NUBE;
});

test("espejar sube el proyecto y borra en la nube lo que ya no existe en local", async () => {
  const { datos, f } = nubeFalsa();
  const base = join(carpeta(), "_solicitudes");
  mkdirSync(join(base, "archivo"), { recursive: true });
  writeFileSync(join(base, "a.json"), "{}");
  await espejarProyecto("_solicitudes", f);
  assert.ok(datos.has("_solicitudes/a.json"));
  renameSync(join(base, "a.json"), join(base, "archivo", "a.json"));
  const r = await espejarProyecto("_solicitudes", f);
  assert.equal(r.borrados, 1);
  assert.ok(!datos.has("_solicitudes/a.json") && datos.has("_solicitudes/archivo/a.json"));
});

test("sin copia local, espejar no borra nada en la nube", async () => {
  const { datos, f } = nubeFalsa();
  datos.set("otro/estado.json", new TextEncoder().encode("{}"));
  assert.deepEqual(await espejarProyecto("otro", f), { subidos: 0, borrados: 0 });
  assert.ok(datos.has("otro/estado.json"));
});

test("bajar en espejo deja la copia local idéntica a la nube", async () => {
  const { datos, f } = nubeFalsa();
  datos.set("clinica/estado.json", new TextEncoder().encode('{"v":2}'));
  mkdirSync(join(carpeta(), "clinica"), { recursive: true });
  writeFileSync(join(carpeta(), "clinica", "viejo.md"), "x");
  await bajarProyecto("clinica", f, true);
  assert.equal(readFileSync(join(carpeta(), "clinica", "estado.json"), "utf8"), '{"v":2}');
  assert.ok(!existsSync(join(carpeta(), "clinica", "viejo.md")));
});

test("un nombre de proyecto con ../ se rechaza antes de tocar el disco", async () => {
  const { f } = nubeFalsa();
  await assert.rejects(bajarProyecto("../etc", f, true), /no válido/);
  await assert.rejects(espejarProyecto("a/b", f), /no válido/);
});

test("en la nube cada evento de analítica va en su propio archivo y sube solo", async () => {
  const { datos, f } = nubeFalsa();
  const a = registrar({ e: "vista", ruta: "/" }, true)!;
  const b = registrar({ e: "vista", ruta: "/sala" }, true)!;
  assert.notEqual(a, b);
  await subirRuta(a, f);
  assert.ok(datos.has(a));
});

test("subir por contenido: un proyecto recién creado sube aunque la hora del disco no avance (sistema/43)", async () => {
  const { huellaProyecto, subirDistintos } = await import("../src/nube.ts");
  const { utimesSync } = await import("node:fs");
  const n = nubeFalsa();
  const id = "rapido";
  const antes = huellaProyecto(id); // no existe todavía
  mkdirSync(join(carpeta(), id, "entregas"), { recursive: true });
  writeFileSync(join(carpeta(), id, "estado.json"), "{}");
  writeFileSync(join(carpeta(), id, "entregas", "1-atlas.md"), "# plan");
  // Hora del disco vieja (como en Vercel, donde no es fina): igual se suben.
  const viejo = new Date(Date.now() - 60_000);
  utimesSync(join(carpeta(), id, "estado.json"), viejo, viejo);
  const r = await subirDistintos(id, antes, true, n.f);
  assert.equal(r.subidos, 2);
  // Sin cambios: no sube nada; si se borra un archivo, se borra en la nube.
  const h = huellaProyecto(id);
  assert.equal((await subirDistintos(id, h, true, n.f)).subidos, 0);
  (await import("node:fs")).rmSync(join(carpeta(), id, "entregas", "1-atlas.md"));
  assert.equal((await subirDistintos(id, h, true, n.f)).borrados, 1);
});
