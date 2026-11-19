// Colores y textos de ejemplo de las muestras, por rubro y por variante (rehechas en sistema/84).
// La dirección sale de lo que hoy se premia en Awwwards (revisado el 18 nov 2026) y de los tableros de Jay en Savee:
// un marco de color fuerte con un panel redondeado adentro, el nombre enorme, un cielo de color con fichas flotando
// en vez de una foto de banco, y un cierre con el nombre gigante. Patrones, nunca una copia de un sitio.
import type { Tono } from "@anonymo/pipeline";

export type { Paleta } from "@anonymo/pipeline";

/** Una frase grande por rubro, en voz del negocio. La franja de arriba dice que los textos son de ejemplo. */
export const FRASE: Record<Tono, string> = {
  salud: "Te atendemos con tiempo, te explicamos todo y te seguimos después.",
  legal: "Sales de la primera reunión sabiendo qué hacer y cuánto cuesta.",
  belleza: "Llegas con una idea y sales mejor de lo que imaginabas.",
  otro: "Hacemos bien nuestro trabajo, y nuestros clientes vuelven.",
};

export const RAZONES: Record<Tono, [string, string][]> = {
  salud: [["Sin esperas", "Eliges el horario desde el celular y te confirmamos por WhatsApp."], ["Todo claro", "Antes de empezar sabes qué vamos a hacer, cuánto dura y cuánto cuesta."], ["Te seguimos", "Después de cada tratamiento te escribimos para saber cómo vas."]],
  legal: [["Hablamos claro", "Sin términos raros: entiendes tu caso desde el primer día."], ["Precio por adelantado", "Sabes cuánto cuesta tu trámite antes de empezar."], ["Siempre al tanto", "Te avisamos cada avance, sin que tengas que preguntar."]],
  belleza: [["Reservas en un minuto", "Escoges tu turno por WhatsApp, sin llamadas."], ["Buenos productos", "Marcas que cuidan tu piel y tu cabello."], ["Tu momento", "Llegas, te relajas y sales como querías."]],
  otro: [["Trato directo", "Hablas con quien hace el trabajo."], ["Respuesta rápida", "Nos escribes por WhatsApp y te contestamos el mismo día."], ["De aquí", "Conocemos la ciudad y a nuestros clientes."]],
};

/** El tamaño del nombre según su largo: uno largo no puede comerse la pantalla. 0 = corto, 1 = medio, 2 = largo. */
export const largoDe = (nombre: string) => (nombre.length > 34 ? 2 : nombre.length > 20 ? 1 : 0);

// Lo que completa la página (sistema/87): cómo se agenda, qué dicen los clientes y las dudas de siempre.
// Todo es texto de ejemplo, y la franja de arriba lo dice.

/** Tres pasos para llegar al negocio, en voz del negocio. */
export const PASOS: Record<Tono, [string, string][]> = {
  salud: [["Nos escribes", "Cuéntanos qué necesitas por WhatsApp. Te respondemos hoy."], ["Eliges tu horario", "Te proponemos día y hora, y tú decides."], ["Te atendemos", "Llegas, te recibimos a tiempo y sales con todo claro."]],
  legal: [["Nos cuentas tu caso", "Por WhatsApp o en una llamada corta, sin compromiso."], ["Te decimos qué hacer", "Un plan claro, con plazos y precio por escrito."], ["Nos encargamos", "Llevamos tu trámite y te avisamos cada avance."]],
  belleza: [["Reservas", "Escoges servicio, día y hora por WhatsApp."], ["Te confirmamos", "Tu turno queda guardado al instante, sin llamadas."], ["Disfrutas", "Llegas, te relajas y sales feliz."]],
  otro: [["Nos escribes", "Cuéntanos qué necesitas por WhatsApp."], ["Te respondemos", "El mismo día, con precio y plazo claros."], ["Lo hacemos", "Bien hecho y a tiempo."]],
};

/** Reseñas de ejemplo: en la web de verdad van las del negocio, traídas de Google. La sección lo dice. */
export const OPINIONES: Record<Tono, [string, string][]> = {
  salud: [["Me explicaron todo con paciencia y salí sin ninguna duda. Se nota que les importa.", "María P."], ["Agendé por WhatsApp en un minuto y me atendieron a la hora exacta.", "Andrés C."], ["Fui con miedo y salí tranquila. Ya no voy a otro lado.", "Gabriela T."]],
  legal: [["Entendí mi caso desde la primera reunión. Nadie me había hablado tan claro.", "Luis M."], ["Me dijeron el precio antes de empezar y lo respetaron hasta el final.", "Carolina V."], ["Me avisaban cada avance sin que yo preguntara. Por fin dormí tranquilo.", "Jorge A."]],
  belleza: [["Salí mejor de lo que imaginaba. Ya tengo mi lugar de siempre.", "Daniela R."], ["Reservé por WhatsApp y me atendieron puntual. El ambiente es otra cosa.", "Mateo S."], ["Se toman su tiempo y se nota en el resultado. Vuelvo cada mes.", "Paula G."]],
  otro: [["Rápidos, claros y cumplieron lo que dijeron. Los recomiendo.", "Carlos E."], ["Me respondieron el mismo día y el trabajo quedó impecable.", "Verónica L."], ["Trato directo y buen precio. Ya van tres veces que vuelvo.", "Diego F."]],
};

/** Las dudas que casi todos tienen antes de escribir. */
export const PREGUNTAS: Record<Tono, [string, string][]> = {
  salud: [["¿Necesito cita?", "Sí, así no esperas. La pides por WhatsApp y te confirmamos al momento."], ["¿Cómo puedo pagar?", "En efectivo, con transferencia o con tarjeta."], ["¿Hay dónde estacionar?", "Sí, hay lugares cerca. Al agendar te mandamos la ubicación exacta."]],
  legal: [["¿La primera reunión tiene costo?", "Te lo decimos antes de agendar, sin sorpresas."], ["¿Atienden en línea?", "Sí. Nos reunimos por videollamada y firmamos lo necesario después."], ["¿Cuánto demora mi trámite?", "Depende del caso. En la primera reunión te damos un plazo realista."]],
  belleza: [["¿Tengo que reservar?", "Mejor sí: así tu turno es tuyo. Si pasas sin reserva, vemos cómo acomodarte."], ["¿Cómo puedo pagar?", "En efectivo, con transferencia o con tarjeta."], ["¿Tienen tarjetas de regalo?", "Sí. Escríbenos y la preparamos para quien tú quieras."]],
  otro: [["¿Cómo pido un presupuesto?", "Escríbenos por WhatsApp con lo que necesitas y te respondemos el mismo día."], ["¿Cómo puedo pagar?", "En efectivo, con transferencia o con tarjeta."], ["¿En qué zonas trabajan?", "En toda la ciudad y sus alrededores."]],
};
