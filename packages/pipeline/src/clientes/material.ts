// El material real de cada cliente (sistema/118): capturas de las webs que están en su Dirección (las referencias de
// «qué es bueno» y su propio trabajo). Así la vara deja de ser un enlace: los agentes ven las imágenes, Faro las usa
// en las piezas que muestran trabajo y Jay y Luna las ven en la ficha. Vale para todos los clientes.
import type { Browser } from "playwright";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { direccionPermitida } from "./fuentes.ts";
import type { DireccionCliente, ReferenciaDir } from "./direccion.ts";

/** Una captura guardada: el archivo y qué muestra. */
export interface CapturaMaterial { archivo: string; ancho: number; alto: number;
  /**
   * «escritorio» y «celular»: lo que se ve al entrar (para la ficha y la vara). Desde sistema/122, el material para
   * publicar: «pagina» (un tramo de la web al tamaño exacto de un post, 1080×1350), «vertical» (1080×1920, para reel e
   * historia), «video» (la web bajando sola, MP4 vertical) y «logo» (su logo, sin fondo).
   */
  vista: "escritorio" | "celular" | "pagina" | "vertical" | "video" | "logo";
  /** Los colores propios de esa web (sistema/122): el fondo y la tinta de lo primero que se ve. El post de su trabajo va con
   * sus colores, nunca con los del estudio. */
  fondo?: string; tinta?: string }

export const ARCHIVO_MATERIAL = /^[a-z0-9][a-z0-9-]{2,80}\.(jpg|png|mp4)$/;
export const tipoMaterial = (archivo: string) => (archivo.endsWith(".mp4") ? "video/mp4" : archivo.endsWith(".png") ? "image/png" : "image/jpeg");
const rel = (archivo: string) => `_clientes/material/${archivo}`;

/** El nombre no se adivina (lleva un resumen del cliente y la dirección): por eso se puede servir sin sesión. */
export const nombreCaptura = (cliente: string, url: string, vista: CapturaMaterial["vista"]) =>
  `${cliente.slice(0, 40)}-${createHash("sha256").update(`${cliente}|${url}|${process.env.ESTUDIO_SECRETO ?? "unmake"}`).digest("hex").slice(0, 16)}-${vista === "escritorio" ? "1440" : "390"}.jpg`;

export async function guardarMaterial(archivo: string, datos: Uint8Array) {
  if (!ARCHIVO_MATERIAL.test(archivo)) throw new Error("Nombre de archivo no válido.");
  if (nubeActiva()) return subirSuelto(rel(archivo), datos, tipoMaterial(archivo));
  mkdirSync(join(carpeta(), "_clientes", "material"), { recursive: true });
  writeFileSync(join(carpeta(), rel(archivo)), datos);
}
export async function leerMaterial(archivo: string): Promise<Uint8Array | undefined> {
  if (!ARCHIVO_MATERIAL.test(archivo)) return undefined;
  if (nubeActiva()) return leerSuelto(rel(archivo));
  const r = join(carpeta(), rel(archivo));
  return existsSync(r) ? readFileSync(r) : undefined;
}

/**
 * Captura una web en computadora (1440) y en celular (390): lo que se ve al entrar y un poco más.
 * Un solo contexto y una sola página que cambia de ancho: el Chromium del servidor (Vercel) corre en un solo
 * proceso y se cae si se abren varios contextos seguidos (sistema/119).
 */
