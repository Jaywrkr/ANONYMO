// Colores y textos de ejemplo de las muestras, por rubro y por variante (rehechas en sistema/84).
// La dirección sale de lo que hoy se premia en Awwwards (revisado el 18 nov 2026) y de los tableros de Jay en Savee:
// un marco de color fuerte con un panel redondeado adentro, el nombre enorme, un cielo de color con fichas flotando
// en vez de una foto de banco, y un cierre con el nombre gigante. Patrones, nunca una copia de un sitio.
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";

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

/** La letra de los titulares de cada plantilla (sistema/87): cada una tiene la suya, para que las cinco no se parezcan. */
export const TITULAR: Record<PlantillaMuestra, { fontFamily: string; fontVariationSettings?: string; fontWeight?: number; textTransform?: "uppercase" }> = {
  grafico: { fontFamily: "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif", fontVariationSettings: "'wdth' 88" },
  sereno: { fontFamily: "'Fraunces Variable', Georgia, serif", fontVariationSettings: "'SOFT' 100", fontWeight: 340 },
  mosaico: { fontFamily: "'Sora Variable', 'Helvetica Neue', Arial, sans-serif" },
  revista: { fontFamily: "'Big Shoulders Display Variable', 'Arial Narrow', Arial, sans-serif", textTransform: "uppercase" },
  noche: { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 },
};
