// La portada de la agencia (sistema/93): textos y trabajos en español e inglés.
// ANONYMO es una agencia creativa de dos personas. La IA es apoyo: se nombra una sola vez, en «Cómo trabajamos».
import { OFERTA } from "@anonymo/pipeline";
import type { Idioma } from "./idioma";

/** Precio de un proyecto a medida: desde aquí. Si cambia, se cambia aquí. */
export const DESDE_A_MEDIDA = 900;

export interface Trabajo {
  id: string;
  nombre: string;
  tipo: string;
  texto: string;
  /** Archivo en public/trabajo. Sin imagen, la pieza se muestra solo con su nombre. */
  imagen?: string;
  enlaces?: { texto: string; href: string }[];
}

const AWWWARDS = [
  { texto: "Minervo", href: "https://www.awwwards.com/sites/minervo" },
  { texto: "JAYWRKR V3", href: "https://www.awwwards.com/sites/jaywrkr-v3" },
  { texto: "m|nero studio", href: "https://www.awwwards.com/sites/m-nero-studio" },
];

const TRABAJOS: Record<Idioma, Trabajo[]> = {
  es: [
    { id: "awwwards", nombre: "3 menciones de honor en Awwwards", tipo: "Webs", texto: "Tres webs de Jay con Minervo reconocidas por el jurado de Awwwards.", enlaces: AWWWARDS },
    { id: "minervo", nombre: "minərvo.studio", tipo: "Web y marca", texto: "Web de un estudio de experiencias de marca. Las formas se tocan y cada una suena.", imagen: "minervo", enlaces: [{ texto: "minervoweb.vercel.app", href: "https://minervoweb.vercel.app" }] },
    { id: "jay", nombre: "Jay es ___", tipo: "Web personal", texto: "Seis formas de ver a la misma persona, en español e inglés.", imagen: "jay", enlaces: [{ texto: "jayjaramillo.vercel.app", href: "https://jayjaramillo.vercel.app" }] },
    { id: "terreno", nombre: "A Todo Terreno", tipo: "Web para evento", texto: "Web de una convención con registro de asistentes y panel para los organizadores.", imagen: "terreno" },
    { id: "coresolutions", nombre: "Coresolutions", tipo: "Web corporativa", texto: "Web de una empresa de infraestructura, nube y ciberseguridad.", imagen: "coresolutions", enlaces: [{ texto: "coresolutions-web.vercel.app", href: "https://coresolutions-web.vercel.app" }] },
    { id: "ankla", nombre: "ANKLA", tipo: "App", texto: "App de hábitos: un sistema al que puedes volver cuando fallas.", imagen: "ankla", enlaces: [{ texto: "ankla.app", href: "https://ankla.app" }] },
    { id: "armador", nombre: "Armador de sets", tipo: "Visuales en vivo", texto: "Más de 500 visuales que reaccionan a la música y una herramienta para armar el set de cada noche.", imagen: "armador", enlaces: [{ texto: "armador-sets-tdai.vercel.app", href: "https://armador-sets-tdai.vercel.app" }] },
    { id: "kubono", nombre: "Kubono", tipo: "Juego", texto: "Un punto blanco en un mundo oscuro. Caminas, exploras y el mundo se va abriendo.", imagen: "kubono", enlaces: [{ texto: "kubono.vercel.app", href: "https://kubono.vercel.app" }] },
    { id: "jayfit", nombre: "JAYFIT", tipo: "App", texto: "Rutinas con kettlebell o sin equipo, filtradas por zona, dificultad y tiempo.", imagen: "jayfit", enlaces: [{ texto: "jayfit.vercel.app", href: "https://jayfit.vercel.app" }] },
    { id: "jdrums", nombre: "J-Drums", tipo: "Audio", texto: "Una batería electrónica convertida en juego de ritmo: lecciones y grooves que se tocan de verdad." },
    { id: "operaciones", nombre: "Plataforma de operaciones", tipo: "Sistema para empresa", texto: "Para una empresa de tecnología: proyectos, tickets y vencimientos en un solo panel." },
    { id: "jaymind", nombre: "JAYMIND", tipo: "App", texto: "Panel personal que junta agenda, hábitos, casa y música." },
  ],
  en: [
    { id: "awwwards", nombre: "3 Awwwards honorable mentions", tipo: "Websites", texto: "Three of Jay's websites with Minervo, recognized by the Awwwards jury.", enlaces: AWWWARDS },
    { id: "minervo", nombre: "minərvo.studio", tipo: "Website and brand", texto: "Website for a brand experience studio. You can touch the shapes and each one plays a sound.", imagen: "minervo", enlaces: [{ texto: "minervoweb.vercel.app", href: "https://minervoweb.vercel.app" }] },
    { id: "jay", nombre: "Jay is ___", tipo: "Personal website", texto: "Six ways to see the same person, in Spanish and English.", imagen: "jay", enlaces: [{ texto: "jayjaramillo.vercel.app", href: "https://jayjaramillo.vercel.app" }] },
    { id: "terreno", nombre: "A Todo Terreno", tipo: "Event website", texto: "Website for a convention, with attendee registration and a panel for the organizers.", imagen: "terreno" },
    { id: "coresolutions", nombre: "Coresolutions", tipo: "Corporate website", texto: "Website for an infrastructure, cloud and cybersecurity company.", imagen: "coresolutions", enlaces: [{ texto: "coresolutions-web.vercel.app", href: "https://coresolutions-web.vercel.app" }] },
    { id: "ankla", nombre: "ANKLA", tipo: "App", texto: "Habit app: a system you can come back to when you slip.", imagen: "ankla", enlaces: [{ texto: "ankla.app", href: "https://ankla.app" }] },
    { id: "armador", nombre: "Set builder", tipo: "Live visuals", texto: "Over 500 visuals that react to music and a tool to build each night's set.", imagen: "armador", enlaces: [{ texto: "armador-sets-tdai.vercel.app", href: "https://armador-sets-tdai.vercel.app" }] },
    { id: "kubono", nombre: "Kubono", tipo: "Game", texto: "A white dot in a dark world. You walk, explore, and the world opens up.", imagen: "kubono", enlaces: [{ texto: "kubono.vercel.app", href: "https://kubono.vercel.app" }] },
    { id: "jayfit", nombre: "JAYFIT", tipo: "App", texto: "Kettlebell or no-equipment routines, filtered by body area, difficulty and time.", imagen: "jayfit", enlaces: [{ texto: "jayfit.vercel.app", href: "https://jayfit.vercel.app" }] },
    { id: "jdrums", nombre: "J-Drums", tipo: "Audio", texto: "An electronic drum kit turned into a rhythm game: lessons and grooves you actually play." },
    { id: "operaciones", nombre: "Operations platform", tipo: "Business system", texto: "For a technology company: projects, tickets and deadlines in one panel." },
    { id: "jaymind", nombre: "JAYMIND", tipo: "App", texto: "A personal panel that brings together calendar, habits, home and music." },
  ],
};

