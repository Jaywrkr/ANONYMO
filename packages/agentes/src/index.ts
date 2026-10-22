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
  /** Color para texto sobre fondo claro cuando la sombra no llega a contraste 4.5:1. */
  texto?: string;
}

export const AREAS: Record<AreaId, Area> = {
  mando: { id: "mando", nombre: "Mando", luz: "#f2efff", medio: "#9c8cff", sombra: "#3b23c9", acento: "#ff9fd2" },
  estrategia: { id: "estrategia", nombre: "Estrategia", luz: "#f3ffd6", medio: "#8fe07e", sombra: "#0e7f61", acento: "#5ad6ff" },
  marca: { id: "marca", nombre: "Marca", luz: "#fff1d6", medio: "#ff8a4c", sombra: "#c3221c", acento: "#ff5fa2" },
  producto: { id: "producto", nombre: "Producto digital", luz: "#e4f7ff", medio: "#5fb4ff", sombra: "#1636d9", acento: "#a17bff" },
  comunicacion: { id: "comunicacion", nombre: "Comunicación", luz: "#ffe7f3", medio: "#ff6fb1", sombra: "#a3105c", acento: "#ffb347" },
  crecimiento: { id: "crecimiento", nombre: "Crecimiento", luz: "#fffbe3", medio: "#ffd43d", sombra: "#d98a00", acento: "#fff08a", texto: "#8a5a00" },
};

/** Objeto 3D pequeño que distingue a cada agente por su oficio. */
export type Prop =
  | "auricular" | "visera" | "estrella" | "lupa" | "globo" | "boina" | "lapiz" | "escuadra"
  | "lentes3d" | "laptop" | "estela" | "audifonos" | "portapapeles" | "cronometro" | "faro"
  | "telefono" | "camara" | "claqueta" | "gorro" | "iman" | "laurel" | "pulso";

/** Tonos propios para que agentes de la misma área no se confundan. */
export type Tono = Pick<Area, "luz" | "medio" | "sombra" | "acento">;

export interface Agente {
  tono?: Tono;
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
  { id: "orla", tono: { luz: "#e6f3ff", medio: "#4f8dff", sombra: "#1b2fb8", acento: "#7cf0ff" }, nombre: "Orla", area: "producto", rol: "Diseño UI", caracter: "Obsesiva con el ritmo y la tipografía.", adn: "Tipografía de Obys + movimiento de Locomotive + experimentación de Resn", superpoder: "Hace que el scroll se sienta bien.", frase: "El espacio vacío también diseña.", prop: "escuadra", propNombre: "Escuadra" },
  { id: "lumen", tono: { luz: "#e9fbff", medio: "#3fd0e6", sombra: "#4b2fd6", acento: "#c58bff" }, nombre: "Lumen", area: "producto", rol: "WebGL y 3D", caracter: "Soñador técnico.", adn: "Lusion + Active Theory + Bruno Simon", superpoder: "Convierte una idea en un mundo que se toca.", frase: "Si se puede imaginar, se puede renderizar.", prop: "lentes3d", propNombre: "Lentes 3D" },
  { id: "vector", tono: { luz: "#e3fbf6", medio: "#2fb5b0", sombra: "#0b4f7a", acento: "#7cffd6" }, nombre: "Vector", area: "producto", rol: "Front-end", caracter: "Práctico, cero drama.", adn: "Código de Active Theory + obsesión por rendimiento de Vercel", superpoder: "Webs que cargan en menos de un segundo.", frase: "Bonito y rápido, o no sale.", prop: "laptop", propNombre: "Laptop" },
  { id: "kine", tono: { luz: "#eef0ff", medio: "#6a7dff", sombra: "#2a1f9c", acento: "#ff9ad5" }, nombre: "Kine", area: "producto", rol: "Motion", caracter: "Inquieto. Nunca está quieto.", adn: "Buck + ManvsMachine", superpoder: "Le da vida a cualquier cosa.", frase: "Todo se mueve por una razón.", prop: "estela", propNombre: "Estela de movimiento" },
  { id: "eco", tono: { luz: "#f3ecff", medio: "#8a6bff", sombra: "#3a1f8f", acento: "#ff7ab8" }, nombre: "Eco", area: "producto", rol: "Sonido", caracter: "Escucha antes de hablar.", adn: "Antfood + diseño sonoro de videojuegos", superpoder: "Marcas que se reconocen con los ojos cerrados.", frase: "El silencio también es un sonido.", prop: "audifonos", propNombre: "Audífonos" },
  { id: "prisma", tono: { luz: "#eef3ff", medio: "#7aa2ff", sombra: "#2342a8", acento: "#c9f2ff" }, nombre: "Prisma", area: "producto", rol: "Calidad y SEO", caracter: "La más estricta, y la más querida.", adn: "Auditor de rendimiento + estándares de accesibilidad", superpoder: "Encuentra el error antes que el cliente.", frase: "Si no funciona para todos, no funciona.", prop: "portapapeles", propNombre: "Portapapeles" },
  { id: "tempo", tono: { luz: "#e8f7ff", medio: "#56a8d8", sombra: "#0f3d66", acento: "#ffd36e" }, nombre: "Tempo", area: "producto", rol: "Producción", caracter: "Ordenado y puntual.", adn: "Productor senior de estudio digital", superpoder: "Convierte el caos en calendario.", frase: "Una fecha es una promesa.", prop: "cronometro", propNombre: "Cronómetro" },
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

/** Lo que recibe un cliente en cada fase. Duraciones típicas: propuesta para que Jay y Luna ajusten. */
export const SERVICIO: Record<number, { entrega: string[]; dura: string }> = {
  1: { entrega: ["Brief de marca", "Plan por fases", "Presupuesto"], dura: "3 a 5 días" },
  2: { entrega: ["Nombre", "Dominios reservados", "Chequeo de redes y marca"], dura: "1 semana" },
  3: { entrega: ["Logo y sistema visual", "Tono de voz", "Logo animado y sonoro"], dura: "2 semanas" },
  4: { entrega: ["Diseño de la web", "Desarrollo y 3D", "Web publicada"], dura: "3 a 5 semanas" },
  5: { entrega: ["Plan de contenido", "Shooting y video", "Evento de lanzamiento"], dura: "2 a 3 semanas" },
  6: { entrega: ["Informe de calidad", "Postulación a premios", "Tablero de métricas"], dura: "1 semana" },
  7: { entrega: ["Lectura de resultados", "Siguiente paso", "Mantenimiento"], dura: "Continuo" },
};

/** Qué fases despierta cada tipo de pedido en el formulario de contacto. */
export type TipoPedido = "web" | "marca" | "lanzamiento" | "todo";
export const PEDIDOS: Record<TipoPedido, { nombre: string; fases: number[] }> = {
  web: { nombre: "Una web", fases: [1, 4, 6] },
  marca: { nombre: "Una marca", fases: [1, 2, 3] },
  lanzamiento: { nombre: "Un lanzamiento", fases: [1, 5, 6] },
  todo: { nombre: "Todo, desde cero", fases: [1, 2, 3, 4, 5, 6, 7] },
};

/** Quién aprueba cada fase por defecto: Jay producto y números, Luna marca y comunicación. Cada proyecto puede cambiarlo. */
export type Socio = "jay" | "luna";
export const RESPONSABLE_FASE: Record<number, Socio> = { 1: "jay", 2: "luna", 3: "luna", 4: "jay", 5: "luna", 6: "jay", 7: "jay" };
export const NOMBRE_SOCIO: Record<Socio, string> = { jay: "Jay", luna: "Luna" };
export * from "./en.ts";
