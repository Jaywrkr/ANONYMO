// Fuente única del equipo: la usan la web del cliente y, más adelante, el pipeline.

export type AreaId = "mando" | "estrategia" | "marca" | "producto" | "comunicacion" | "crecimiento";

export interface Area {
  id: AreaId;
  nombre: string;
  /** Degradado de la esfera: luz, medio, sombra, y un acento que fluye encima. */
  luz: string;
  medio: string;
  sombra: string;
  acento: string;
}

export const AREAS: Record<AreaId, Area> = {
  mando: { id: "mando", nombre: "Mando", luz: "#f2efff", medio: "#9c8cff", sombra: "#3b23c9", acento: "#ff9fd2" },
  estrategia: { id: "estrategia", nombre: "Estrategia", luz: "#f3ffd6", medio: "#8fe07e", sombra: "#0e7f61", acento: "#5ad6ff" },
  marca: { id: "marca", nombre: "Marca", luz: "#fff1d6", medio: "#ff8a4c", sombra: "#c3221c", acento: "#ff5fa2" },
  producto: { id: "producto", nombre: "Producto digital", luz: "#e4f7ff", medio: "#5fb4ff", sombra: "#1636d9", acento: "#a17bff" },
  comunicacion: { id: "comunicacion", nombre: "Comunicación", luz: "#ffe7f3", medio: "#ff6fb1", sombra: "#a3105c", acento: "#ffb347" },
  crecimiento: { id: "crecimiento", nombre: "Crecimiento", luz: "#fffadf", medio: "#ffcb3d", sombra: "#d26300", acento: "#ff6a3d" },
};

/** Objeto 3D pequeño que distingue a cada agente por su oficio. */
export type Prop =
  | "auricular" | "visera" | "estrella" | "lupa" | "globo" | "boina" | "lapiz" | "escuadra"
  | "lentes3d" | "llaves" | "estela" | "audifonos" | "portapapeles" | "cronometro" | "faro"
  | "telefono" | "camara" | "claqueta" | "gorro" | "iman" | "laurel" | "pulso";

export interface Agente {
  id: string;
  nombre: string;
  area: AreaId;
  rol: string;
  caracter: string;
  adn: string;
  superpoder: string;
  frase: string;
  prop: Prop;
  propNombre: string;
}

