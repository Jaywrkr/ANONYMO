// Los celulares que reciben avisos del estudio (sistema/72): cuando un negocio abre su muestra, suena el celular de Jay o Luna.
// Vive en la nube privada (_avisos/lista/celulares.json), nunca en el repo.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "./almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "./nube.ts";

export interface Celular {
  /** La suscripción que da el navegador (endpoint y claves). */
  endpoint: string;
  keys: { p256dh: string; auth: string };
  socio: string;
  agregado: string;
  /** Lo que se ve en ajustes: «Android · Chrome». */
  equipo?: string;
}

export const CARPETA_AVISOS = "_avisos";
const REL = `${CARPETA_AVISOS}/lista/celulares.json`;
const local = () => join(carpeta(), REL);

export async function leerCelulares(): Promise<Celular[]> {
  let texto: string | undefined;
  if (nubeActiva()) {
    const b = await leerSuelto(REL);
    texto = b ? Buffer.from(b).toString("utf8") : undefined;
  } else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  if (!texto) return [];
  const l = JSON.parse(texto) as { celulares?: Celular[] };
  return l.celulares ?? [];
}

async function guardar(celulares: Celular[]) {
  const json = JSON.stringify({ actualizado: new Date().toISOString(), celulares }, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), CARPETA_AVISOS, "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

/** Suma o actualiza un celular (el mismo endpoint no se repite). Como máximo 10. */
export async function sumarCelular(c: Celular) {
  const lista = (await leerCelulares()).filter((x) => x.endpoint !== c.endpoint);
  lista.push(c);
  await guardar(lista.slice(-10));
  return lista.length;
}

export async function quitarCelulares(endpoints: string[]) {
  if (!endpoints.length) return;
  await guardar((await leerCelulares()).filter((x) => !endpoints.includes(x.endpoint)));
}

/** Solo direcciones https de los servicios de avisos; http local únicamente en el estudio de prueba (ANONYMO_AVISOS_PRUEBA=1). */
export function suscripcionValida(s: unknown): s is Pick<Celular, "endpoint" | "keys"> {
  const x = s as Celular;
  if (!x || typeof x.endpoint !== "string" || typeof x.keys?.p256dh !== "string" || typeof x.keys?.auth !== "string") return false;
  try {
    const u = new URL(x.endpoint);
    return u.protocol === "https:" || (process.env.ANONYMO_AVISOS_PRUEBA === "1" && u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname));
  } catch {
    return false;
  }
}