export const trabajos = (idioma: Idioma) => TRABAJOS[idioma];

const dolares = (n: number) => `USD ${n}`;

const ES = {
  titulo: ["Agencia", "creativa."],
  bajada: "Diseño, tecnología y comunicación, hechos por dos personas que lo han hecho muchas veces.",
  datos: ["Jay y Luna", "Trabajamos en línea, para cualquier lugar", "Webs, marca, apps, contenido y eventos"],
  verTrabajo: "Ver el trabajo", hablemos: "Cuéntanos tu proyecto",
  trabajo: { titulo: "Trabajo", texto: "Webs, apps, juegos, visuales y sistemas. Esto es parte de lo que hemos hecho.", sinEnlace: "Se muestra a pedido" },
  hacemos: {
    titulo: "Qué hacemos",
    texto: "Si se diseña, se programa, se graba o se monta en un lugar, lo podemos hacer.",
    bloques: [
      { nombre: "Diseño y marca", lista: ["Webs", "Identidad de marca", "Diseño de interfaces y experiencia de uso", "Presentaciones y piezas gráficas"] },
      { nombre: "Tecnología", lista: ["Apps", "Sistemas para empresas", "Juegos", "Experiencias interactivas", "Audio, música y visuales en vivo"] },
      { nombre: "Comunicación", lista: ["Manejo de redes sociales", "Planificación y producción de contenido", "Guiones y producción de video", "Fotografía y videografía"] },
      { nombre: "Eventos y producción", lista: ["Lanzamientos y fiestas", "Grandes eventos", "Escenografía y dirección de arte", "Sesiones de fotos"] },
    ],
  },
  nosotros: {
    titulo: "Nosotros",
    texto: "Somos dos. Hablas con quienes hacen el trabajo.",
    personas: [
      { id: "jay", nombre: "Jay Jaramillo", rol: "Diseño y tecnología", texto: "Diseñador de interfaces e ingeniero. Estudió telecomunicaciones y diseño UX/UI en el Politécnico de Milán. Diseña y programa webs, apps, juegos y visuales en vivo. Tres de sus webs tienen mención de honor en Awwwards.", alt: "Retrato de Jay", pendiente: "Jay · retrato en camino" },
      { id: "luna", nombre: "Luna", rol: "Creatividad y producción", texto: "Ha dirigido la creatividad de varias agencias. Maneja redes sociales, planifica y produce contenido, escribe guiones y produce video. También hace fotografía, videografía, escenografía, arte, fiestas y grandes eventos.", alt: "Retrato de Luna", pendiente: "Luna · retrato en camino" },
    ],
  },
  como: {
    titulo: "Cómo trabajamos",
    pasos: [
      { nombre: "Nos cuentas", texto: "Qué necesitas, para cuándo y qué tienes hoy. Por mensaje o por llamada." },
      { nombre: "Propuesta", texto: "Te mandamos qué vamos a hacer, en cuánto tiempo y a qué precio. El precio no cambia después." },
      { nombre: "Lo hacemos", texto: "Ves el avance mientras se hace y pides cambios a tiempo." },
      { nombre: "Entrega", texto: "Queda publicado y funcionando. Si quieres, lo seguimos cuidando cada mes." },
    ],
    apoyo: "Usamos inteligencia artificial como apoyo para avanzar más rápido. Las decisiones y la revisión final son nuestras.",
  },
  precios: {
    titulo: "Precios",
    texto: "Cada proyecto recibe una propuesta con precio cerrado antes de empezar.",
    planes: [
      { nombre: "Web para tu negocio", precio: `Desde ${dolares(OFERTA.web.precio)}`, texto: `Una página completa con servicios, horarios, mapa y botón de WhatsApp. Lista en ${OFERTA.web.dias} días.` },
      { nombre: "Proyecto a medida", precio: `Desde ${dolares(DESDE_A_MEDIDA)}`, texto: "Marca, web de varias páginas, app, sistema, contenido o evento. Se cotiza según lo que necesites." },
      { nombre: "Cuidado mensual", precio: `Desde ${dolares(OFERTA.plan.precio)} al mes`, texto: "Hosting, dominio, seguridad, copias y un cambio pequeño cada mes." },
    ],
    nota: "Precios en dólares, más IVA.",
  },
  contacto: { titulo: "¿Tienes un proyecto?", texto: "Cuéntanos qué necesitas. Jay o Luna te responden en menos de 24 horas.", boton: "Escríbenos" },
};

