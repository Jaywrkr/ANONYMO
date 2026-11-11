// Cuánto vale la pena escribirle a un negocio (0 a 100) y qué decirle (sistema/66). Sin IA: reglas fijas.
import type { Prospecto } from "./tipos.ts";

export interface Puntaje {
  puntaje: number;
  /** Lo que está mal en su web, en palabras simples. */
  motivos: string[];
  /** Buenas estrellas y muchas reseñas: factura y cuida su imagen. */
  buenaFama: boolean;
}

const anioViejo = (anio?: number, hoy = new Date()) => !!anio && anio <= hoy.getFullYear() - 2;

export function puntuar(p: Prospecto, hoy = new Date()): Puntaje {
  const r = p.revision;
  const motivos: string[] = [];
  let puntaje = 0;

  if (!p.web) {
    puntaje = 70;
    motivos.push("Sin web");
  } else if (!r) {
    puntaje = 0; // todavía no se revisó
  } else if (r.estado === "social") {
    puntaje = 75;
    motivos.push(`Solo ${r.red}`);
  } else if (r.estado === "rota") {
    puntaje = 85;
    motivos.push(r.motivo);
  } else {
    puntaje = 15;
    if (!r.celular) { puntaje += 30; motivos.push("No se ve bien en celular"); }
    if (!r.https) { puntaje += 15; motivos.push("Sin candado (https)"); }
    if (anioViejo(r.anio, hoy)) { puntaje += 15; motivos.push(`Sin actualizar desde ${r.anio}`); }
    if (r.ms > 4000) { puntaje += 10; motivos.push("Carga lenta"); }
    if (!r.titulo) { puntaje += 5; motivos.push("Sin título en Google"); }
    if (r.hechaCon && /joomla|frontpage|dreamweaver/i.test(r.hechaCon)) { puntaje += 10; motivos.push(`Hecha en ${r.hechaCon}`); }
    else if (r.hechaCon && /wix|weebly|jimdo|godaddy|site123/i.test(r.hechaCon)) { puntaje += 5; motivos.push(`Hecha en ${r.hechaCon}`); }
  }

  const e = p.estrellas ?? 0;
  const n = p.resenas ?? 0;
  const buenaFama = e >= 4.5 && n >= 20;
  if (buenaFama) puntaje += 15;
  else if (e >= 4.2 && n >= 10) puntaje += 8;
  if (n >= 80) puntaje += 5;
  if (e && e < 3.5) puntaje -= 10;

  return { puntaje: Math.max(0, Math.min(100, puntaje)), motivos, buenaFama };
}

const SALUD = /odont|dent|m[eé]dic|fisio|psic|derma|pediat|cl[ií]nica/i;

/** El primer mensaje: corto, específico y con una muestra ofrecida. */
export function mensajeInicial(p: Prospecto, firma: string, hoy = new Date(), muestra?: string) {
  const r = p.revision;
  const fama = p.estrellas && p.resenas ? ` Tienen ${p.estrellas} estrellas con ${p.resenas} reseñas, se nota que hacen muy buen trabajo.` : "";
  let problema: string;
  if (!p.web) problema = "Noté que no tienen página web, así que quienes los buscan en Google no tienen dónde conocerlos mejor ni agendar.";
  else if (r?.estado === "social") problema = `Noté que su enlace en Google lleva a ${r.red} y no a una web propia, así que pierden a quienes buscan algo más formal antes de escribirles.`;
  else if (r?.estado === "rota") problema = "Noté que el enlace a su web en Google no abre, y quienes los buscan se quedan sin poder verla.";
  else if (r?.estado === "ok" && !r.celular) problema = "Noté que su web no se adapta bien al celular, que es desde donde la mayoría los busca.";
  else if (r?.estado === "ok" && anioViejo(r.anio, hoy)) problema = `Noté que su web parece no actualizarse desde ${r.anio}.`;
  else problema = `Vi su web y creo que puede verse mucho más profesional y traerles más ${SALUD.test(p.rubro) ? "pacientes" : "clientes"}.`;
  // Con muestra (sistema/72) el enlace va en el primer mensaje: es lo que hace que contesten.
  const oferta = muestra ? `Les preparé una idea de cómo podría verse su web, sin compromiso: ${muestra}` : "Les preparé una idea de cómo podría verse su web. ¿Se la puedo enviar por aquí?";
  return `Hola, ¿qué tal? Vi ${p.nombre} en Google Maps.${fama} ${problema} ${oferta}\n\n${firma}`;
}

/** Solo los dígitos, con el código de Ecuador: «099 123 4567» → «593991234567». */
export function numeroInternacional(telefono?: string) {
  if (!telefono) return undefined;
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("0")) d = `593${d.slice(1)}`;
  return d.length >= 9 ? d : undefined;
}

/** Celular de Ecuador (09…): el único que seguro tiene WhatsApp. */
export const esCelular = (telefono?: string) => /^5939\d{8}$/.test(numeroInternacional(telefono) ?? "");

export function enlaceWhatsapp(telefono: string | undefined, texto: string) {
  const n = numeroInternacional(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : undefined;
}

/** Lo que se le cuenta a Atlas al convertir un prospecto en pedido. */
export function pedidoDesdeProspecto(p: Prospecto, hoy = new Date()) {
  const { motivos } = puntuar(p, hoy);
  const fama = p.estrellas ? `${p.estrellas} estrellas con ${p.resenas} reseñas en Google` : "sin reseñas en Google";
  const web = p.web ? `Su web actual es ${p.web} (${motivos.join(", ").toLowerCase() || "se puede mejorar"}).` : "No tiene web.";
  return `Una web para ${p.nombre}, ${p.rubro} en ${p.ciudad} (${fama}). ${web} Lo encontró Imán en clientes nuevos.${p.notas ? ` Notas: ${p.notas}` : ""}`;
}
