// Capturas del banco desde el estudio (sistema/61): las mismas del script, en pasos cortos encadenados.
// Solo para medir al juez: las imágenes van a _banco/capturas en el almacén privado, nunca al repo ni a clientes.
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "playwright";
import { carpeta } from "./almacen.ts";
import { contenidoArquetipo, logoArquetipo, webArquetipo } from "./arquetipos.ts";
import { DISCIPLINAS_BANCO, leerBanco, leerCapturas, registrarCaptura, type DisciplinaBanco, type Referencia } from "./banco.ts";
import { ocultarClaves } from "./ia.ts";

export type QueCaptura = "maqueta" | "sitio" | "imagen" | "caso";
/** Qué se puede capturar de una referencia. Naming es texto: nada. */
export function planCaptura(r: Referencia): QueCaptura | undefined {
  if (r.disciplina === "naming") return undefined;
  if (r.plantilla) return "maqueta";
  if (r.disciplina === "web") return r.url ? "sitio" : undefined;
  if (r.imagen) return "imagen";
  return r.url ? "caso" : undefined;
}
export const capturables = (d?: DisciplinaBanco) => leerBanco().filter((r) => (!d || r.disciplina === d) && planCaptura(r));
/** Cuántas tienen captura y cuántas se podrían capturar, por disciplina. */
export function estadoCapturas(d: DisciplinaBanco) {
  const caps = leerCapturas();
  const todas = leerBanco().filter((r) => r.disciplina === d);
  const posibles = todas.filter((r) => planCaptura(r));
  return { total: todas.length, posibles: posibles.length, con: posibles.filter((r) => caps[r.id]?.length).length, sinFuente: todas.length - posibles.length };
}

export interface ResultadoCaptura { ref: string; nombre: string; ok: boolean; error?: string; archivos?: string[] }
export interface CapturasEnCurso { id: string; disciplinas: DisciplinaBanco[]; pendientes: string[]; hechas: ResultadoCaptura[]; inicio: string; pulso: string; quien: string; ocupadoHasta?: string; paso?: string }
const dir = () => join(carpeta(), "_agencia", "capturas");
const rutaEnCurso = () => join(dir(), "en-curso.json");
const escribir = (ruta: string, datos: unknown) => { mkdirSync(join(ruta, ".."), { recursive: true }); const t = ruta + "." + randomUUID() + ".tmp"; writeFileSync(t, JSON.stringify(datos, null, 1)); renameSync(t, ruta); };
export function capturasEnCurso(): CapturasEnCurso | undefined { try { return existsSync(rutaEnCurso()) ? JSON.parse(readFileSync(rutaEnCurso(), "utf8")) : undefined; } catch { return undefined; } }
export const capturasVivas = (c = capturasEnCurso()) => !!c && Date.now() - Date.parse(c.pulso) < 150_000;
export function ultimasCapturas(): (CapturasEnCurso & { fin: string }) | undefined { try { const r = join(dir(), "ultima.json"); return existsSync(r) ? JSON.parse(readFileSync(r, "utf8")) : undefined; } catch { return undefined; } }

export function iniciarCapturas(o: { disciplina?: DisciplinaBanco; todas?: boolean; quien?: string } = {}): CapturasEnCurso {
  const viva = capturasEnCurso();
  if (viva && capturasVivas(viva)) throw new Error("Ya se están sacando capturas. Espera a que termine.");
  const disciplinas = o.disciplina ? [o.disciplina] : DISCIPLINAS_BANCO.filter((d) => d !== "naming");
  const ya = leerCapturas();
  const pendientes = capturables().filter((r) => disciplinas.includes(r.disciplina) && (o.todas || !ya[r.id]?.length)).map((r) => r.id);
  if (!pendientes.length) throw new Error("No falta ninguna captura en esta disciplina. Para sacarlas de nuevo, usa «Volver a sacar todas».");
  const c: CapturasEnCurso = { id: new Date().toISOString().replace(/[:.]/g, "-"), disciplinas, pendientes, hechas: [], inicio: new Date().toISOString(), pulso: new Date().toISOString(), quien: o.quien === "luna" ? "luna" : "jay" };
  escribir(rutaEnCurso(), c);
  return c;
}

