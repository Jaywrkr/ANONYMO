// Capturas del banco desde el estudio (sistema/61): qué se captura, pasos con candado y relevo, errores en palabras simples.
import "./preparar.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright";
import { cambiarEnlacesBanco, leerBanco, leerCambiosBanco, leerCapturas } from "../src/banco.ts";
import { capturasEnCurso, estadoCapturas, iniciarCapturas, motivoCaptura, pasoCapturas, planCaptura, ultimasCapturas } from "../src/capturas-banco.ts";

/** Navegador falso: setContent siempre funciona; goto falla con «Timeout» si la dirección dice «lento». */
const falso = (vistos: string[] = []): Browser => ({
  newContext: async () => ({
    newPage: async () => ({
      setContent: async () => { vistos.push("maqueta"); },
      goto: async (u: string) => { vistos.push(u); if (/lento|example/.test(u)) throw new Error("page.goto: Timeout 45000ms exceeded."); },
      waitForTimeout: async () => {},
      evaluate: async () => 1800,
      screenshot: async () => Buffer.from("imagen-" + Math.random()),
    }),
    close: async () => {},
  }),
  close: async () => {},
}) as unknown as Browser;

test("qué se captura de cada referencia", () => {
  const banco = leerBanco();
  assert.ok(banco.filter((r) => r.disciplina === "naming").every((r) => !planCaptura(r)), "naming es texto");
  assert.ok(banco.filter((r) => r.plantilla).every((r) => planCaptura(r) === "maqueta"));
  const web = banco.find((r) => r.disciplina === "web" && r.url && !r.plantilla)!;
  assert.equal(planCaptura(web), "sitio");
  const e = estadoCapturas("web");
  assert.equal(e.total, banco.filter((r) => r.disciplina === "web").length);
  assert.ok(e.posibles < e.total, "las webs reales sin dirección no se pueden capturar");
});

test("los pasos capturan, registran, suben cada imagen y siguen con relevo; los errores se dicen en simple", async () => {
  const subidas: string[][] = [];
  const c = iniciarCapturas({ disciplina: "identidad", quien: "luna" });
  assert.ok(c.pendientes.length > 20);
  assert.throws(() => iniciarCapturas({ disciplina: "identidad" }), /Ya se están sacando/);
  // Primer paso corto: no llega a todas (el margen por captura es de 70 s).
  const lento = (): Browser => { const n = falso(); const ctx = n.newContext; return { ...n, newContext: async (...x: unknown[]) => { await new Promise((r) => setTimeout(r, 150)); return (ctx as (...y: unknown[]) => Promise<unknown>)(...x); } } as unknown as Browser; };
  const a = await pasoCapturas({ plazo: Date.now() + 70_500, navegador: async () => lento(), alGuardar: async (x) => { subidas.push(x); } });
  assert.equal(a.terminado, false);
  assert.ok(a.paso);
  const viejo = await pasoCapturas({ plazo: Date.now() + 300_000, navegador: async () => falso(), despuesDe: "00000000-0000-0000-0000-000000000000" });
  assert.equal(viejo.viejo, true, "con otra identidad no toca nada");
  const b = await pasoCapturas({ plazo: Date.now() + 300_000, navegador: async () => falso(), despuesDe: a.paso, alGuardar: async (x) => { subidas.push(x); } });
  assert.equal(b.terminado, true);
  assert.equal(capturasEnCurso(), undefined);
  const u = ultimasCapturas()!;
  assert.equal(u.hechas.length, c.pendientes.length);
  assert.ok(u.hechas.filter((h) => h.ok).length >= 22, "las maquetas de logo se capturan");
  assert.ok(subidas.flat().some((x) => /-logo\.png$/.test(x)), "cada imagen se sube apenas se saca");
  const caps = leerCapturas();
  assert.ok(Object.keys(caps).some((k) => k.startsWith("identidad-")));
  assert.throws(() => iniciarCapturas({ disciplina: "identidad" }), /No falta ninguna/, "si ya están todas, lo dice");
  assert.equal(motivoCaptura(new Error("page.goto: Timeout 45000ms exceeded.")), "El sitio tardó demasiado en abrir.");
  assert.equal(motivoCaptura(new Error("net::ERR_NAME_NOT_RESOLVED")), "La dirección no existe o cambió.");
});

test("Jay y Luna cambian los enlaces de los que sale la captura", () => {
  const r = leerBanco().find((x) => x.disciplina === "contenido" && x.url && !x.plantilla)!;
  cambiarEnlacesBanco(r.id, "https://lento.example.com/caso", "https://imagenes.example.com/pieza.jpg", "jay", leerCambiosBanco().revision);
  const n = leerBanco().find((x) => x.id === r.id)!;
  assert.equal(n.imagen, "https://imagenes.example.com/pieza.jpg");
  assert.equal(planCaptura(n), "imagen", "con imagen de la pieza, se usa la imagen");
  assert.throws(() => cambiarEnlacesBanco(r.id, "ftp://x", "", "jay", leerCambiosBanco().revision), /https/);
});
