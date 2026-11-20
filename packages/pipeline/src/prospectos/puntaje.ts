// Cuánto vale la pena escribirle a un negocio (0 a 100) y qué decirle (sistema/66). Sin IA: reglas fijas.
import type { Prospecto } from "./tipos.ts";
import { nombreDe } from "./nombre.ts";
import { PLANTILLAS_MUESTRA, type PlantillaMuestra } from "./tipos.ts";
import { contenidoMuestra, idMuestra, precioDe } from "./muestra.ts";
import { OFERTA } from "../oferta.ts";

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
  // Quién escribe (sistema/90): debajo de la firma va el enlace a la página de Jay, con su trabajo y sus reconocimientos.
  // Un desconocido con un enlace genera desconfianza; una persona con nombre y trabajo detrás, menos.
  const quien = muestra?.includes("/m/") ? `\nQuién soy y qué he hecho: ${muestra.split("/m/")[0]}/jay` : "";
  return `Hola, ¿qué tal? Vi ${nombreDe(p)} en Google Maps.${fama} ${problema} ${oferta}\n\n${firma}${quien}`;
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
/** Cómo está armada cada plantilla, para que quien haga la web final parta de lo que el cliente ya vio (sistema/85). */
const ESTRUCTURA: Record<PlantillaMuestra, string> = {
  grafico: "marco del color de la marca con un panel de papel redondeado adentro; nombre enorme centrado en Bricolage Grotesque extra negrita; imagen grande con fichas flotando (abierto hoy, dirección) y un sello redondo con la nota de Google; servicios que se abren al tocar; frase grande sobre el color; tres tarjetas de «por qué aquí»; cierre oscuro con el nombre gigante",
  sereno: "papel claro; nombre grande centrado en Fraunces (serif suave, liviana); imagen dentro de un arco con dos fichas apoyadas (horario de hoy y nota de Google); frase en cursiva; servicios en lista con líneas finas; razones en un bloque suave; mucho aire",
  mosaico: "todo en fichas redondeadas sobre un fondo suave, como una app: ficha del nombre, ficha de imagen, ficha de nota de Google, ficha de horario y un botón de WhatsApp que ocupa una ficha; servicios en cuatro fichas; tipografía Bricolage Grotesque extra negrita",
  revista: "blanco, negro y el color de la marca; titular condensado enorme alineado a la izquierda (Bricolage Grotesque, ancho 75); líneas gruesas de 3 px, esquinas rectas; imagen ancha con el horario en una esquina; una cinta del color de la marca con los servicios corriendo",
  noche: "fondo oscuro con un resplandor del color de la marca detrás del nombre; nombre centrado en Fraunces liviana; fichas de vidrio para horario y nota; botón principal con brillo; servicios en tarjetas oscuras",
};

/**
 * El pedido que arranca de un prospecto. Lleva lo que Imán encontró y, desde sistema/85, la muestra que el cliente ya vio:
 * su plantilla, sus colores, sus servicios, su horario, sus fotos y lo acordado. La web final parte de ahí, no de cero.
 * `base` es la dirección del estudio (para los enlaces a la muestra y a las fotos).
 */
export function pedidoDesdeProspecto(p: Prospecto, hoy = new Date(), base = "") {
  const { motivos } = puntuar(p, hoy);
  const c = contenidoMuestra(p, hoy);
  const fama = p.estrellas ? `${p.estrellas} estrellas con ${p.resenas} reseñas en Google` : "sin reseñas en Google";
  const web = p.web ? `Su web actual es ${p.web} (${motivos.join(", ").toLowerCase() || "se puede mejorar"}).` : "No tiene web.";
  const id = idMuestra(p);
  const k = c.paleta;
  const deDonde = c.colorOrigen === "cliente" ? "lo eligió el propio negocio en su muestra" : c.colorOrigen === "mano" ? "el color de su marca" : c.colorOrigen === "web" ? "sacado de su web actual" : "todavía no sabemos su color: su muestra va en blanco y negro; pregúntale cuál es el suyo";
  const lineas = [
    `Una web para ${c.nombre}, ${p.rubro} en ${p.ciudad} (${fama}). ${web} Lo encontró Imán en clientes nuevos.`,
    c.nombre !== p.nombre ? `En Google se llama «${p.nombre}».` : "",
    "",
    "PARTE DE SU MUESTRA. El cliente ya vio esta idea y le gustó: la web final debe reconocerse como la misma, mejorada con sus datos reales.",
    base ? `- Muestra: ${base}/m/${id}` : "",
    `- Plantilla «${PLANTILLAS_MUESTRA[c.plantilla].nombre}»: ${ESTRUCTURA[c.plantilla]}.`,
    `- Colores (${deDonde}): marca ${k.bloque}, fondo ${k.fondo}, texto ${k.tinta}, botones ${k.acento}.`,
    `- Servicios que vio (${c.propia ? "algunos salen de su web" : "son de ejemplo: confírmalos con el cliente"}): ${c.servicios.join(", ")}.`,
    `- Horario${c.horarioReal ? " (el de Google)" : " (de ejemplo: pídeselo)"}: ${c.horario.map(([d, h]) => `${d} ${h}`).join("; ")}.`,
    c.direccion ? `- Dirección: ${c.direccion}.` : "",
    p.telefono ? `- WhatsApp y teléfono: ${p.telefono}.` : "",
    p.mapa ? `- Google Maps: ${p.mapa}` : "",
    p.fotos && base ? `- Fotos que subió el cliente (úsalas): ${Array.from({ length: p.fotos }, (_, i) => `${base}/m/${id}/fotos/${i + 1}`).join(" , ")}` : "- Todavía no subió fotos: pídele 3 (fachada o consultorio, él o su equipo, un detalle de su trabajo).",
    `- Acordado: ${precioDe(p, OFERTA.web.precio)} dólares + IVA, una página, ${OFERTA.web.dias} días, ${OFERTA.web.rondas} rondas de cambios.${p.propuesta?.acepto ? " Ya aceptó la propuesta." : ""}`,
    p.notas ? `Notas: ${p.notas}` : "",
  ];
  return lineas.filter((l, i) => l || i === 2).join("\n");
}