export async function capturarWeb(nav: Browser, cliente: string, url: string, o: { esperaMs?: number; timeoutMs?: number; plazo?: number } = {}): Promise<CapturaMaterial[]> {
  if (!direccionPermitida(url)) throw new Error("Esa dirección no se puede abrir.");
  const out: CapturaMaterial[] = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "es-EC" });
  try {
    const p = await ctx.newPage();
    let colores0: { fondo: string; tinta: string } | undefined;
    for (const [vista, ancho, alto] of [["escritorio", 1440, 900], ["celular", 390, 844]] as const) {
      await p.setViewportSize({ width: ancho, height: alto });
      if (vista === "escritorio") await p.goto(url, { waitUntil: "domcontentloaded", timeout: o.timeoutMs ?? 40_000 });
      else await p.reload({ waitUntil: "domcontentloaded", timeout: o.timeoutMs ?? 40_000 });
      await p.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
      await p.waitForTimeout(o.esperaMs ?? 3500); // las webs con entrada animada
      const total = await p.evaluate(() => document.documentElement.scrollHeight).catch(() => alto);
      // Sus colores, de lo primero que se ve (el primer fondo que no es transparente, subiendo desde el centro de arriba).
      const colores = vista === "escritorio" ? await p.evaluate(() => {
        const hex = (c: string) => { const m = c.match(/\d+(\.\d+)?/g); if (!m || m.length < 3 || (m.length > 3 && Number(m[3]) < 0.5)) return ""; return `#${m.slice(0, 3).map((x) => Math.round(Number(x)).toString(16).padStart(2, "0")).join("")}`; };
        const el = document.elementFromPoint(window.innerWidth * 0.3, Math.min(window.innerHeight * 0.4, 360)) ?? document.body;
        let fondo = "";
        for (let e: Element | null = el; e && !fondo; e = e.parentElement) fondo = hex(getComputedStyle(e).backgroundColor);
        return { fondo: fondo || hex(getComputedStyle(document.body).backgroundColor) || "#ffffff", tinta: hex(getComputedStyle(el).color) || "#111111" };
      }).catch(() => undefined) : colores0;
      if (vista === "escritorio") colores0 = colores;
      const h = Math.max(alto, Math.min(total, ancho > 1000 ? 1800 : 1600));
      const datos = await p.screenshot({ type: "jpeg", quality: 72, fullPage: true, clip: { x: 0, y: 0, width: ancho, height: h } });
      const archivo = nombreCaptura(cliente, url, vista);
      await guardarMaterial(archivo, datos);
      out.push({ archivo, ancho, alto: h, vista, ...(colores ?? {}) });
    }
    // El material para publicar (sistema/122). Si algo de esto falla, lo anterior ya quedó: no se pierde la captura.
    try { out.push(...await materialParaPublicar(p, nombreCaptura(cliente, url, "escritorio").replace(/-1440\.jpg$/, ""), o.plazo)); }
    catch (e) { console.error(`[material] ${url}: no salió el material para publicar:`, (e as Error)?.message ?? e); }
  } finally {
    await ctx.close().catch(() => {});
  }
  return out;
}

/**
 * Lo que se publica de una web (sistema/122), como lo muestran los estudios: tramos de la página a pantalla completa
 * (sin aparatos ni marcos), su logo solo, y un video de la web bajando. Todo en la misma página ya abierta, cambiando
 * el tamaño por CDP (el Chromium del servidor no aguanta varios contextos).
 */