const EN: typeof ES = {
  titulo: ["Creative", "agency."],
  bajada: "Design, technology and communication, made by two people who have done it many times.",
  datos: ["Jay and Luna", "We work online, for anywhere", "Websites, brand, apps, content and events"],
  verTrabajo: "See the work", hablemos: "Tell us about your project",
  trabajo: { titulo: "Work", texto: "Websites, apps, games, visuals and systems. This is part of what we have made.", sinEnlace: "Shown on request" },
  hacemos: {
    titulo: "What we do",
    texto: "If it is designed, coded, filmed or built in a place, we can do it.",
    bloques: [
      { nombre: "Design and brand", lista: ["Websites", "Brand identity", "Interface and user experience design", "Presentations and graphics"] },
      { nombre: "Technology", lista: ["Apps", "Business systems", "Games", "Interactive experiences", "Audio, music and live visuals"] },
      { nombre: "Communication", lista: ["Social media management", "Content planning and production", "Scripts and video production", "Photography and videography"] },
      { nombre: "Events and production", lista: ["Launches and parties", "Large events", "Set design and art direction", "Photo shoots"] },
    ],
  },
  nosotros: {
    titulo: "About us",
    texto: "There are two of us. You talk to the people who do the work.",
    personas: [
      { id: "jay", nombre: "Jay Jaramillo", rol: "Design and technology", texto: "Interface designer and engineer. He studied telecommunications and UX/UI design at the Polytechnic University of Milan. He designs and codes websites, apps, games and live visuals. Three of his websites have an Awwwards honorable mention.", alt: "Portrait of Jay", pendiente: "Jay · portrait coming" },
      { id: "luna", nombre: "Luna", rol: "Creativity and production", texto: "She has led creativity at several agencies. She manages social media, plans and produces content, writes scripts and produces video. She also does photography, videography, set design, art, parties and large events.", alt: "Portrait of Luna", pendiente: "Luna · portrait coming" },
    ],
  },
  como: {
    titulo: "How we work",
    pasos: [
      { nombre: "You tell us", texto: "What you need, by when, and what you have today. By message or on a call." },
      { nombre: "Proposal", texto: "We send what we will do, how long it takes and the price. The price does not change later." },
      { nombre: "We make it", texto: "You see progress while it is being made and ask for changes in time." },
      { nombre: "Delivery", texto: "It goes live and works. If you want, we keep looking after it every month." },
    ],
    apoyo: "We use artificial intelligence as support to move faster. The decisions and the final review are ours.",
  },
  precios: {
    titulo: "Prices",
    texto: "Every project gets a proposal with a fixed price before we start.",
    planes: [
      { nombre: "A website for your business", precio: `From ${dolares(OFERTA.web.precio)}`, texto: `A complete page with services, opening hours, map and WhatsApp button. Ready in ${OFERTA.web.dias} days.` },
      { nombre: "Custom project", precio: `From ${dolares(DESDE_A_MEDIDA)}`, texto: "Brand, multi-page website, app, system, content or event. Quoted based on what you need." },
      { nombre: "Monthly care", precio: `From ${dolares(OFERTA.plan.precio)} a month`, texto: "Hosting, domain, security, backups and one small change every month." },
    ],
    nota: "Prices in US dollars, plus VAT.",
  },
  contacto: { titulo: "Got a project?", texto: "Tell us what you need. Jay or Luna will reply within 24 hours.", boton: "Write to us" },
};

export const textosInicio = (idioma: Idioma) => (idioma === "en" ? EN : ES);
