// The team in English (web/05). Same ids as the Spanish source; only the words change.
import type { Agente, AreaId, TipoPedido } from "./index.ts";

export type Idioma = "es" | "en";

export const AREAS_EN: Record<AreaId, string> = {
  mando: "Command",
  estrategia: "Strategy",
  marca: "Brand",
  producto: "Digital product",
  comunicacion: "Communication",
  crecimiento: "Growth",
};

type Textos = Pick<Agente, "rol" | "caracter" | "adn" | "superpoder" | "frase" | "propNombre">;

export const AGENTES_EN: Record<string, Textos> = {
  atlas: { rol: "Orchestrator", caracter: "Calm. Sees the whole board and never rushes.", adn: "McKinsey strategy + Pixar producer rhythm", superpoder: "Decides who does what in seconds.", frase: "Plan first, noise later.", propNombre: "Headset with mic" },
  ledger: { rol: "Operations and finance", caracter: "Quiet and precise. Says no kindly.", adn: "Boutique studio CFO + operations rigor", superpoder: "Knows if a project pays before it starts.", frase: "No margin, no project.", propNombre: "Accountant's visor" },
  nova: { rol: "Brand strategy", caracter: "Curious. Asks the uncomfortable questions.", adn: "Collins clarity + Mother London cultural instinct", superpoder: "Sums up a brand in one sentence.", frase: "Why would anyone choose you?", propNombre: "North star" },
  sonda: { rol: "Research", caracter: "A quiet detective.", adn: "IDEO methods + consulting analysis", superpoder: "Finds the fact nobody looked for.", frase: "Data first, opinion later.", propNombre: "Magnifying glass" },
  verba: { rol: "Naming", caracter: "Playful. Thinks out loud.", adn: "Lexicon Branding + Liquid Death irreverence", superpoder: "A hundred names before breakfast.", frase: "If you can't say it out loud, it doesn't work.", propNombre: "Speech bubble" },
  mira: { rol: "Identity and logo", caracter: "Demanding. Looks at everything up close.", adn: "Pentagram rigor + Sagmeister & Walsh boldness", superpoder: "Logos that work at 16 px and on a building.", frase: "Less, but better made.", propNombre: "Beret" },
  rhea: { rol: "Copy and tone", caracter: "Witty and direct.", adn: "Wieden+Kennedy + Droga5 wit", superpoder: "Lines that stick in your head.", frase: "Say it once, say it well.", propNombre: "Pencil" },
  orla: { rol: "UI design", caracter: "Obsessed with rhythm and type.", adn: "Obys typography + Locomotive motion + Resn experimentation", superpoder: "Makes scrolling feel right.", frase: "Empty space designs too.", propNombre: "Set square" },
  lumen: { rol: "WebGL and 3D", caracter: "A technical dreamer.", adn: "Lusion + Active Theory + Bruno Simon", superpoder: "Turns an idea into a world you can touch.", frase: "If you can imagine it, you can render it.", propNombre: "3D glasses" },
  vector: { rol: "Front-end", caracter: "Practical, zero drama.", adn: "Active Theory code + Vercel's performance obsession", superpoder: "Sites that load in under a second.", frase: "Beautiful and fast, or it doesn't ship.", propNombre: "Laptop" },
  kine: { rol: "Motion", caracter: "Restless. Never still.", adn: "Buck + ManvsMachine", superpoder: "Brings anything to life.", frase: "Everything moves for a reason.", propNombre: "Motion trail" },
  eco: { rol: "Sound", caracter: "Listens before speaking.", adn: "Antfood + game sound design", superpoder: "Brands you recognize with your eyes closed.", frase: "Silence is a sound too.", propNombre: "Headphones" },
  prisma: { rol: "Quality and SEO", caracter: "The strictest one, and the most loved.", adn: "Performance auditor + accessibility standards", superpoder: "Finds the bug before the client does.", frase: "If it doesn't work for everyone, it doesn't work.", propNombre: "Clipboard" },
  tempo: { rol: "Production", caracter: "Organized and on time.", adn: "Senior producer at a digital studio", superpoder: "Turns chaos into a calendar.", frase: "A date is a promise.", propNombre: "Stopwatch" },
  faro: { rol: "Content", caracter: "Strategic. Thinks in series.", adn: "Mother London + the @jaywrkr series system", superpoder: "Knows what to post next Tuesday.", frase: "Consistency beats talent.", propNombre: "Lighthouse lamp" },
  chispa: { rol: "Community", caracter: "Quick, funny, close.", adn: "Duolingo humor + Glossier closeness", superpoder: "Replies like a person, not a brand.", frase: "How could this be more fun?", propNombre: "Phone" },
  lente: { rol: "Photo and shoots", caracter: "Looks at the light before anything else.", adn: "Kinfolk editorial + Nike campaign energy", superpoder: "The exact moodboard for every shoot.", frase: "The photo is made before you shoot.", propNombre: "Camera" },
  corte: { rol: "Video", caracter: "Pure rhythm.", adn: "Campaign editor + reels rhythm", superpoder: "Three seconds that hook.", frase: "If it's boring, cut it.", propNombre: "Clapperboard" },
  escena: { rol: "Events", caracter: "A host. Thinks about people.", adn: "Brand experience producers", superpoder: "Moments people film.", frase: "People remember how it felt.", propNombre: "Party hat" },
  iman: { rol: "Sales", caracter: "Listens more than talks.", adn: "Ogilvy's principles applied to proposals", superpoder: "Proposals that get signed.", frase: "Sell the result, not the hour.", propNombre: "Magnet" },
  trofeo: { rol: "Awards", caracter: "Competitive, patient.", adn: "Awwwards, FWA and Cannes Lions juries", superpoder: "Knows what a jury looks at.", frase: "Point of view before trends.", propNombre: "Laurel crown" },
  pulso: { rol: "Data", caracter: "Cold with numbers, warm with people.", adn: "Growth analyst", superpoder: "Says what works in one line.", frase: "What isn't measured is guessed.", propNombre: "Pulse monitor" },
};

