// Colores y textos de ejemplo de las muestras, por rubro y por variante (rehechas en sistema/84).
// La dirección sale de lo que hoy se premia en Awwwards (revisado el 18 nov 2026) y de los tableros de Jay en Savee:
// un marco de color fuerte con un panel redondeado adentro, el nombre enorme, un cielo de color con fichas flotando
// en vez de una foto de banco, y un cierre con el nombre gigante. Patrones, nunca una copia de un sitio.
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";

export interface Paleta {
  /** El papel: el panel donde va el contenido. */
  fondo: string;
  tinta: string;
  /** El color de la marca: el marco en «Color», los detalles en «Sereno». */
  bloque: string;
  sobreBloque: string;
  /** El color que salta: botones y sellos. */
  acento: string;
  sobreAcento: string;
  suave: string;
  texto: string;
  linea: string;
  /** Los tres colores del cielo que hace de imagen mientras el negocio no sube sus fotos. */
  cielo: [string, string, string];
}

export const PALETAS: Record<PlantillaMuestra, Record<Tono, Paleta>> = {
  grafico: {
    salud: { fondo: "#F3FAF7", tinta: "#07302F", bloque: "#0B5D5A", sobreBloque: "#E9FFF8", acento: "#FFD23F", sobreAcento: "#07302F", suave: "#D6F0E7", texto: "#3F5F5C", linea: "#07302F22", cielo: ["#9FF0D2", "#16A39A", "#FFE48A"] },
    legal: { fondo: "#F4F5F8", tinta: "#0F1B38", bloque: "#172B5E", sobreBloque: "#EEF2FF", acento: "#F2B84B", sobreAcento: "#0F1B38", suave: "#DCE2F2", texto: "#47506A", linea: "#0F1B3822", cielo: ["#9DB4FF", "#2B48A8", "#F7D38A"] },
    belleza: { fondo: "#FFF5F1", tinta: "#3A0F23", bloque: "#7A1E46", sobreBloque: "#FFECE6", acento: "#FFB38A", sobreAcento: "#3A0F23", suave: "#FBDDD6", texto: "#6E4553", linea: "#3A0F2322", cielo: ["#FFB7C8", "#C2456F", "#FFD9A8"] },
    otro: { fondo: "#F3F6FB", tinta: "#0B1740", bloque: "#1E3FCF", sobreBloque: "#EEF3FF", acento: "#B9F3C8", sobreAcento: "#0B1740", suave: "#DBE4FA", texto: "#46507A", linea: "#0B174022", cielo: ["#A9C0FF", "#3558E6", "#C9F7D6"] },
  },
  sereno: {
    salud: { fondo: "#F1F5F1", tinta: "#1C2B27", bloque: "#3C6B5C", sobreBloque: "#F1F5F1", acento: "#1C2B27", sobreAcento: "#F1F5F1", suave: "#DFE9E1", texto: "#56665F", linea: "#1C2B2726", cielo: ["#D6E8DA", "#8FBFA9", "#F4E6C3"] },
    legal: { fondo: "#F2F2EE", tinta: "#22241F", bloque: "#5A5B3A", sobreBloque: "#F2F2EE", acento: "#22241F", sobreAcento: "#F2F2EE", suave: "#E3E3D9", texto: "#5E6056", linea: "#22241F26", cielo: ["#DCDAC6", "#A5A680", "#EFE6CF"] },
    belleza: { fondo: "#F8F1EF", tinta: "#30211F", bloque: "#8F4B55", sobreBloque: "#F8F1EF", acento: "#30211F", sobreAcento: "#F8F1EF", suave: "#F0DEDA", texto: "#6C5753", linea: "#30211F26", cielo: ["#F3D2CC", "#D49AA0", "#F7E5D3"] },
    otro: { fondo: "#F0F3F5", tinta: "#1C2328", bloque: "#3D5868", sobreBloque: "#F0F3F5", acento: "#1C2328", sobreAcento: "#F0F3F5", suave: "#DEE5EA", texto: "#55626B", linea: "#1C232826", cielo: ["#CFDDE5", "#93AEBD", "#ECE4D2"] },
  },
};

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