async function materialParaPublicar(p: import("playwright").Page, base: string, plazo?: number): Promise<CapturaMaterial[]> {
  const out: CapturaMaterial[] = [];
  const medida = async (width: number, height: number) => { await p.setViewportSize({ width, height }); await p.waitForTimeout(900); };
  const bajar = async (y: number) => { await p.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }), y).catch(() => {}); };
  const guardar = async (archivo: string, datos: Uint8Array, ancho: number, alto: number, vista: CapturaMaterial["vista"]) => { await guardarMaterial(archivo, datos); out.push({ archivo, ancho, alto, vista }); };

  // 1 · El logo, solo y sin fondo, grande.
  await medida(1440, 900);
  await bajar(0);
  for (const sel of ['header [class*="logo" i]', '[class*="logo" i]', '[id*="logo" i]', '[aria-label*="logo" i]', "header svg", "header img", "nav svg", "nav img"]) {
    const el = p.locator(sel).first();
    if (!(await el.count().catch(() => 0))) continue;
    const caja = await el.boundingBox().catch(() => null);
    if (!caja || caja.width < 16 || caja.height < 8 || caja.width > 700 || caja.height > 300) continue;
    // Solo el logo, agrandado para que salga nítido: se esconde todo lo demás y se quita el fondo de la página.
    const z = Math.max(1, Math.min(5, Math.floor(1100 / caja.width)));
    await el.evaluate((e, zz) => {
      e.setAttribute("data-unmake-logo", "");
      const st = document.createElement("style");
      st.id = "unmake-solo-logo";
      st.textContent = `html,body{background:transparent!important}body *{visibility:hidden!important}[data-unmake-logo],[data-unmake-logo] *{visibility:visible!important}[data-unmake-logo]{transform:scale(${zz})!important;transform-origin:top left!important;transition:none!important}`;
      document.head.appendChild(st);
    }, z).catch(() => {});
    await p.waitForTimeout(250);
    const png = await el.screenshot({ type: "png", omitBackground: true }).catch(() => undefined);
    await p.evaluate(() => { document.getElementById("unmake-solo-logo")?.remove(); document.querySelector("[data-unmake-logo]")?.removeAttribute("data-unmake-logo"); }).catch(() => {});
    if (png && png.byteLength > 300 && png.byteLength < 900_000) { await guardar(`${base}-logo.png`, png, Math.round(caja.width * z), Math.round(caja.height * z), "logo"); break; }
  }

  // 2 · Tramos de la página al tamaño exacto de un post (1080×1350): hasta 5, repartidos a lo largo de la web.
  await medida(1080, 1350);
  const alto = await p.evaluate(() => document.documentElement.scrollHeight).catch(() => 1350);
  const tramos = Math.max(1, Math.min(5, Math.round(alto / 1350)));
  for (let i = 0; i < tramos; i++) {
    await bajar(tramos === 1 ? 0 : Math.round(((alto - 1350) * i) / (tramos - 1)));
    await p.waitForTimeout(i ? 900 : 300); // lo que aparece al bajar
    await guardar(`${base}-p${i + 1}.jpg`, await p.screenshot({ type: "jpeg", quality: 82 }), 1080, 1350, "pagina");
  }

  // 3 · Vertical (1080×1920): la portada del reel y el video de la web bajando sola.
  await medida(1080, 1920);
  await bajar(0);
  await p.waitForTimeout(600);
  await guardar(`${base}-v.jpg`, await p.screenshot({ type: "jpeg", quality: 82 }), 1080, 1920, "vertical");
  if (!plazo || Date.now() < plazo - 60_000) {
    try {
      const video = await grabarRecorrido(p, bajar);
      if (video) await guardar(`${base}-v.mp4`, video, 1080, 1920, "video");
    } catch (e) { console.error("[material] no se pudo grabar el recorrido:", (e as Error)?.message ?? e); }
  }
  return out;
}

