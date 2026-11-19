// El asistente de demostración de la muestra (sistema/87): contesta con lo que ya se sabe del negocio (horario, dirección,
// servicios) y reconoce cuándo alguien quiere una cita. No usa inteligencia artificial ni cuesta nada: son reglas.
// Sirve para que el dueño pruebe cómo sería tener uno en su web. No da diagnósticos ni consejos legales.
// Este archivo no importa nada de Node: lo usa el navegador.
import type { ContenidoMuestra } from "./muestra.ts";

/** Cuántas preguntas se pueden hacer en una visita. */
export const TOPE_DEMO = 10;

export type TemaDemo = "cita" | "consejo" | "horario" | "lugar" | "precio" | "servicio" | "contacto" | "saludo" | "otro";

export interface RespuestaDemo {
  tema: TemaDemo;
  /** Lo que el asistente le contesta al cliente. */
  texto: string;
  /** Una explicación para el dueño, que es quien está probando. */
  nota?: string;
  /** El aviso que le llegaría al dueño por WhatsApp (cuando alguien quiere algo). */
  aviso?: string;
  /** Un enlace útil (el mapa). */
  enlace?: { texto: string; url: string };
}

export const PREGUNTAS_DEMO = ["¿Qué horario tienen?", "¿Dónde quedan?", "¿Qué servicios tienen?", "Quiero una cita"];

const plano = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const recortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

const CITA = /\b(cita|citas|agendar|agenda|agendo|turno|turnos|reservar|reserva|reservo|separar|quiero ir|me atiendan|atenderme|cupo|disponibilidad)\b/;
const CONSEJO: Record<string, RegExp> = {
  salud: /\b(duele|dolor|sintoma|sintomas|que tomo|que me tomo|pastilla|medicina|medicamento|receta|diagnostico|es grave|infeccion|sangra|sangrado|hinchado|fiebre|es normal)\b/,
  legal: /\b(demandar|demanda|me pueden|es legal|es ilegal|juicio|preso|carcel|denunciar|denuncia|que hago si|tengo derecho|me despidieron|divorciar|herencia)\b/,
};
const HORARIO = /\b(horario|horarios|hora|horas|abren|abre|abierto|abiertos|cierran|cierra|atienden|sabado|sabados|domingo|domingos|feriado|hoy|manana)\b/;
const LUGAR = /\b(donde|direccion|ubicacion|ubicados|ubicado|llegar|llego|queda|quedan|mapa|parqueadero|parquear|sector|calle)\b/;
const PRECIO = /\b(precio|precios|cuesta|cuestan|cuanto|vale|valen|costo|costos|tarifa|tarifas|cobran|cobra|barato|caro)\b/;
const SERVICIO = /\b(servicio|servicios|hacen|ofrecen|tratamiento|tratamientos|trabajan|especialidad|especialidades|que tienen)\b/;
const CONTACTO = /\b(telefono|llamar|llamo|numero|celular|whatsapp|contacto|correo)\b/;
const SALUDO = /^(hola|holi|buenas|buenos dias|buen dia|buenas tardes|buenas noches|que tal|saludos)\b/;

const quien = (c: ContenidoMuestra) => (c.tono === "legal" ? "el abogado o la abogada" : "el profesional");

/** Lo que contesta el asistente de la muestra a una pregunta. Siempre contesta algo, y nunca inventa datos del negocio. */
export function responderDemo(c: ContenidoMuestra, pregunta: string): RespuestaDemo {
  const t = plano(pregunta);
  const horario = c.horario.map(([d, h]) => `${d}: ${h}`).join("\n");

  if (CITA.test(t)) {
    return {
      tema: "cita",
      texto: `Con gusto. Le paso tu pedido a ${c.nombre} ahora mismo y te escriben por WhatsApp para confirmar el día y la hora.`,
      aviso: `Nuevo interesado desde tu web. Quiere agendar. Escribió: «${recortar(pregunta.trim(), 90)}»`,
      nota: "Así te enteras al instante de quién quiere algo, aunque estés atendiendo.",
    };
  }
  const consejo = CONSEJO[c.tono];
  if (consejo?.test(t)) {
    return {
      tema: "consejo",
      texto: `Eso lo tiene que ver ${quien(c)} en persona: yo no doy ${c.tono === "legal" ? "consejos legales" : "diagnósticos"}. Si quieres, te ayudo a agendar una cita.`,
      nota: "El asistente nunca opina de salud ni de leyes. Manda a la persona contigo.",
    };
  }
  // Un servicio nombrado: se contesta con su detalle.
  const i = c.servicios.findIndex((s) => plano(s).split(" ").some((p) => p.length > 4 && t.includes(p)));
  if (i >= 0 && !PRECIO.test(t)) {
    return { tema: "servicio", texto: `${c.servicios[i]}: ${c.detalles[i] || "sí lo hacemos."} ¿Quieres que te ayude a agendar?` };
  }
  if (PRECIO.test(t)) {
    return {
      tema: "precio",
      texto: `Depende de lo que necesites. ${c.nombre} te dice el valor exacto antes de empezar. ¿Qué servicio te interesa? Tenemos: ${c.servicios.join(", ")}.`,
      nota: "En tu web tú le enseñas tus precios y él contesta con ellos.",
    };
  }
  if (HORARIO.test(t)) {
    return { tema: "horario", texto: `${c.hoy === "Cerrado" ? "Hoy no atendemos." : `Hoy atendemos de ${c.hoy}.`}\n${horario}` };
  }
  if (LUGAR.test(t)) {
    return {
      tema: "lugar",
      texto: c.direccion ? `Estamos en ${c.direccion}.` : `Estamos en ${c.ciudad}. Escríbenos y te mandamos la ubicación.`,
      enlace: c.mapa ? { texto: "Abrir en Google Maps", url: c.mapa } : undefined,
    };
  }
  if (SERVICIO.test(t)) {
    return { tema: "servicio", texto: `Esto es lo que hacemos: ${c.servicios.join(", ")}. Pregúntame por cualquiera.` };
  }
  if (CONTACTO.test(t)) {
    return { tema: "contacto", texto: c.telefono ? `Nos puedes llamar o escribir al ${c.telefono}.` : "Escríbenos por WhatsApp con el botón de la página y te contestamos." };
  }
  if (SALUDO.test(t)) {
    return { tema: "saludo", texto: `¡Hola! Soy el asistente de ${c.nombre}. Pregúntame por el horario, los servicios, cómo llegar, o dime si quieres una cita.` };
  }
  return {
    tema: "otro",
    texto: `Eso todavía no lo sé. Le paso tu pregunta a ${c.nombre} y te contestan por WhatsApp.`,
    nota: "La pregunta te llega a ti. La contestas una vez y el asistente ya la sabe para la próxima persona.",
  };
}