/** Saca la captura de una referencia y la registra. Devuelve los archivos guardados en _banco/capturas. */
export async function capturarReferencia(nav: Browser, r: Referencia, o: { esperaMs?: number; timeoutMs?: number } = {}): Promise<string[]> {
  const que = planCaptura(r);
  if (!que) throw new Error("No tiene sitio, imagen ni página del caso para capturar.");
  const d = join(carpeta(), "_banco", "capturas");
  mkdirSync(d, { recursive: true });
  const archivos: string[] = [];
  const guardar = (archivo: string, ancho: number | undefined, tipo: "image/jpeg" | "image/png", b: Buffer) => {
    writeFileSync(join(d, archivo), b);
    registrarCaptura(r.id, { archivo, ancho, tipo, sha256: createHash("sha256").update(b).digest("hex"), fecha: new Date().toISOString() });
    archivos.push(archivo);
  };
  const pagina = async (ancho: number, html?: string) => {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: ancho > 1000 ? 900 : 844 }, isMobile: ancho < 1000, deviceScaleFactor: 1, locale: "es-EC" });
    const p = await ctx.newPage();
    try {
      if (html) await p.setContent(html, { waitUntil: "load" });
      else await p.goto(r.url!, { waitUntil: "load", timeout: o.timeoutMs ?? 45_000 });
      await p.waitForTimeout(html ? 200 : (o.esperaMs ?? 4000)); // las webs premiadas suelen tener una entrada animada
      const alto = Math.min(await p.evaluate(() => document.documentElement.scrollHeight), ancho > 1000 ? 2400 : 1700);
      guardar(`${r.id}-${ancho}.jpg`, ancho, "image/jpeg", await p.screenshot({ type: "jpeg", quality: 70, fullPage: true, clip: { x: 0, y: 0, width: ancho, height: Math.max(alto, 600) } }));
    } finally { await ctx.close(); }
  };
  const imagen = async () => {
    const ctx = await nav.newContext({ viewport: { width: 800, height: 800 } });
    const p = await ctx.newPage();
    try {
      if (r.plantilla) await p.setContent(`<body style="margin:0">${logoArquetipo(r.plantilla, r.rubro)}</body>`);
      else {
        const resp = await fetch(r.imagen!, { headers: { "user-agent": "Mozilla/5.0 (banco de calibración)" }, signal: AbortSignal.timeout(o.timeoutMs ?? 30_000) });
        if (!resp.ok) throw new Error(`la imagen respondió ${resp.status}`);
        const tipo = resp.headers.get("content-type") ?? "";
        if (!/^image\//.test(tipo)) throw new Error("el enlace no es una imagen");
        const src = `data:${tipo.includes("svg") ? "image/svg+xml" : tipo};base64,${Buffer.from(await resp.arrayBuffer()).toString("base64")}`;
        await p.setContent(`<body style="margin:0;display:grid;place-items:center;width:800px;height:800px;background:#fff"><img src="${src}" style="max-width:640px;max-height:640px"></body>`);
      }
      // En redes la imagen es una pieza; en identidad, el logo.
      guardar(`${r.id}-${r.disciplina === "contenido" ? "pieza" : "logo"}.png`, undefined, "image/png", await p.screenshot({ type: "png" }));
    } finally { await ctx.close(); }
  };
  if (que === "maqueta") {
    if (r.disciplina === "identidad") await imagen();
    else { const h = r.disciplina === "web" ? webArquetipo(r.plantilla!, r.rubro) : contenidoArquetipo(r.plantilla!, r.rubro); await pagina(1440, h); await pagina(390, h); }
  } else if (que === "imagen") await imagen();
  else if (que === "sitio") { await pagina(1440); await pagina(390); }
  else await pagina(1440).then(() => (r.disciplina === "contenido" ? pagina(390) : undefined)); // página del caso
  return archivos;
}

