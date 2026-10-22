// Puntos de partida por rubro: lo que el equipo ya sabe del tipo de cliente, para no empezar de cero.
// Son criterios de oficio, no datos: los agentes los toman como punto de partida y los contrastan con la investigación.

export interface Plantilla {
  id: string;
  nombre: string;
  /** Qué suele necesitar este cliente, en una línea. */
  resumen: string;
  preguntas: string[];
  /** Consejos por agente. "todos" lo leen todos. */
  consejos: Record<string, string[]>;
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: "salud",
    nombre: "Salud y odontología",
    resumen: "Confianza antes que estética: credenciales, explicar el tratamiento y contacto fácil.",
    preguntas: ["¿Qué especialidad y qué formación quieres mostrar?", "¿Tienes fotos de casos con consentimiento firmado?", "¿Cómo agendan hoy tus pacientes?"],
    consejos: {
      todos: ["El paciente llega con miedo o con dudas: explicar qué se siente, cuánto dura y cuánto cuesta baja la ansiedad.", "Nada de fotos de banco: el consultorio real y las personas reales."],
      orla: ["Un solo botón principal (WhatsApp o agendar) siempre a mano en celular.", "Página por tratamiento: qué es, duración, qué se siente, precio desde."],
      rhea: ["Palabras de paciente, no de libro. Nunca prometer 'sin dolor' a secas."],
      vector: ["Datos estructurados Dentist o MedicalBusiness y ficha de Google Business enlazada."],
      prisma: ["Los antes y después deben funcionar con teclado y tener texto alternativo."],
    },
  },
  {
    id: "comida",
    nombre: "Restaurantes y cafés",
    resumen: "Que den ganas de ir hoy: foto del plato, horario, ubicación y reservar o pedir en un toque.",
    preguntas: ["¿Reservas, pedidos a domicilio o solo visitas?", "¿La carta cambia seguido?", "¿Qué plato o momento te define?"],
    consejos: {
      todos: ["Horario, dirección y cómo llegar arriba de todo en celular.", "La carta en texto (no PDF) para que se lea y aparezca en Google."],
      lente: ["Foto del plato con luz natural lateral y del local lleno; evitar mesas vacías."],
      orla: ["Botones directos: reservar, pedir, cómo llegar."],
      faro: ["Series semanales: el plato de la semana, detrás de cocina, el equipo."],
    },
  },
  {
    id: "profesionales",
    nombre: "Abogados, contadores y consultores",
    resumen: "Claridad y autoridad: qué problemas resuelven, para quién, cómo es la primera consulta.",
    preguntas: ["¿Qué tres problemas resuelves más?", "¿Cobras la primera consulta?", "¿Qué casos o clientes puedes mostrar?"],
    consejos: {
      todos: ["Hablar del problema del cliente, no de la ley o la norma.", "Sobrio no es aburrido: tipografía con carácter y mucho espacio."],
      rhea: ["Sin jerga legal ni contable en titulares; ejemplos concretos."],
      orla: ["Página por servicio con 'cómo trabajamos' en pasos y preguntas frecuentes."],
    },
  },
  {
    id: "tienda",
    nombre: "Tiendas y marcas de producto",
    resumen: "El producto es el héroe: fotos, precio claro y comprar o escribir sin fricción.",
    preguntas: ["¿Vendes en línea o por WhatsApp?", "¿Cuántos productos y cada cuánto cambian?", "¿Haces envíos? ¿A dónde?"],
    consejos: {
      todos: ["Precio visible siempre; envío y devoluciones explicados en una línea."],
      lente: ["Fondo y luz consistentes en todas las fotos de producto, más una foto de uso real."],
      vector: ["Datos estructurados Product; imágenes livianas en AVIF y WebP."],
      pulso: ["Medir producto visto → clic en comprar o WhatsApp."],
    },
  },
  {
    id: "espacios",
    nombre: "Arquitectura, interiores e inmobiliarias",
    resumen: "Portafolio que se recorre: proyectos grandes, planos y el proceso de trabajo.",
    preguntas: ["¿Qué proyectos terminados puedes mostrar con fotos profesionales?", "¿Trabajas residencial, comercial o ambos?", "¿Cuál es el rango de inversión de tus clientes?"],
    consejos: {
      todos: ["Las imágenes mandan: pantalla completa, poco texto."],
      lumen: ["Un recorrido 3D o un plano interactivo puede ser la idea central, con versión liviana para celular."],
      orla: ["Proyecto como caso: contexto, reto, solución, antes y después."],
    },
  },
];

export const plantillaPorId = (id?: string) => PLANTILLAS.find((p) => p.id === id);

/** Consejos que ve un agente: los generales y los suyos. */
export const consejosPara = (id: string | undefined, agente: string) => {
  const p = plantillaPorId(id);
  return p ? [...(p.consejos.todos ?? []), ...(p.consejos[agente] ?? [])] : [];
};
