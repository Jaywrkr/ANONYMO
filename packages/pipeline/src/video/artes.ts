// El arte de cada pieza del mes (sistema/107): como en los planificadores de @jaywrkr y Coresolutions, cada serie tiene
// una plantilla fija y cada marca su estilo (fondo, tinta, letra, firma). Se arma en HTML y el navegador del estudio
// lo convierte en imágenes: láminas 4:5 (1080×1350), portada de reel e historias 9:16 (1080×1920).
import type { Page } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { ESTILOS, estiloPara, historiasHTML, laminasHTML, type ArteDibujo, type EstiloArte, type PiezaArte } from "./artes-html.ts";
export { ESTILOS, estiloPara, historiasHTML, laminasHTML, type ArteDibujo, type EstiloArte, type PiezaArte };

/** Dibuja HTML en una imagen JPG con el navegador del estudio. */
export async function dibujar(page: Page, a: ArteDibujo): Promise<Buffer> {
  await page.setViewportSize({ width: a.ancho, height: a.alto });
  await page.setContent(a.html, { waitUntil: "load", timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))])).catch(() => {});
  return page.screenshot({ type: "jpeg", quality: 92, fullPage: false });
}

// — Dónde vive el arte: _arte/<mes>/<archivo>.jpg (nube privada o proyectos/; las rutas sueltas tienen tres niveles) —
export const ARCHIVO_ARTE = /^[a-z0-9-]{1,80}\.jpg$/;
const relArte = (mes: string, archivo: string) => `_arte/${mes}/${archivo}`;
export async function guardarArte(mes: string, archivo: string, datos: Uint8Array) {
  if (!ARCHIVO_ARTE.test(archivo)) throw new Error("Nombre de archivo no válido.");
  if (nubeActiva()) return subirSuelto(relArte(mes, archivo), datos, "image/jpeg");
  mkdirSync(join(carpeta(), "_arte", mes), { recursive: true });
  writeFileSync(join(carpeta(), relArte(mes, archivo)), datos);
}
export async function leerArte(mes: string, archivo: string): Promise<Uint8Array | undefined> {
  if (!ARCHIVO_ARTE.test(archivo)) return undefined;
  if (nubeActiva()) return leerSuelto(relArte(mes, archivo));
  const r = join(carpeta(), relArte(mes, archivo));
  return existsSync(r) ? readFileSync(r) : undefined;
}

/** Dibuja todo el arte de una pieza: láminas (o portada) e historias. Devuelve los archivos en orden. */
export async function dibujarPieza(page: Page, e: EstiloArte, p: PiezaArte): Promise<{ archivo: string; datos: Buffer }[]> {
  const out: { archivo: string; datos: Buffer }[] = [];
  for (const a of laminasHTML(e, p)) out.push({ archivo: `${a.nombre}.jpg`, datos: await dibujar(page, a) });
  const portada = out[0] ? `data:image/jpeg;base64,${out[0].datos.toString("base64")}` : undefined;
  for (const a of historiasHTML(e, p, portada)) out.push({ archivo: `${a.nombre}.jpg`, datos: await dibujar(page, a) });
  return out;
}