/** En palabras simples, por qué no se pudo capturar. */
export function motivoCaptura(e: unknown): string {
  const m = ocultarClaves(String((e as Error)?.message ?? e)).split("\n")[0];
  if (/Timeout|timeout/.test(m)) return "El sitio tardó demasiado en abrir.";
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/.test(m)) return "La dirección no existe o cambió.";
  if (/ERR_CONNECTION|ECONNREFUSED|ERR_TUNNEL|403|blocked/i.test(m)) return "El sitio no dejó entrar al navegador automático.";
  return m.slice(0, 200);
}

/**
 * Un paso: captura referencias pendientes hasta el plazo. Mismo candado y relevo que la calibración (sistema/59):
 * si otro paso trabaja, o si llegó una copia más vieja que la que dejó el paso anterior, no toca nada.
 */
export async function pasoCapturas(o: { plazo: number; navegador: () => Promise<Browser>; alGuardar?: (archivos: string[]) => Promise<void>; despuesDe?: string; esperaMs?: number; timeoutMs?: number }): Promise<{ terminado: boolean; ocupado?: boolean; viejo?: boolean; paso?: string; hechas: number; total: number }> {
  const c = capturasEnCurso();
  if (!c) return { terminado: true, hechas: 0, total: 0 };
  const total = c.hechas.length + c.pendientes.length;
  if (o.despuesDe && c.paso !== o.despuesDe) return { terminado: false, viejo: true, hechas: c.hechas.length, total };
  if (c.ocupadoHasta && Date.parse(c.ocupadoHasta) > Date.now() && capturasVivas(c)) return { terminado: false, ocupado: true, hechas: c.hechas.length, total };
  const paso = randomUUID();
  const guardarEstado = async (archivos: string[] = []) => { c.pulso = new Date().toISOString(); escribir(rutaEnCurso(), c); await o.alGuardar?.(archivos).catch(() => {}); };
  c.ocupadoHasta = new Date(o.plazo).toISOString(); c.paso = paso;
  await guardarEstado();
  const porId = new Map(leerBanco().map((r) => [r.id, r]));
  let nav: Browser | undefined;
  try {
    // Una captura puede tardar ~1 minuto (dos tamaños, sitios lentos): no se empieza otra sin ese margen.
    while (c.pendientes.length && Date.now() < o.plazo - 70_000) {
      const id = c.pendientes[0];
      const r = porId.get(id);
      let res: ResultadoCaptura;
      if (!r) res = { ref: id, nombre: id, ok: false, error: "La referencia ya no está en el banco." };
      else {
        try { nav ??= await o.navegador(); res = { ref: id, nombre: r.nombre, ok: true, archivos: await capturarReferencia(nav, r, o) }; }
        catch (e) { res = { ref: id, nombre: r.nombre, ok: false, error: motivoCaptura(e) }; }
      }
      c.pendientes.shift(); c.hechas.push(res);
      await guardarEstado(res.archivos ?? []);
    }
  } finally { await nav?.close().catch(() => {}); }
  delete c.ocupadoHasta;
  if (c.pendientes.length) { await guardarEstado(); return { terminado: false, paso, hechas: c.hechas.length, total }; }
  escribir(join(dir(), "ultima.json"), { ...c, fin: new Date().toISOString() });
  rmSync(rutaEnCurso(), { force: true });
  await o.alGuardar?.([]).catch(() => {});
  return { terminado: true, paso, hechas: c.hechas.length, total };
}

/** El mismo navegador que usa la revisión de calidad: en Vercel, el Chromium del servidor; en tu máquina, CHROMIUM o el de Playwright. */
export async function navegadorCapturas(): Promise<Browser> {
  const { navegadorCalidad } = await import("./inspeccionar.ts");
  return navegadorCalidad();
}
