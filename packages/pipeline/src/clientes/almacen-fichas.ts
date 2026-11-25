// Dónde viven las notas y el contacto de cada cliente (sistema/70). En tu máquina: proyectos/_clientes/lista/fichas.json.
// En línea: la misma ruta en la nube privada. Nunca en el repo: son datos de clientes reales.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { idFicha, type FichaGuardada, type ListaFichas } from "./fichas.ts";
import { esClaveSaber } from "./saber.ts";
import type { LecturaFuentes } from "./fuentes.ts";

export const CARPETA_CLIENTES = "_clientes";
const REL = `${CARPETA_CLIENTES}/lista/fichas.json`;
const local = () => join(carpeta(), REL);
const vacia = (): ListaFichas => ({ actualizado: new Date().toISOString(), fichas: {} });

export async function leerFichas(): Promise<ListaFichas> {
  let texto: string | undefined;
  if (nubeActiva()) {
    const b = await leerSuelto(REL);
    texto = b ? Buffer.from(b).toString("utf8") : undefined;
  } else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  if (!texto) return vacia();
  const l = JSON.parse(texto) as ListaFichas;
  return { ...vacia(), ...l, fichas: l.fichas ?? {} };
}

async function guardar(l: ListaFichas) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), CARPETA_CLIENTES, "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

export interface CambioFicha { nombre: string; notas?: string; telefono?: string; correo?: string; web?: string; alias?: string[]; /** Datos de saber.ts: los que vienen se cambian; uno vacío se borra; los demás quedan. */ saber?: Record<string, string>; /** Lo leído de su web e Instagram (sistema/93); null lo borra. */ lectura?: LecturaFuentes | null }

const corto = (x: string | undefined, n: number) => (x ?? "").trim().slice(0, n) || undefined;

/** Crea o cambia lo escrito a mano de una ficha. Lee lo último antes de guardar. */
export async function guardarFicha(id: string, c: CambioFicha, por: string): Promise<FichaGuardada> {
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id)) throw new Error("No encontramos ese cliente.");
  const nombre = corto(c.nombre, 80);
  if (!nombre) throw new Error("El cliente necesita un nombre.");
  const l = await leerFichas();
  const ahora = new Date().toISOString();
  const antes = l.fichas[id];
  const alias = [...new Set((c.alias ?? antes?.alias ?? []).map((a) => a.trim()).filter((a) => a && idFicha(a) !== id))].slice(0, 12);
  // Lo que se sabe del cliente (sistema/92): solo claves conocidas, texto corto, y lo vacío se borra.
  const saber: Record<string, string> = { ...(antes?.saber ?? {}) };
  for (const [k, v] of Object.entries(c.saber ?? {})) {
    if (!esClaveSaber(k)) continue;
    const limpio = String(v ?? "").trim().slice(0, 1200);
    if (limpio) saber[k] = limpio; else delete saber[k];
  }
  const f: FichaGuardada = {
    id,
    nombre,
    notas: c.notas !== undefined ? corto(c.notas, 4000) : antes?.notas,
    telefono: c.telefono !== undefined ? corto(c.telefono, 40) : antes?.telefono,
    correo: c.correo !== undefined ? corto(c.correo, 120) : antes?.correo,
    web: c.web !== undefined ? corto(c.web, 200) : antes?.web,
    alias: alias.length ? alias : undefined,
    saber: Object.keys(saber).length ? saber : undefined,
    lectura: c.lectura === null ? undefined : c.lectura ?? antes?.lectura,
    leidoEl: c.lectura ? c.lectura.cuando : antes?.leidoEl,
    creado: antes?.creado ?? ahora,
    actualizado: ahora,
    por,
  };
  l.fichas[id] = f;
  await guardar(l);
  return f;
}