export const AGENTES: Agente[] = [
  { id: "atlas", nombre: "Atlas", area: "mando", rol: "Orquestador", caracter: "Calmado. Ve todo el tablero y nunca corre.", adn: "Estrategia de McKinsey + ritmo de productor de Pixar", superpoder: "Decide quién hace qué en segundos.", frase: "Primero el plan, después el ruido.", prop: "auricular", propNombre: "Auricular con micrófono" },
  { id: "ledger", nombre: "Ledger", area: "mando", rol: "Operaciones y finanzas", caracter: "Tranquilo y preciso. Dice que no con cariño.", adn: "CFO de estudio boutique + rigor de operaciones", superpoder: "Sabe si un proyecto deja plata antes de empezar.", frase: "Si no deja margen, no es proyecto.", prop: "visera", propNombre: "Visera de contador" },
  { id: "nova", nombre: "Nova", area: "estrategia", rol: "Estrategia de marca", caracter: "Curiosa. Hace las preguntas incómodas.", adn: "Claridad de Collins + olfato cultural de Mother London", superpoder: "Resume una marca en una frase.", frase: "¿Por qué alguien te elegiría a ti?", prop: "estrella", propNombre: "Estrella polar" },
  { id: "sonda", nombre: "Sonda", area: "estrategia", rol: "Research", caracter: "Detective silencioso.", adn: "Métodos de IDEO + análisis de consultora", superpoder: "Encuentra el dato que nadie buscó.", frase: "Los datos primero, la opinión después.", prop: "lupa", propNombre: "Lupa" },
  { id: "verba", nombre: "Verba", area: "marca", rol: "Naming", caracter: "Juguetona. Piensa en voz alta.", adn: "Lexicon Branding + irreverencia de Liquid Death", superpoder: "Cien nombres antes del desayuno.", frase: "Si no se dice en voz alta, no sirve.", prop: "globo", propNombre: "Globo de diálogo" },
  { id: "mira", nombre: "Mira", area: "marca", rol: "Identidad y logo", caracter: "Exigente. Mira todo con lupa.", adn: "Rigor de Pentagram + audacia de Sagmeister & Walsh", superpoder: "Logos que funcionan en 16 px y en un edificio.", frase: "Menos, pero mejor hecho.", prop: "boina", propNombre: "Boina" },
  { id: "rhea", nombre: "Rhea", area: "marca", rol: "Copy y tono", caracter: "Ingeniosa y directa.", adn: "Wieden+Kennedy + ingenio de Droga5", superpoder: "Frases que se quedan en la cabeza.", frase: "Dilo una vez y bien.", prop: "lapiz", propNombre: "Lápiz" },
  { id: "orla", nombre: "Orla", area: "producto", rol: "Diseño UI", caracter: "Obsesiva con el ritmo y la tipografía.", adn: "Tipografía de Obys + movimiento de Locomotive + experimentación de Resn", superpoder: "Hace que el scroll se sienta bien.", frase: "El espacio vacío también diseña.", prop: "escuadra", propNombre: "Escuadra" },
  { id: "lumen", nombre: "Lumen", area: "producto", rol: "WebGL y 3D", caracter: "Soñador técnico.", adn: "Lusion + Active Theory + Bruno Simon", superpoder: "Convierte una idea en un mundo que se toca.", frase: "Si se puede imaginar, se puede renderizar.", prop: "lentes3d", propNombre: "Lentes 3D" },
  { id: "vector", nombre: "Vector", area: "producto", rol: "Front-end", caracter: "Práctico, cero drama.", adn: "Código de Active Theory + obsesión por rendimiento de Vercel", superpoder: "Webs que cargan en menos de un segundo.", frase: "Bonito y rápido, o no sale.", prop: "llaves", propNombre: "Llaves de código { }" },
  { id: "kine", nombre: "Kine", area: "producto", rol: "Motion", caracter: "Inquieto. Nunca está quieto.", adn: "Buck + ManvsMachine", superpoder: "Le da vida a cualquier cosa.", frase: "Todo se mueve por una razón.", prop: "estela", propNombre: "Estela de movimiento" },
  { id: "eco", nombre: "Eco", area: "producto", rol: "Sonido", caracter: "Escucha antes de hablar.", adn: "Antfood + diseño sonoro de videojuegos", superpoder: "Marcas que se reconocen con los ojos cerrados.", frase: "El silencio también es un sonido.", prop: "audifonos", propNombre: "Audífonos" },
  { id: "prisma", nombre: "Prisma", area: "producto", rol: "Calidad y SEO", caracter: "La más estricta, y la más querida.", adn: "Auditor de rendimiento + estándares de accesibilidad", superpoder: "Encuentra el error antes que el cliente.", frase: "Si no funciona para todos, no funciona.", prop: "portapapeles", propNombre: "Portapapeles" },
  { id: "tempo", nombre: "Tempo", area: "producto", rol: "Producción", caracter: "Ordenado y puntual.", adn: "Productor senior de estudio digital", superpoder: "Convierte el caos en calendario.", frase: "Una fecha es una promesa.", prop: "cronometro", propNombre: "Cronómetro" },
  { id: "faro", nombre: "Faro", area: "comunicacion", rol: "Contenido", caracter: "Estratégico. Piensa en series.", adn: "Mother London + el sistema de series de @jaywrkr", superpoder: "Sabe qué publicar el próximo martes.", frase: "La constancia le gana al talento.", prop: "faro", propNombre: "Linterna de faro" },
  { id: "chispa", nombre: "Chispa", area: "comunicacion", rol: "Community", caracter: "Rápida, graciosa, cercana.", adn: "Humor de Duolingo + cercanía de Glossier", superpoder: "Responde como persona, no como marca.", frase: "¿Cómo sería esto más divertido?", prop: "telefono", propNombre: "Teléfono" },
  { id: "lente", nombre: "Lente", area: "comunicacion", rol: "Foto y shootings", caracter: "Observa la luz antes que nada.", adn: "Lo editorial de Kinfolk + la energía de las campañas de Nike", superpoder: "El moodboard exacto para cada shooting.", frase: "La foto se hace antes de disparar.", prop: "camara", propNombre: "Cámara" },
  { id: "corte", nombre: "Corte", area: "comunicacion", rol: "Video", caracter: "Ritmo puro.", adn: "Editor de campañas + ritmo de reels", superpoder: "Tres segundos que enganchan.", frase: "Si aburre, se corta.", prop: "claqueta", propNombre: "Claqueta" },
  { id: "escena", nombre: "Escena", area: "comunicacion", rol: "Eventos", caracter: "Anfitriona. Piensa en la gente.", adn: "Productoras de experiencias de marca", superpoder: "Momentos que la gente graba.", frase: "La gente recuerda cómo se sintió.", prop: "gorro", propNombre: "Gorro de fiesta" },
  { id: "iman", nombre: "Imán", area: "crecimiento", rol: "Ventas", caracter: "Escucha más de lo que habla.", adn: "Los principios de Ogilvy aplicados a propuestas", superpoder: "Propuestas que se firman.", frase: "Vende el resultado, no la hora.", prop: "iman", propNombre: "Imán" },
  { id: "trofeo", nombre: "Trofeo", area: "crecimiento", rol: "Premios", caracter: "Competitivo, con paciencia.", adn: "Jurados de Awwwards, FWA y Cannes Lions", superpoder: "Sabe qué mira un jurado.", frase: "Punto de vista antes que tendencias.", prop: "laurel", propNombre: "Corona de laurel" },
  { id: "pulso", nombre: "Pulso", area: "crecimiento", rol: "Datos", caracter: "Frío con los números, cálido con la gente.", adn: "Analista de growth", superpoder: "Dice qué funciona en una línea.", frase: "Lo que no se mide, se adivina.", prop: "pulso", propNombre: "Monitor de pulso" },
];

