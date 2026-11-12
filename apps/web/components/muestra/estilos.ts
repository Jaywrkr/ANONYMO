// Colores y textos de ejemplo de las muestras (sistema/79), por rubro y por variante.
// Salen de las referencias en Savee (ANONYMO → Muestras Salud, Legal y Belleza) y del espacio «websites» de Jay en MyMind:
// «Sereno» sigue la línea Aesop, Oura y Monist; «Gráfico», la de Obys, Virtu Legal y St Kilda. Patrones, nunca copia.
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";

export interface Paleta {
  fondo: string;
  tinta: string;
  acento: string;
  /** El texto que va encima del acento. */
  sobreAcento: string;
  suave: string;
  texto: string;
  linea: string;
}

export const PALETAS: Record<PlantillaMuestra, Record<Tono, Paleta>> = {
  sereno: {
    salud: { fondo: "#f4f1ec", tinta: "#1d2a2a", acento: "#2f6f68", sobreAcento: "#ffffff", suave: "#e2eae6", texto: "#55625f", linea: "#1d2a2a1f" },
    legal: { fondo: "#efebe3", tinta: "#14201b", acento: "#8a6236", sobreAcento: "#ffffff", suave: "#e0dacd", texto: "#5a5e57", linea: "#14201b1f" },
    belleza: { fondo: "#f7f1ea", tinta: "#2a1f1a", acento: "#a8513b", sobreAcento: "#ffffff", suave: "#efdfd3", texto: "#6d5650", linea: "#2a1f1a1f" },
    otro: { fondo: "#f5f4f0", tinta: "#1a1816", acento: "#3d3a35", sobreAcento: "#ffffff", suave: "#e8e5dd", texto: "#5d5a55", linea: "#1a18161f" },
  },
  grafico: {
    salud: { fondo: "#f6f6f4", tinta: "#111111", acento: "#5b3df5", sobreAcento: "#ffffff", suave: "#ebe8ff", texto: "#55555a", linea: "#11111126" },
    legal: { fondo: "#ecece9", tinta: "#0b0b0d", acento: "#1f1ce0", sobreAcento: "#ffffff", suave: "#dcdcf5", texto: "#4c4c55", linea: "#0b0b0d26" },
    belleza: { fondo: "#0e0d0c", tinta: "#f3ede6", acento: "#ff5a36", sobreAcento: "#0e0d0c", suave: "#1d1a17", texto: "#b7aca2", linea: "#f3ede626" },
    otro: { fondo: "#f2f2ef", tinta: "#0d0d0d", acento: "#e2442a", sobreAcento: "#ffffff", suave: "#f4dbd5", texto: "#55524e", linea: "#0d0d0d26" },
  },
};

/** Una frase grande por rubro: la idea del negocio, en voz del negocio. Va marcada como texto de ejemplo en la barra de arriba. */
export const FRASE: Record<Tono, string> = {
  salud: "Cuidamos cada detalle, desde la primera consulta.",
  legal: "Te explicamos tu caso con claridad, sin letra chica.",
  belleza: "Un momento para ti, hecho con calma y oficio.",
  otro: "Hacemos bien lo que hacemos, y se nota.",
};

export const RAZONES: Record<Tono, [string, string][]> = {
  salud: [["Citas sin esperas", "Eliges el horario desde el celular y te confirmamos por WhatsApp."], ["Te explicamos cada paso", "Antes de empezar sabes qué vamos a hacer, cuánto dura y cuánto cuesta."], ["Seguimiento real", "Después de cada tratamiento te escribimos para saber cómo sigues."]],
  legal: [["Claridad desde el inicio", "En la primera reunión sales sabiendo qué opciones tienes."], ["Costos por adelantado", "Sabes cuánto cuesta tu trámite antes de empezar."], ["Te mantenemos al tanto", "Te avisamos cada avance sin que tengas que preguntar."]],
  belleza: [["Reserva en un minuto", "Escoge tu turno por WhatsApp, sin llamadas."], ["Productos de calidad", "Trabajamos con marcas que cuidan tu piel y tu cabello."], ["Un espacio para ti", "Llegas, te relajas y sales como querías."]],
  otro: [["Atención directa", "Hablas con quien hace el trabajo, sin intermediarios."], ["Respuesta rápida", "Escríbenos por WhatsApp y te contestamos el mismo día."], ["De aquí", "Conocemos la ciudad y a nuestros clientes."]],
};

/** Una línea corta por servicio, para que la lista no quede muda. */
export const DETALLE: Record<Tono, string[]> = {
  salud: ["Revisión completa y plan claro desde el primer día.", "Tratamientos explicados paso a paso.", "Te acompañamos después de cada sesión.", "Elige día y hora desde tu celular."],
  legal: ["Una primera reunión para entender tu caso.", "Documentos en orden y a tiempo.", "Te representamos con criterio y cercanía.", "Agenda en línea, sin llamadas."],
  belleza: ["Hechos a tu medida, con calma.", "Combinaciones pensadas para ti.", "Lo mejor del mes, con precio especial.", "Escoge tu turno en un minuto."],
  otro: ["Lo que mejor sabemos hacer.", "Simple, claro y a tiempo.", "Lo que siempre nos preguntan.", "Escríbenos y te respondemos hoy."],
};

/** Horario de ejemplo: la muestra lo dice como ejemplo hasta tener el real. */
export const HORARIO_EJEMPLO = [["Lunes a viernes", "9:00 – 18:00"], ["Sábado", "9:00 – 13:00"]] as const;

export const iniciales = (n: string) =>
  n.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/i.test(w) && w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || n.slice(0, 1).toUpperCase();
