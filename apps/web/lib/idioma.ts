// Español por defecto, inglés bajo /en (web/05).
import { AREAS, AREAS_EN, FASES, FASES_EN, SERVICIO, SERVICIO_EN, PEDIDOS, PEDIDOS_EN, type AreaId, type Idioma, type TipoPedido } from "@anonymo/agentes";

export type { Idioma };

/** Un enlace interno en el idioma de la página. */
export function enlace(href: string, idioma: Idioma) {
  if (idioma !== "en") return href;
  if (href === "/") return "/en";
  if (href.startsWith("/#")) return `/en${href.slice(1)}`;
  return `/en${href}`;
}

/** La misma página en el otro idioma. */
export function otroIdioma(ruta: string): { href: string; idioma: Idioma } {
  if (ruta === "/en" || ruta.startsWith("/en/")) return { href: ruta.replace(/^\/en/, "") || "/", idioma: "es" };
  return { href: ruta === "/" ? "/en" : `/en${ruta}`, idioma: "en" };
}

export const idiomaDeRuta = (ruta: string): Idioma => (ruta === "/en" || ruta.startsWith("/en/") ? "en" : "es");

export const fase = (n: number, idioma: Idioma) => {
  const f = FASES.find((x) => x.n === n)!;
  return idioma === "en" ? { ...f, ...FASES_EN[n] } : f;
};
export const servicio = (n: number, idioma: Idioma) => (idioma === "en" ? SERVICIO_EN[n] : SERVICIO[n]);
export const area = (id: AreaId, idioma: Idioma) => (idioma === "en" ? AREAS_EN[id] : AREAS[id].nombre);
export const pedido = (t: TipoPedido, idioma: Idioma) => (idioma === "en" ? PEDIDOS_EN[t] : PEDIDOS[t].nombre);

/** Para metadata: la página en los dos idiomas. */
export const alternos = (ruta: string) => ({ languages: { es: ruta, en: ruta === "/" ? "/en" : `/en${ruta}` } });
