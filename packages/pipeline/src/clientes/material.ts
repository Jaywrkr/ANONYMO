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
export interface CapturaMaterial { archivo: string; ancho: number; alto: number; vista: "escritorio" | "celular" }

export const ARCHIVO_MATERIAL = /^[a-z0-9][a-z0-9-]{2,80}\.jpg$/;
const rel = (archivo: string) => `_clientes/material/${archivo}`;

/** El nombre no se adivina (lleva un resumen del cliente y la dirección): por eso se puede servir sin sesión. */
export const nombreCaptura = (cliente: string, url: string, vista: CapturaMaterial["vista"]) =>
  `${cliente.slice(0, 40)}-${createHash("sha256").update(`${cliente}|${url}|${process.env.ESTUDIO_SECRETO ?? "unmake"}`).digest("hex").slice(0, 16)}-${vista === "escritorio" ? "1440" : "390"}.jpg`;

export async function guardarMaterial(archivo: string, datos: Uint8Array) {
  if (!ARCHIVO_MATERIAL.test(archivo)) throw new Error("Nombre de archivo no válido.");
  if (nubeActiva()) return subirSuelto(rel(archivo), datos, "image/jpeg");
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
export async function capturarWeb(nav: Browser, cliente: string, url: string, o: { esperaMs?: number; timeoutMs?: number } = {}): Promise<CapturaMaterial[]> {
  if (!direccionPermitida(url)) throw new Error("Esa dirección no se puede abrir.");
  const out: CapturaMaterial[] = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "es-EC" });
  try {
    const p = await ctx.newPage();
    for (const [vista, ancho, alto] of [["escritorio", 1440, 900], ["celular", 390, 844]] as const) {
      await p.setViewportSize({ width: ancho, height: alto });
      if (vista === "escritorio") await p.goto(url, { waitUntil: "domcontentloaded", timeout: o.timeoutMs ?? 40_000 });
      else await p.reload({ waitUntil: "domcontentloaded", timeout: o.timeoutMs ?? 40_000 });
      await p.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
      await p.waitForTimeout(o.esperaMs ?? 3500); // las webs con entrada animada
      const total = await p.evaluate(() => document.documentElement.scrollHeight).catch(() => alto);
      const h = Math.max(alto, Math.min(total, ancho > 1000 ? 1800 : 1600));
      const datos = await p.screenshot({ type: "jpeg", quality: 72, fullPage: true, clip: { x: 0, y: 0, width: ancho, height: h } });
      const archivo = nombreCaptura(cliente, url, vista);
      await guardarMaterial(archivo, datos);
      out.push({ archivo, ancho, alto: h, vista });
    }
  } finally {
    await ctx.close().catch(() => {});
  }
  return out;
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
export const porCapturar = (d: DireccionCliente | undefined, todas = false) => (d?.referencias ?? []).filter((r) => todas || !r.capturas?.length);

/** Captura las referencias que faltan y devuelve la Dirección con sus capturas, más lo que no se pudo y por qué. */
export async function capturarReferencias(abrir: () => Promise<Browser>, cliente: string, d: DireccionCliente, o: { todas?: boolean; plazo?: number } = {}): Promise<{ direccion: DireccionCliente; hechas: number; fallas: { url: string; motivo: string }[] }> {
  const fallas: { url: string; motivo: string }[] = [];
  let hechas = 0;
  const referencias: ReferenciaDir[] = [];
  let nav: Browser | undefined;
  try {
    for (const r of d.referencias) {
      const toca = o.todas || !r.capturas?.length;
      if (!toca || (o.plazo && Date.now() > o.plazo)) { referencias.push(r); continue; }
      let capturas: CapturaMaterial[] | undefined, error: unknown;
      // Si el navegador se cayó, se abre otro y se intenta una vez más.
      for (let intento = 0; intento < 2 && !capturas; intento++) {
        try {
          if (!nav || !nav.isConnected()) nav = await abrir();
          capturas = await capturarWeb(nav, cliente, r.url);
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
export function materialDe(d: DireccionCliente | undefined): { archivo: string; vista: CapturaMaterial["vista"]; url: string; nota?: string; trabajo: boolean }[] {
  return (d?.referencias ?? []).flatMap((r) => (r.capturas ?? []).map((c) => ({ archivo: c.archivo, vista: c.vista, url: r.url, nota: r.nota, trabajo: !!r.trabajo })));
}
