// Dónde vive la lista de clientes nuevos (sistema/66). En tu máquina: proyectos/_prospectos/lista/lista.json.
// En línea: la misma ruta en la nube privada. Nunca en el repo: son datos de negocios reales.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { FIRMA_INICIAL, type EstadoProspecto, type ListaProspectos, type Prospecto } from "./tipos.ts";
import type { Lugar } from "./buscar-lugares.ts";

export const CARPETA_PROSPECTOS = "_prospectos";
const REL = `${CARPETA_PROSPECTOS}/lista/lista.json`;
const local = () => join(carpeta(), REL);

const vacia = (): ListaProspectos => ({ actualizado: new Date().toISOString(), firma: FIRMA_INICIAL, prospectos: {} });

export async function leerProspectos(): Promise<ListaProspectos> {
  let texto: string | undefined;
  if (nubeActiva()) {
    const b = await leerSuelto(REL);
    texto = b ? Buffer.from(b).toString("utf8") : undefined;
  } else if (existsSync(local())) texto = readFileSync(local(), "utf8");
  if (!texto) return vacia();
  const l = JSON.parse(texto) as ListaProspectos;
  return { ...vacia(), ...l, prospectos: l.prospectos ?? {} };
}

async function guardar(l: ListaProspectos) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), CARPETA_PROSPECTOS, "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

/** Lee lo último guardado, cambia y guarda: así Jay y Luna no se pisan entre clics. */
export async function cambiarProspectos<T>(fn: (l: ListaProspectos) => T | Promise<T>): Promise<{ lista: ListaProspectos; valor: T }> {
  const l = await leerProspectos();
  const valor = await fn(l);
  await guardar(l);
  return { lista: l, valor };
}

/** Suma lo que trajo Google. Si ya estaba, actualiza estrellas, reseñas y contacto sin tocar su estado ni notas. */
export function sumarLugares(l: ListaProspectos, lugares: Lugar[], rubro: string, ciudad: string, por: string) {
  const ahora = new Date().toISOString();
  let nuevos = 0;
  for (const x of lugares) {
    const ya = l.prospectos[x.id];
    if (ya) {
      const webCambio = (ya.web ?? "") !== (x.web ?? "");
      Object.assign(ya, { nombre: x.nombre, direccion: x.direccion, estrellas: x.estrellas, resenas: x.resenas, web: x.web, telefono: x.telefono, mapa: x.mapa });
      if (webCambio) ya.revision = undefined;
      continue;
    }
    l.prospectos[x.id] = { ...x, rubro, ciudad, estado: "nuevo", agregado: ahora, actualizado: ahora, por };
    nuevos++;
  }
  return nuevos;
}

/** Los que tienen web y todavía no se revisaron. */
export const porRevisar = (l: ListaProspectos) => Object.values(l.prospectos).filter((p) => p.web && !p.revision);

export interface CambioProspecto { estado?: EstadoProspecto; notas?: string; mensaje?: string | null; proyecto?: string }

export function aplicarCambio(p: Prospecto, c: CambioProspecto, por: string) {
  if (c.estado) p.estado = c.estado;
  if (c.notas !== undefined) p.notas = c.notas.slice(0, 2000) || undefined;
  if (c.mensaje !== undefined) p.mensaje = c.mensaje ? c.mensaje.slice(0, 2000) : undefined;
  if (c.proyecto) p.proyecto = c.proyecto;
  p.actualizado = new Date().toISOString();
  p.por = por;
}
