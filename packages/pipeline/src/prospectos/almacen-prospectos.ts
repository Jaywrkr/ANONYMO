// Dónde vive la lista de clientes nuevos (sistema/66). En tu máquina: proyectos/_prospectos/lista/lista.json.
// En línea: la misma ruta en la nube privada. Nunca en el repo: son datos de negocios reales.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "../almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "../nube.ts";
import { ESTADOS_PROSPECTO, FIRMA_INICIAL, PLANTILLAS_MUESTRA, type EstadoProspecto, type ListaProspectos, type PlantillaMuestra, type Prospecto } from "./tipos.ts";
import type { Lugar } from "./buscar-lugares.ts";

export const CARPETA_PROSPECTOS = "_prospectos";
const REL = `${CARPETA_PROSPECTOS}/lista/lista.json`;
const local = () => join(carpeta(), REL);

const vacia = (): ListaProspectos => ({ actualizado: new Date().toISOString(), firma: FIRMA_INICIAL, prospectos: {} });

/** El texto tal como está guardado (o undefined si no hay lista todavía). */
async function leerTexto(): Promise<string | undefined> {
  if (nubeActiva()) {
    const b = await leerSuelto(REL);
    return b ? Buffer.from(b).toString("utf8") : undefined;
  }
  return existsSync(local()) ? readFileSync(local(), "utf8") : undefined;
}

const desdeTexto = (texto?: string): ListaProspectos => {
  if (!texto) return vacia();
  const l = JSON.parse(texto) as ListaProspectos;
  return { ...vacia(), ...l, prospectos: l.prospectos ?? {} };
};

export async function leerProspectos(): Promise<ListaProspectos> {
  return desdeTexto(await leerTexto());
}

async function guardar(l: ListaProspectos) {
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) return subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  mkdirSync(join(carpeta(), CARPETA_PROSPECTOS, "lista"), { recursive: true });
  writeFileSync(`${local()}.tmp`, json);
  renameSync(`${local()}.tmp`, local());
}

/** Lee lo último guardado, cambia y guarda: así Jay, Luna y las muestras no se pisan entre clics.
 *  Antes de guardar vuelve a leer: si alguien guardó en el medio, repite el cambio sobre lo nuevo (sistema/78). */
export async function cambiarProspectos<T>(fn: (l: ListaProspectos) => T | Promise<T>, intentos = 4): Promise<{ lista: ListaProspectos; valor: T }> {
  for (let i = 0; ; i++) {
    const antes = await leerTexto();
    const l = desdeTexto(antes);
    const valor = await fn(l);
    if (i < intentos - 1 && (await leerTexto()) !== antes) {
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
      continue;
    }
    await guardar(l);
    return { lista: l, valor };
  }
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
    l.prospectos[x.id] = { ...x, rubro, ciudad, estado: "nuevo", agregado: ahora, actualizado: ahora, por, historial: [{ cuando: ahora, que: `Imán lo encontró buscando «${rubro}» en ${ciudad}`, por }] };
    nuevos++;
  }
  return nuevos;
}

/** Los que tienen web y todavía no se revisaron. */
export const porRevisar = (l: ListaProspectos) => Object.values(l.prospectos).filter((p) => p.web && !p.revision);

export interface CambioProspecto { estado?: EstadoProspecto; notas?: string; mensaje?: string | null; proyecto?: string; plantilla?: PlantillaMuestra }

export function aplicarCambio(p: Prospecto, c: CambioProspecto, por: string) {
  const ahora = new Date().toISOString();
  const anotar = (que: string) => (p.historial ??= []).push({ cuando: ahora, que, por });
  if (c.estado && c.estado !== p.estado) anotar(`Pasó a «${ESTADOS_PROSPECTO[c.estado]}»`);
  if (c.proyecto && c.proyecto !== p.proyecto) anotar("Se convirtió en pedido");
  if (c.estado) p.estado = c.estado;
  if (c.notas !== undefined) p.notas = c.notas.slice(0, 2000) || undefined;
  if (c.mensaje !== undefined) p.mensaje = c.mensaje ? c.mensaje.slice(0, 2000) : undefined;
  if (c.proyecto) p.proyecto = c.proyecto;
  if (c.plantilla && c.plantilla !== p.plantilla) { p.plantilla = c.plantilla; anotar(`Su muestra pasó a «${PLANTILLAS_MUESTRA[c.plantilla].nombre}»`); }
  p.actualizado = new Date().toISOString();
  p.por = por;
}
