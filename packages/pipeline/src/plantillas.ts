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
  /** Cómo comunica bien este tipo de negocio (sistema/54): tono, códigos visuales, lo que pega y lo genérico. */
  comunica?: { tono: string; codigos: string; pega: string; evitar: string };
  /** Palabras del pedido que delatan el rubro, para reconocerlo aunque nadie lo elija. */
  claves?: RegExp;
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
    comunica: { tono: "Cercano y tranquilizador, con autoridad tranquila: explica sin asustar, nunca frío ni vendedor.", codigos: "Blancos cálidos y neutros con un acento propio (evitar el celeste/turquesa clínico de todos), tipografía editorial o grotesca suave, fotografía real del profesional y del espacio con luz natural, mucho aire.", pega: "La persona detrás (formación, trato, historia), explicar cada tratamiento con qué se siente y cuánto dura, casos reales con consentimiento, agendar en un toque, reseñas reales.", evitar: "Dientes o cruces como ícono, fotos de banco de sonrisas perfectas, celeste hospitalario, 'tu sonrisa en las mejores manos'." },
    claves: /odont|dent|cl[ií]nica|m[eé]dic|doctor|salud|consultorio|psic|fisio|nutri|veterin|ortodonc/i,
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
    comunica: { tono: "Con apetito y personalidad: cuenta la cocina con sabor, sin adjetivos vacíos.", codigos: "Fotografía de producto protagonista con dirección de arte (luz lateral, textura, manos), colores que salen de la comida o del local, tipografía con carácter (incluso display o lettering).", pega: "El plato estrella y el momento que se vive ahí, la gente detrás, horario y ubicación al instante, reservar o pedir en un toque, carta en texto.", evitar: "Fotos de banco de comida, carta en PDF, tipografías script genéricas, pizarras falsas." },
    claves: /restaur|caf[eé]|cafeter|comida|cocina|panad|pasteler|\bbar\b|chef|men[uú]|pizz|helad|brunch/i,
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
    comunica: { tono: "Claro y seguro, sin jerga: habla del problema del cliente con autoridad y calma.", codigos: "Tipografía editorial con carácter, paletas sobrias con un acento, retícula marcada, retratos profesionales reales, mucho espacio en blanco.", pega: "Casos y resultados concretos, para quién es y para quién no, cómo es la primera consulta, la persona detrás.", evitar: "Balanzas, apretones de manos, edificios de vidrio de banco, azul corporativo genérico, 'soluciones integrales'." },
    claves: /abogad|legal|jur[ií]dic|contad|contab|consult|asesor|notar|auditor|financ|seguros/i,
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
    comunica: { tono: "Directo y con deseo: el producto habla, el texto suma detalle útil.", codigos: "Fotografía de producto consistente y una de uso real, grillas limpias, tipografía de marca, precio visible.", pega: "El producto como héroe, detalle de materiales y uso, envío y cambios en una línea, comprar o escribir sin fricción.", evitar: "Banners con descuentos gritones, carruseles automáticos, fotos de proveedor sin editar." },
    claves: /tienda|producto|e-?commerce|ropa|moda|accesori|joy|calzado|cosm[eé]t/i,
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
    comunica: { tono: "Sereno y preciso: deja que las imágenes y el proceso hablen.", codigos: "Imágenes a pantalla completa, retícula arquitectónica, tipografía fina y espaciada, paletas de materiales.", pega: "Proyectos como casos (contexto, reto, solución), planos y detalles, el proceso de trabajo.", evitar: "Renders genéricos, íconos de casa o llave, textos largos encima de las fotos." },
    claves: /arquitect|interior|inmobil|construc|bienes ra[ií]ces|departament|vivienda|dise[nñ]o de interiores/i,
  },
  {
    id: "bienestar",
    nombre: "Belleza, spa, gimnasios y bienestar",
    resumen: "Cómo se siente estar ahí: la experiencia, el resultado y reservar fácil.",
    preguntas: ["¿Qué servicio te trae más clientes?", "¿Cómo reservan hoy?", "¿Tienes fotos del espacio y del equipo?"],
    consejos: { todos: ["Reservar o escribir en un toque, con horarios y precios claros."] },
    comunica: { tono: "Cálido y sensorial, sin exagerar promesas.", codigos: "Fotografía con textura y luz natural, paletas de materiales (piel, piedra, lino), tipografía elegante con mucho aire, movimiento lento.", pega: "La experiencia paso a paso, el equipo, resultados reales, paquetes claros.", evitar: "Piedras con orquídeas de banco, cuerpos perfectos de stock, rosados y dorados por defecto." },
    claves: /spa|belleza|est[eé]tica|peluquer|barber|u[nñ]as|gimnas|gym|yoga|pilates|bienestar|masaj|crossfit/i,
  },
  {
    id: "tecnologia",
    nombre: "Tecnología, software y servicios TI",
    resumen: "Qué problema resuelve y cómo se ve funcionando, con pruebas.",
    preguntas: ["¿Qué problema resuelves y para quién?", "¿Tienes capturas o demo del producto?", "¿Qué clientes o resultados puedes mostrar?"],
    consejos: { todos: ["Mostrar el producto o el servicio funcionando vale más que cualquier ilustración."] },
    comunica: { tono: "Claro, seguro y sin humo: beneficios concretos y números reales.", codigos: "Interfaces reales bien presentadas, tipografía grotesca precisa, oscuro o claro con un acento eléctrico propio, diagramas limpios, microinteracciones.", pega: "El problema y el antes/después, demo o capturas reales, logos de clientes y casos con números, precios o cómo empezar.", evitar: "Globos terráqueos, circuitos, candados, hombres en traje señalando pantallas, 'transformación digital' sin explicar." },
    claves: /software|tecnolog|\bti\b|\bapps?\b|saas|startup|ciberseg|\bcloud\b|inteligencia artificial/i,
  },
  {
    id: "educacion",
    nombre: "Educación, cursos y academias",
    resumen: "Qué vas a lograr, cómo es aprender ahí y cómo inscribirte.",
    preguntas: ["¿Qué logra un estudiante al terminar?", "¿Modalidad presencial o en línea?", "¿Testimonios o resultados de alumnos?"],
    consejos: { todos: ["Programa, fechas, precio e inscripción claros."] },
    comunica: { tono: "Motivador y claro, sin infantilizar.", codigos: "Fotos reales de clases y alumnos, tipografía amigable con estructura, color con energía, información ordenada.", pega: "Resultados de alumnos, el docente, el programa paso a paso, próximas fechas.", evitar: "Birretes, lápices y libros como íconos, fotos de banco de estudiantes sonriendo a la cámara." },
    claves: /curso|academ|escuela|colegio|educa|capacitac|clases|taller|universidad|tutor/i,
  },
  {
    id: "turismo",
    nombre: "Hoteles, turismo y experiencias",
    resumen: "Que den ganas de estar ahí: lugar, experiencia y reservar.",
    preguntas: ["¿Qué hace única la experiencia?", "¿Cómo reservan hoy?", "¿Tienes fotos profesionales del lugar?"],
    consejos: { todos: ["Reserva directa visible y en el idioma del visitante."] },
    comunica: { tono: "Evocador y concreto: el lugar, la gente y el momento.", codigos: "Fotografía inmersiva a pantalla completa, tipografía editorial, colores del entorno, video corto.", pega: "El lugar y su historia, la experiencia día a día, ubicación y cómo llegar, reseñas reales, reservar directo.", evitar: "Fotos de banco de playas genéricas, collage de fotos chicas, 'un paraíso por descubrir'." },
    claves: /hotel|hostal|turis|viaje|\btours?\b|hospedaje|glamping|airbnb|resort/i,
  },
  {
    id: "creativos",
    nombre: "Fotógrafos, artistas, músicos y estudios creativos",
    resumen: "El trabajo manda: portafolio con criterio y una voz propia.",
    preguntas: ["¿Qué trabajos te representan mejor?", "¿Qué tipo de cliente o encargo buscas?", "¿Cómo te contratan hoy?"],
    consejos: { todos: ["Pocas piezas excelentes mejor que muchas regulares."] },
    comunica: { tono: "Con personalidad y sin pedir permiso: la voz del autor.", codigos: "Portafolio con curaduría, layouts libres y experimentales, tipografía expresiva, interacción con intención.", pega: "Proyectos como historias, la persona detrás, cómo trabajar juntos.", evitar: "Plantillas de portafolio en grilla uniforme, sliders, textos de 'apasionado por la creatividad'." },
    claves: /fot[oó]graf|artista|m[uú]sic|banda|estudio creativo|ilustrad|dise[nñ]ador|cine|productora|galer/i,
  },
  {
    id: "eventos",
    nombre: "Eventos, bodas y celebraciones",
    resumen: "Qué se vive, cómo se organiza y cómo cotizar.",
    preguntas: ["¿Qué tipo de eventos haces más?", "¿Qué incluye tu servicio?", "¿Tienes fotos y videos de eventos reales?"],
    consejos: { todos: ["Cotizar o agendar una llamada en un toque."] },
    comunica: { tono: "Emotivo pero preciso: la emoción del día y la tranquilidad de que todo está resuelto.", codigos: "Fotografía y video reales con color cuidado, tipografía editorial, ritmo de revista.", pega: "Eventos reales contados como historias, el proceso, qué incluye, testimonios.", evitar: "Anillos y corazones como íconos, scripts recargados, fotos de banco de novias." },
    claves: /evento|boda|matrimon|wedding|fiesta|celebrac|catering|planner/i,
  },
];

export const plantillaPorId = (id?: string) => PLANTILLAS.find((p) => p.id === id);

/** El rubro del pedido: el elegido o, si nadie lo eligió, el que delatan sus palabras (sistema/54). */
export function rubroDe(pedido: { plantilla?: string; cliente?: string; descripcion?: string; contexto?: unknown }): string | undefined {
  if (plantillaPorId(pedido.plantilla)) return pedido.plantilla;
  const texto = [pedido.cliente, pedido.descripcion, JSON.stringify(pedido.contexto ?? {})].join(" ");
  return PLANTILLAS.find((p) => p.claves?.test(texto))?.id;
}

/** Consejos que ve un agente: los generales y los suyos. */
export const consejosPara = (id: string | undefined, agente: string) => {
  const p = plantillaPorId(id);
  return p ? [...(p.consejos.todos ?? []), ...(p.consejos[agente] ?? [])] : [];
};
