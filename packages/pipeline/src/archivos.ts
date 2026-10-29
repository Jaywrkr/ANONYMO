// Archivos del cliente (fotos, logos, PDFs): se guardan en proyectos/<id>/archivos/ y los agentes los ven.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { bitacora, carpeta } from "./almacen.ts";

export const MAX_BYTES = 25 * 1024 * 1024;
export const TIPOS: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown", ".svg": "image/svg+xml",
};
export const esImagen = (nombre: string) => /\.(jpe?g|png|webp|gif)$/i.test(nombre);

export interface Archivo { nombre: string; bytes: number; tipo: string; fecha: string; nota?: string }

const dirArchivos = (id: string) => join(carpeta(), id, "archivos");

/** Un nombre de archivo limpio (sin carpeta), para guardarlo o subirlo. */
export function limpiarNombre(original: string): string {
  const ext = extname(original).toLowerCase();
  const base = basename(original, extname(original)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "archivo";
  return `${base}${ext}`;
}

/** Se puede subir: tipo permitido y no más de 25 MB. */
export function validarSubida(nombre: string, bytes: number) {
  validar(nombre, bytes);
}

/** Nombre seguro: sin rutas, sin caracteres raros, sin pisar otro archivo. */
export function nombreSeguro(id: string, original: string): string {
  const ext = extname(original).toLowerCase();
  const base = basename(original, extname(original)).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "archivo";
  let nombre = `${base}${ext}`;
  for (let i = 2; existsSync(join(dirArchivos(id), nombre)); i++) nombre = `${base}-${i}${ext}`;
  return nombre;
}

function validar(nombre: string, bytes: number) {
  if (!TIPOS[extname(nombre).toLowerCase()]) throw new Error(`Tipo no permitido: ${nombre}. Se aceptan ${Object.keys(TIPOS).join(" ")}`);
  if (bytes > MAX_BYTES) throw new Error(`${nombre} pesa más de 25 MB.`);
}

function anotar(id: string, a: Archivo) {
  const indice = join(dirArchivos(id), "indice.json");
  const lista: Archivo[] = existsSync(indice) ? JSON.parse(readFileSync(indice, "utf8")) : [];
  lista.push(a);
  writeFileSync(indice, JSON.stringify(lista, null, 2) + "\n");
  bitacora(id, `Archivo agregado: ${a.nombre}${a.nota ? ` (${a.nota})` : ""}.`);
}

/** Desde la web (subida). */
export function guardarArchivo(id: string, original: string, datos: Buffer, nota?: string): Archivo {
  validar(original, datos.length);
  mkdirSync(dirArchivos(id), { recursive: true });
  const nombre = nombreSeguro(id, original);
  writeFileSync(join(dirArchivos(id), nombre), datos);
  const a = { nombre, bytes: datos.length, tipo: TIPOS[extname(nombre).toLowerCase()], fecha: new Date().toISOString(), nota };
  anotar(id, a);
  return a;
}

/** Desde la terminal (copia un archivo local). */
export function adjuntar(id: string, ruta: string, nota?: string): Archivo {
  const bytes = statSync(ruta).size;
  validar(ruta, bytes);
  mkdirSync(dirArchivos(id), { recursive: true });
  const nombre = nombreSeguro(id, ruta);
  copyFileSync(ruta, join(dirArchivos(id), nombre));
  const a = { nombre, bytes, tipo: TIPOS[extname(nombre).toLowerCase()], fecha: new Date().toISOString(), nota };
  anotar(id, a);
  return a;
}

export function listarArchivos(id: string): Archivo[] {
  const indice = join(dirArchivos(id), "indice.json");
  if (!existsSync(indice)) return [];
  const lista: Archivo[] = JSON.parse(readFileSync(indice, "utf8"));
  const hay = new Set(readdirSync(dirArchivos(id)));
  return lista.filter((a) => hay.has(a.nombre));
}

/** Ruta en disco de un archivo del proyecto, validando que no se salga de la carpeta. */
export function rutaArchivo(id: string, nombre: string): string | undefined {
  if (nombre !== basename(nombre) || nombre === "indice.json") return undefined;
  const r = join(dirArchivos(id), nombre);
  return existsSync(r) ? r : undefined;
}
