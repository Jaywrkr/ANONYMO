// Kits de marca del departamento de video (sistema/65): color, logo y música propia de cada cliente.
// En tu máquina: proyectos/_marcas/<id>/. En línea: la misma ruta en la nube privada.
// La música la sube el cliente o Jay: no hay biblioteca de canciones (los derechos de uso son de cada marca).
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { carpeta } from "../almacen.ts";
import { bajarSuelto, carpetasEn, firmarLectura, firmarSubidaEn, leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import type { KitMarca } from "./tipos.ts";

export const CARPETA_MARCAS = "_marcas";
export const TIPOS_LOGO: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
export const TIPOS_MUSICA: Record<string, string> = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".aac": "audio/aac" };
const MAX_LOGO = 5 * 1024 * 1024, MAX_MUSICA = 30 * 1024 * 1024;

export const idKitValido = (id: string) => /^m-[a-z0-9][a-z0-9-]{2,70}$/.test(id);
const exigir = (id: string) => { if (!idKitValido(id)) throw new Error("Marca no válida."); return id; };
const archivoKit = (a: string) => /^(logo|musica)\.[a-z0-9]{2,4}$/.test(a);
const rel = (id: string, archivo: string) => {
  if (archivo !== "kit.json" && !archivoKit(archivo)) throw new Error("Archivo no válido.");
  return `${CARPETA_MARCAS}/${exigir(id)}/${archivo}`;
};
const local = (id: string, archivo: string) => join(carpeta(), CARPETA_MARCAS, exigir(id), archivo);
const color = (c: unknown, def: string) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : def);

export function nuevoIdKit(nombre: string) {
  const base = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "marca";
  return `m-${base}-${randomBytes(2).toString("hex")}`;
}

/** Limpia lo que llega de la interfaz: nombre y colores. */
export function datosKit(x: { nombre?: unknown; color?: unknown; texto?: unknown }, base?: KitMarca) {
  const nombre = typeof x.nombre === "string" && x.nombre.trim() ? x.nombre.trim().slice(0, 80) : base?.nombre;
  if (!nombre) throw new Error("Ponle un nombre a la marca.");
  return { nombre, color: color(x.color, base?.color ?? "#121214"), texto: color(x.texto, base?.texto ?? "#ffffff") };
}

/** Valida un logo o una música antes de subirlo. Devuelve el nombre con que se guarda. */
export function validarArchivoKit(tipo: "logo" | "musica", nombre: string, bytes: number) {
  const ext = extname(nombre).toLowerCase();
  const tipos = tipo === "logo" ? TIPOS_LOGO : TIPOS_MUSICA;
  if (!tipos[ext]) throw new Error(tipo === "logo" ? "El logo tiene que ser PNG, JPG o WEBP (mejor PNG con fondo transparente)." : "La música tiene que ser MP3, M4A, WAV o AAC.");
  const max = tipo === "logo" ? MAX_LOGO : MAX_MUSICA;
  if (!(bytes > 0) || bytes > max) throw new Error(`${tipo === "logo" ? "El logo" : "La música"} pesa más de ${Math.round(max / 1024 / 1024)} MB.`);
  return `${tipo}${ext === ".jpeg" ? ".jpg" : ext}`;
}

export const tipoArchivoKit = (archivo: string) => ({ ...TIPOS_LOGO, ...TIPOS_MUSICA })[extname(archivo).toLowerCase()] ?? "application/octet-stream";

export async function leerKit(id: string): Promise<KitMarca | undefined> {
  if (!idKitValido(id)) return undefined;
  if (nubeActiva()) {
    const b = await leerSuelto(rel(id, "kit.json"));
    return b ? (JSON.parse(Buffer.from(b).toString("utf8")) as KitMarca) : undefined;
  }
  const r = local(id, "kit.json");
  return existsSync(r) ? (JSON.parse(readFileSync(r, "utf8")) as KitMarca) : undefined;
}

export async function guardarKit(k: KitMarca) {
  k.actualizado = new Date().toISOString();
  const json = JSON.stringify(k, null, 2);
  if (nubeActiva()) return subirSuelto(rel(k.id, "kit.json"), new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), CARPETA_MARCAS, exigir(k.id)), { recursive: true });
  const r = local(k.id, "kit.json");
  writeFileSync(`${r}.tmp`, json);
  renameSync(`${r}.tmp`, r);
}

export async function listarKits(): Promise<KitMarca[]> {
  let ids: string[] = [];
  if (nubeActiva()) ids = await carpetasEn(CARPETA_MARCAS).catch(() => []);
  else { const d = join(carpeta(), CARPETA_MARCAS); ids = existsSync(d) ? readdirSync(d) : []; }
  const todos = await Promise.all(ids.filter(idKitValido).map((id) => leerKit(id).catch(() => undefined)));
  return todos.filter((x): x is KitMarca => !!x).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Dónde subir el logo o la música desde el navegador (undefined en tu máquina: sube por el estudio). */
export const urlSubidaKit = async (id: string, archivo: string) => (nubeActiva() ? firmarSubidaEn(rel(id, archivo)) : undefined);
/** URL para que el navegador lea el archivo directo de la nube (undefined en tu máquina). */
export const urlLecturaKit = async (id: string, archivo: string) => (nubeActiva() ? firmarLectura(rel(id, archivo), 3 * 3600) : undefined);
/** Ruta en el disco de esta máquina (solo sin nube). */
export const rutaLocalKit = (id: string, archivo: string) => { rel(id, archivo); return local(id, archivo); };

export function guardarLocalKit(id: string, archivo: string, datos: Uint8Array) {
  mkdirSync(join(carpeta(), CARPETA_MARCAS, exigir(id)), { recursive: true });
  writeFileSync(rutaLocalKit(id, archivo), datos);
}

/** Deja el archivo del kit en el disco (en línea lo baja a `destino`). */
export async function traerArchivoKit(id: string, archivo: string, destino: string) {
  if (!nubeActiva()) {
    const r = rutaLocalKit(id, archivo);
    if (!existsSync(r)) throw new Error("Falta un archivo de la marca. Vuelve a subirlo.");
    return r;
  }
  await bajarSuelto(rel(id, archivo), destino);
  return destino;
}

/** Los bytes de un archivo del kit (para que Atlas vea el logo, por ejemplo). */
export async function leerArchivoKit(id: string, archivo: string) {
  if (nubeActiva()) return leerSuelto(rel(id, archivo));
  const r = rutaLocalKit(id, archivo);
  return existsSync(r) ? new Uint8Array(readFileSync(r)) : undefined;
}