export const FASES_EN: Record<number, { nombre: string; objetivo: string }> = {
  1: { nombre: "Kickoff", objetivo: "Understand the brief, price it and plan it." },
  2: { nombre: "Naming", objetivo: "Name, domains, socials and trademark." },
  3: { nombre: "Identity", objetivo: "Logo, tone, motion and sound." },
  4: { nombre: "Web", objetivo: "Design and build." },
  5: { nombre: "Launch", objetivo: "Content, photo, video and event." },
  6: { nombre: "Jury", objetivo: "Quality, awards and metrics." },
  7: { nombre: "Growth", objetivo: "Proposal, packages and next client." },
};

export const SERVICIO_EN: Record<number, { entrega: string[]; dura: string }> = {
  1: { entrega: ["Brand brief", "Phased plan", "Budget"], dura: "3 to 5 days" },
  2: { entrega: ["Name", "Domains reserved", "Socials and trademark check"], dura: "1 week" },
  3: { entrega: ["Logo and visual system", "Tone of voice", "Animated and sonic logo"], dura: "2 weeks" },
  4: { entrega: ["Website design", "Development and 3D", "Website live"], dura: "3 to 5 weeks" },
  5: { entrega: ["Content plan", "Shoot and video", "Launch event"], dura: "2 to 3 weeks" },
  6: { entrega: ["Quality report", "Awards submission", "Metrics dashboard"], dura: "1 week" },
  7: { entrega: ["Results review", "Next step", "Maintenance"], dura: "Ongoing" },
};

export const PEDIDOS_EN: Record<TipoPedido, string> = { web: "A website", marca: "A brand", lanzamiento: "A launch", todo: "Everything, from scratch" };

/** The agent with its texts in the chosen language. */
export function localizar(a: Agente, idioma: Idioma): Agente {
  return idioma === "en" ? { ...a, ...AGENTES_EN[a.id] } : a;
}