export const agentePorId = (id: string) => AGENTES.find((a) => a.id === id);

export interface Fase {
  n: number;
  nombre: string;
  objetivo: string;
  agentes: string[];
}

/** Flujo genérico: el mismo para la agencia y para cada cliente. */
export const FASES: Fase[] = [
  { n: 1, nombre: "Arranque", objetivo: "Entender el pedido, poner precio y plan.", agentes: ["atlas", "ledger", "sonda", "nova"] },
  { n: 2, nombre: "Naming", objetivo: "Nombre, dominios, redes y marca registrada.", agentes: ["verba", "rhea", "sonda"] },
  { n: 3, nombre: "Identidad", objetivo: "Logo, tono, movimiento y sonido.", agentes: ["mira", "rhea", "kine", "eco"] },
  { n: 4, nombre: "Web", objetivo: "Diseñar y construir.", agentes: ["orla", "lumen", "vector", "kine", "eco", "tempo"] },
  { n: 5, nombre: "Lanzamiento", objetivo: "Contenido, foto, video y evento.", agentes: ["faro", "chispa", "lente", "corte", "escena"] },
  { n: 6, nombre: "Jurado", objetivo: "Calidad, premios y métricas.", agentes: ["prisma", "trofeo", "pulso"] },
  { n: 7, nombre: "Crecimiento", objetivo: "Propuesta, paquetes y próximo cliente.", agentes: ["iman", "ledger", "atlas"] },
];
