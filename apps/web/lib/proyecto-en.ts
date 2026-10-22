// The agency's own project in English (web/05). Same structure as lib/proyecto.ts.
import { PROYECTO, type Estado, type Mensaje } from "./proyecto";

type Texto = Pick<Mensaje, "dice" | "necesita" | "entrega">;

const EN: Record<number, Record<string, Texto>> = {
  1: {
    atlas: { dice: "The plan is ready: 22 agents, 7 phases and launch on December 14. Today's bottleneck is the name.", necesita: "Pick the name this week.", entrega: "Master plan" },
    ledger: { dice: "No numbers yet. To set prices I need to know what your time is worth and which tools we pay for.", necesita: "Target rate and monthly fixed costs.", entrega: "Pricing model" },
    sonda: { dice: "In Ecuador the most awarded agencies do advertising. None presents itself as an award-level web studio. That space is open.", necesita: "Three brands Luna admires and three dream clients.", entrega: "References and competitor map" },
    nova: { dice: "The agency sells an engineer's precision with the energy of an events company.", necesita: "Luna to read the brief.", entrega: "Brand brief" },
  },
  2: {
    verba: { dice: "I checked over 250 domains and kept 108 free ones. My favorite today is Corsivo: type in motion, sounds Italian and has three free domains.", necesita: "Mark Yes, Maybe or No in the matrix.", entrega: "Matrix of 108 names" },
    rhea: { dice: "Each finalist needs its line. Corsivo: design with a slant. Lucciola: we shine at night.", necesita: "The tone: elegant, playful or direct.", entrega: "Line per finalist" },
    sonda: { dice: "Instagram and the trademark office still need checking before we buy the domain.", necesita: "The three finalists.", entrega: "Socials and trademark check" },
  },
  3: {
    mira: { dice: "I start the logo the day we have a name, within this art direction.", necesita: "The chosen name.", entrega: "Three logo proposals" },
    rhea: { dice: "Manifesto and tone: short sentences, common words, zero jargon.", necesita: "Three words that describe the agency.", entrega: "Manifesto and tone guide" },
    kine: { dice: "The logo has to move like these agents: with weight, not with a fade.", necesita: "The logo as a vector.", entrega: "Animated logo" },
    eco: { dice: "A two-note signature: one for Jay, one for Luna. It only plays if the visitor turns it on.", necesita: "Nothing for now.", entrega: "Sonic logo" },
  },
  4: {
    orla: { dice: "This site is the first case: a calm base, poster type and color only on the agents.", necesita: "Your OK on the art direction.", entrega: "Website design" },
    lumen: { dice: "One 3D context for the whole site. All 22 agents share a canvas so it runs on a phone.", necesita: "Nothing for now.", entrega: "3D scene" },
    vector: { dice: "Next.js, Tailwind and React Three Fiber. Each phase on its own branch.", necesita: "Access to the domain when it exists.", entrega: "Website live" },
    kine: { dice: "Transitions between phases like an instant replay.", necesita: "Nothing for now.", entrega: "Motion system" },
    eco: { dice: "Soft interface sounds, off by default.", necesita: "Nothing for now.", entrega: "Website sounds" },
    tempo: { dice: "If the name is decided by October 26, the site launches December 14.", necesita: "The name decision.", entrega: "Calendar and risks" },
  },
  5: {
    faro: { dice: "A launch in series: one agent a day, 22 pieces.", necesita: "Launch date.", entrega: "Content plan" },
    chispa: { dice: "The same @handle on Instagram, TikTok and LinkedIn.", necesita: "The reserved @handle.", entrega: "Accounts ready" },
    lente: { dice: "Black and white portraits of Jay and Luna with each area's color.", necesita: "Date and location in Cuenca.", entrega: "Founder photos" },
    corte: { dice: "A 15-second reel per phase and a 30-second launch one.", necesita: "Footage from the shoot.", entrega: "Reels" },
    escena: { dice: "An event in Cuenca with the room projected live and Jay's visuals.", necesita: "Budget and venue.", entrega: "Launch event" },
  },
  6: {
    prisma: { dice: "Speed, accessibility and SEO on real phones. Nothing ships with errors.", necesita: "The site in a test environment.", entrega: "Quality report" },
    trofeo: { dice: "Juries reward point of view and flawless execution. Realistic goal: Site of the Day in December.", necesita: "Case texts and screenshots.", entrega: "Awwwards submission" },
    pulso: { dice: "I measure visits, time in the room and contacts from day one.", necesita: "Access to analytics.", entrega: "Metrics dashboard" },
  },
  7: {
    iman: { dice: "With the site live I build the base proposal: the same 7 phases for every client.", necesita: "The dream client list.", entrega: "Sales proposal" },
    ledger: { dice: "We sell by phase. A client can start at any of them.", necesita: "Phase 1 numbers.", entrega: "Packages and pricing" },
    atlas: { dice: "Every client starts at phase 1 and their project shows up in this room.", necesita: "The first client.", entrega: "Client project in the room" },
  },
};

export const PROYECTO_EN = {
  nombre: "Our agency",
  mensajes: Object.fromEntries(
    Object.entries(PROYECTO.mensajes).map(([f, ms]) => [f, Object.fromEntries(Object.entries(ms).map(([id, m]) => [id, { ...m, ...(EN[Number(f)]?.[id] ?? {}) }]))]),
  ) as Record<number, Record<string, Mensaje>>,
};

export const ESTADO_TEXTO_EN: Record<Estado, string> = { listo: "Done", "en-curso": "In progress", "por-empezar": "Not started" };
