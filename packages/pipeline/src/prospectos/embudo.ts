// El embudo de ventas y el marcador de la semana (sistema/89): en qué paso está cada negocio y cómo va la semana.
// Todo sale de lo que ya se guarda (estado, muestra, propuesta, historial): nada se anota aparte.
import { contactadoEn, precioDe } from "./muestra.ts";
import type { Prospecto } from "./tipos.ts";

export type Etapa = "nuevo" | "escrito" | "abrio" | "respondio" | "quiere" | "cliente";

/** Las etapas en orden, con el nombre que se ve en el tablero. */
export const ETAPAS: [Etapa, string][] = [
  ["nuevo", "Por escribir"],
  ["escrito", "Escritos"],
  ["abrio", "Abrieron su muestra"],
  ["respondio", "Respondieron"],
  ["quiere", "Quieren su web"],
  ["cliente", "Clientes"],
];

/** En qué etapa está un negocio. Se mueve sola: abrir la muestra, tocar «Quiero esta web» o aceptar la propuesta lo adelantan. */
export function etapaDe(p: Pick<Prospecto, "estado" | "muestra" | "propuesta">): Etapa | undefined {
  if (p.estado === "descartado") return undefined;
  if (p.estado === "cliente") return "cliente";
  if (p.muestra?.quiere || p.propuesta?.acepto) return "quiere";
  if (p.estado === "respondio" || p.estado === "reunion") return "respondio";
  if (p.estado === "contactado") return p.muestra?.vistas ? "abrio" : "escrito";
  return "nuevo";
}

/** Cuántos mensajes por semana se propone mandar si nadie puso otra meta: 10 por día de lunes a viernes. */
export const META_SEMANA = 50;
export const META_MIN = 5;
export const META_MAX = 140;
export const metaValida = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= META_MIN && n <= META_MAX;

const ZONA = "America/Guayaquil";
const dia = (t: Date | string) => new Date(t).toLocaleDateString("en-CA", { timeZone: ZONA });
/** El lunes de la semana de `ahora`, como AAAA-MM-DD en hora de Cuenca. */
export function lunesDe(ahora = new Date()) {
  const hoy = new Date(`${dia(ahora)}T12:00:00Z`);
  hoy.setUTCDate(hoy.getUTCDate() - ((hoy.getUTCDay() + 6) % 7));
  return hoy.toISOString().slice(0, 10);
}

const paso = (p: Prospecto, que: string) => p.historial?.find((h) => h.que === que)?.cuando;

/** El marcador de la semana (de lunes a hoy): mensajes enviados, muestras abiertas, respuestas, clientes y dólares cerrados. */
export function marcadorSemana(prospectos: Prospecto[], precioOferta: number, ahora = new Date()) {
  const desde = lunesDe(ahora);
  const esta = (iso?: string) => !!iso && dia(iso) >= desde;
  const m = { desde, enviados: 0, abrieron: 0, respondieron: 0, clientes: 0, dolares: 0, racha: 0 };
  const diasConEnvio = new Set<string>();
  for (const p of prospectos) {
    const escrito = contactadoEn(p);
    if (escrito) diasConEnvio.add(dia(escrito));
    if (esta(escrito)) m.enviados++;
    if (esta(p.muestra?.primera)) m.abrieron++;
    if (esta(paso(p, "Pasó a «Respondió»"))) m.respondieron++;
    if (p.estado === "cliente" && esta(paso(p, "Pasó a «Cliente»"))) { m.clientes++; m.dolares += precioDe(p, precioOferta); }
  }
  // La racha: días seguidos (sin contar sábados ni domingos) en los que se mandó al menos un mensaje. Hoy sin enviar todavía no la corta.
  const d = new Date(`${dia(ahora)}T12:00:00Z`);
  for (let i = 0; i < 60; i++) {
    const finde = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const k = d.toISOString().slice(0, 10);
    if (diasConEnvio.has(k)) m.racha++;
    else if (!finde && i > 0) break;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return m;
}
export type MarcadorSemana = ReturnType<typeof marcadorSemana>;