/** La web bajando sola: 5 segundos, 24 cuadros por segundo, con arranque y freno suaves. Sin FFmpeg, no hay video. */
async function grabarRecorrido(p: import("playwright").Page, bajar: (y: number) => Promise<void>): Promise<Uint8Array | undefined> {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const alto = await p.evaluate(() => document.documentElement.scrollHeight).catch(() => 1920);
  const hasta = Math.min(alto - 1920, 1920 * 3);
  if (hasta < 400) return undefined; // una sola pantalla: no hay nada que recorrer
  const dir = mkdtempSync(join(tmpdir(), "recorrido-"));
  try {
    const N = 120;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      await bajar(Math.round(hasta * suave));
      writeFileSync(join(dir, `c${String(i).padStart(3, "0")}.jpg`), await p.screenshot({ type: "jpeg", quality: 80 }));
    }
    const { correr } = await import("../video/ffmpeg.ts");
    const salida = join(dir, "recorrido.mp4");
    await correr(["-y", "-framerate", "24", "-i", join(dir, "c%03d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "veryfast", "-movflags", "+faststart", salida]);
    return readFileSync(salida);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Por qué no se pudo, en palabras simples, con la causa real al final para poder arreglarlo. */
export function motivoMaterial(e: unknown): string {
  const m = String((e as Error)?.message ?? e).split("\n")[0]!.replace(/\s+/g, " ").slice(0, 140);
  const simple = /Timeout/i.test(m) ? "La web tardó demasiado en abrir" : /ERR_NAME_NOT_RESOLVED|ENOTFOUND/.test(m) ? "La dirección no existe" : /closed|crash|disconnected/i.test(m) ? "El navegador del servidor se cerró" : /ERR_CONNECTION|ERR_TUNNEL|ERR_BLOCKED|403/i.test(m) ? "La web no dejó entrar al navegador" : "No se pudo capturar";
  return `${simple} (${m}).`;
}

/** El logo tal como se ve en la web (también los que dibuja un script): una imagen del elemento que dice «logo». */
export async function logoDeWeb(nav: Browser, url: string): Promise<string | undefined> {
  if (!direccionPermitida(url)) return undefined;
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "load", timeout: 30_000 });
    await p.waitForTimeout(2500);
    for (const sel of ['header [class*="logo" i]', '[class*="logo" i]', '[id*="logo" i]', '[aria-label*="logo" i]', "header svg", "header img"]) {
      const el = p.locator(sel).first();
      if (!(await el.count())) continue;
      const caja = await el.boundingBox().catch(() => null);
      if (!caja || caja.width < 16 || caja.height < 8 || caja.width > 900 || caja.height > 400) continue;
      const png = await el.screenshot({ type: "png", omitBackground: true }).catch(() => undefined);
      if (png && png.byteLength < 400_000) return `data:image/png;base64,${png.toString("base64")}`;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Las referencias de la Dirección que todavía no tienen capturas (o todas si se pide de nuevo). */
export const porCapturar = (d: DireccionCliente | undefined, todas = false) => (d?.referencias ?? []).filter((r) => todas || faltaCaptura(r));
/** Sin capturas, o capturas de antes que no guardaron sus colores (sistema/122): se vuelven a sacar solas. */
const faltaCaptura = (r: ReferenciaDir) => !r.capturas?.length || !r.capturas.some((c) => c.vista === "pagina");

/** Captura las referencias que faltan y devuelve la Dirección con sus capturas, más lo que no se pudo y por qué. */
export async function capturarReferencias(abrir: () => Promise<Browser>, cliente: string, d: DireccionCliente, o: { todas?: boolean; plazo?: number } = {}): Promise<{ direccion: DireccionCliente; hechas: number; fallas: { url: string; motivo: string }[] }> {
  const fallas: { url: string; motivo: string }[] = [];
  let hechas = 0;
  const referencias: ReferenciaDir[] = [];
  let nav: Browser | undefined;
  try {
    for (const r of d.referencias) {
      const toca = o.todas || faltaCaptura(r);
      if (!toca || (o.plazo && Date.now() > o.plazo)) { referencias.push(r); continue; }
      let capturas: CapturaMaterial[] | undefined, error: unknown;
      // Si el navegador se cayó, se abre otro y se intenta una vez más.
      for (let intento = 0; intento < 2 && !capturas; intento++) {
        try {
          if (!nav || !nav.isConnected()) nav = await abrir();
          capturas = await capturarWeb(nav, cliente, r.url, { plazo: o.plazo });
        } catch (e) {
          error = e;
          console.error(`[material] ${r.url} (intento ${intento + 1}):`, (e as Error)?.message ?? e);
          const murio = !nav?.isConnected() || /closed|crash|disconnected/i.test(String((e as Error)?.message));
          if (murio) { await nav?.close().catch(() => {}); nav = undefined; } else break;
        }
      }
      if (capturas) { referencias.push({ ...r, capturas, capturadaEl: new Date().toISOString() }); hechas++; }
      else { fallas.push({ url: r.url, motivo: motivoMaterial(error) }); referencias.push(r); }
    }
  } finally {
    await nav?.close().catch(() => {});
  }
  return { direccion: { ...d, referencias, actualizada: new Date().toISOString() }, hechas, fallas };
}

/** Lo que hay para mostrar: las capturas de su trabajo y de sus referencias, con la nota de cada una. */
export function materialDe(d: DireccionCliente | undefined): { archivo: string; vista: "escritorio" | "celular"; url: string; nota?: string; trabajo: boolean; fondo?: string; tinta?: string }[] {
  // Solo lo que se ve al entrar: es lo que ven Faro y la vara. El material para publicar va en proyectosDe.
  return (d?.referencias ?? []).flatMap((r) => (r.capturas ?? []).filter((c) => c.vista === "escritorio" || c.vista === "celular").map((c) => ({ archivo: c.archivo, vista: c.vista as "escritorio" | "celular", url: r.url, nota: r.nota, trabajo: !!r.trabajo, ...(c.fondo ? { fondo: c.fondo, tinta: c.tinta } : {}) })));
}

/** Una captura de la vara lista para mostrársela a la IA (base64). */
export interface CapturaVara { archivo: string; url: string; nota?: string; trabajo: boolean; datos: string }

/**
 * La vara del cliente como imágenes (sistema/120): las capturas de computadora de su trabajo real primero y después
 * las de «qué es bueno», hasta `max`. Las que no se pueden leer se saltan. Sirve para Faro, los agentes y la revisión.
 */
export async function varaDeDireccion(d: DireccionCliente | undefined, max = 3): Promise<CapturaVara[]> {
  const lista = materialDe(d).filter((m) => m.vista === "escritorio").sort((a, b) => Number(b.trabajo) - Number(a.trabajo));
  const out: CapturaVara[] = [];
  for (const m of lista) {
    if (out.length >= max) break;
    const datos = await leerMaterial(m.archivo).catch(() => undefined);
    if (datos?.length) out.push({ archivo: m.archivo, url: m.url, nota: m.nota, trabajo: m.trabajo, datos: Buffer.from(datos).toString("base64") });
  }
  return out;
}

/** Los bloques de imagen de la vara, cada uno con lo que muestra, para la API de la IA. */
export function bloquesVara(v: CapturaVara[]): { type: string; text?: string; source?: unknown }[] {
  return v.flatMap((m) => [
    { type: "text", text: `Vara del cliente · ${m.trabajo ? "su trabajo real" : "lo que para ellos es bueno"} · ${m.url}${m.nota ? ` — ${m.nota}` : ""}` },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: m.datos } },
  ]);
}

/**
 * La vara del cliente de un pedido (sistema/120): por su ficha (o por su nombre si es de antes). Si algo falla, nada:
 * los agentes trabajan igual, con la Dirección escrita.
 */
export async function varaDePedido(pedido: { ficha?: string; cliente: string }, max = 3): Promise<CapturaVara[]> {
  try {
    const { leerFichas } = await import("./almacen-fichas.ts");
    const { idFicha } = await import("./fichas.ts");
    const f = (await leerFichas()).fichas;
    return await varaDeDireccion((f[pedido.ficha ?? ""] ?? f[idFicha(pedido.cliente)])?.direccion, max);
  } catch (e) {
    console.error("[material] no se pudo leer la vara del pedido:", (e as Error).message);
    return [];
  }
}


/** Un proyecto de «su trabajo real» con todo lo que hay para publicar de él (sistema/122). */
export interface ProyectoMaterial { url: string; nota?: string; nombre: string; base: string; fondo?: string; tinta?: string; paginas: string[]; vertical?: string; video?: string; logo?: string }

/** Los proyectos del cliente que tienen material para publicar: sus tramos, su vertical, su video y su logo. */
export function proyectosDe(d: DireccionCliente | undefined): ProyectoMaterial[] {
  return (d?.referencias ?? []).filter((r) => r.trabajo).map((r) => {
    const c = r.capturas ?? [], de = (v: CapturaMaterial["vista"]) => c.filter((x) => x.vista === v).map((x) => x.archivo);
    const esc = c.find((x) => x.vista === "escritorio");
    return { url: r.url, nota: r.nota, nombre: (r.nota?.split(/[:—–-]/)[0] ?? "").replace(/^web de /i, "").trim() || r.url.replace(/^https?:\/\/(www\.)?/, "").split(/[./]/)[0]!, base: esc?.archivo ?? "", fondo: esc?.fondo, tinta: esc?.tinta, paginas: de("pagina"), vertical: de("vertical")[0], video: de("video")[0], logo: de("logo")[0] };
  // Capturas de antes (sin tramos): se usa lo que se ve al entrar, hasta que la ficha las vuelva a sacar.
  }).filter((x) => x.base).map((x) => (x.paginas.length ? x : { ...x, paginas: [x.base] }));
}
