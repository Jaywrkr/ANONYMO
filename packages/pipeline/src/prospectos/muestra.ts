// La muestra de cada prospecto (sistema/72): una idea de su web, armada sin IA con lo que ya se sabe del negocio.
// Se abre en /m/<id>. Cada vez que el negocio la abre, queda anotado y Jay recibe un aviso.
import { createHash } from "node:crypto";
import { slug } from "../solicitudes.ts";
import { GRUPOS_RUBRO, type PlantillaMuestra, type Prospecto } from "./tipos.ts";

/** El id de la muestra: el nombre y una huella del lugar. No hace falta guardarlo: siempre sale igual. */
export function idMuestra(p: Pick<Prospecto, "id" | "nombre">) {
  const base = slug(p.nombre).slice(0, 40).replace(/-+$/, "") || "negocio";
  return `${base}-${createHash("sha256").update(`muestra:${p.id}`).digest("hex").slice(0, 6)}`;
}

export const idMuestraValido = (id: string) => /^[a-z0-9][a-z0-9-]{2,60}$/.test(id);

export function buscarPorMuestra<T extends Pick<Prospecto, "id" | "nombre">>(prospectos: Record<string, T>, id: string) {
  return Object.values(prospectos).find((p) => idMuestra(p) === id);
}

export type Tono = "salud" | "legal" | "belleza" | "otro";

export function tonoDe(rubro: string): Tono {
  const r = rubro.toLowerCase();
  for (const g of GRUPOS_RUBRO) if (g.busquedas.some((b) => r.includes(b.toLowerCase()))) return g.id as Tono;
  if (/odont|dent|m[eé]dic|cl[ií]nica|fisio|psic|derma|pediat|veterin|[oó]ptica/.test(r)) return "salud";
  if (/abogad|notar|contab|legal|jur[ií]d/.test(r)) return "legal";
  if (/spa|barber|est[eé]tic|belleza|sal[oó]n|gimnas|u[ñn]as|peluquer/.test(r)) return "belleza";
  return "otro";
}

const SERVICIOS: Record<Tono, string[]> = {
  salud: ["Primera consulta", "Tratamientos", "Controles y seguimiento", "Agenda en línea"],
  legal: ["Asesoría inicial", "Trámites y contratos", "Acompañamiento en tu caso", "Agenda tu reunión"],
  belleza: ["Tratamientos", "Paquetes", "Promociones del mes", "Reserva tu turno"],
  otro: ["Lo que hacemos", "Cómo trabajamos", "Preguntas frecuentes", "Contacto"],
};

const BAJADA: Record<Tono, (rubro: string, ciudad: string) => string> = {
  salud: (r, c) => `${r} en ${c}. Agenda tu cita en un minuto, sin llamar.`,
  legal: (r, c) => `${r} en ${c}. Te explicamos tu caso con claridad desde la primera reunión.`,
  belleza: (r, c) => `${r} en ${c}. Mira lo que hacemos y reserva tu turno por WhatsApp.`,
  otro: (r, c) => `${r} en ${c}. Todo lo que necesitas saber, en un solo lugar.`,
};

const GENERICAS = /^(inicio|home|contacto|cont[aá]ctanos|nosotros|qui[eé]nes somos|men[uú]|blog|galer[ií]a|ubicaci[oó]n|bienvenid)/i;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** La plantilla elegida, o una fija por negocio (mitad y mitad) para poder comparar cuál responde mejor. */
export function plantillaDe(p: Pick<Prospecto, "id" | "plantilla">): PlantillaMuestra {
  if (p.plantilla) return p.plantilla;
  return parseInt(createHash("sha256").update(`plantilla:${p.id}`).digest("hex").slice(0, 2), 16) % 2 ? "grafico" : "sereno";
}

export interface ContenidoMuestra {
  plantilla: PlantillaMuestra;
  nombre: string;
  rubro: string;
  ciudad: string;
  direccion: string;
  tono: Tono;
  bajada: string;
  /** Lo que dicen de sí mismos en su web, si Sonda lo encontró. */
  propia: boolean;
  servicios: string[];
  estrellas?: number;
  resenas: number;
  telefono?: string;
  mapa?: string;
}

/** Lo que muestra la página: nada inventado sobre el negocio salvo textos de ejemplo, que se dicen como tales. */
export function contenidoMuestra(p: Prospecto): ContenidoMuestra {
  const tono = tonoDe(p.rubro);
  const sonda = p.revision?.estado === "ok" ? p.revision.sonda : undefined;
  const propias = (sonda?.secciones ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 40 && !GENERICAS.test(s) && s.toLowerCase() !== p.nombre.toLowerCase());
  const servicios = [...propias, ...SERVICIOS[tono].filter((s) => !propias.includes(s))].slice(0, 4);
  const descripcion = sonda?.descripcion?.trim();
  return {
    plantilla: plantillaDe(p),
    nombre: p.nombre,
    rubro: mayuscula(p.rubro),
    ciudad: p.ciudad,
    direccion: p.direccion,
    tono,
    bajada: descripcion && descripcion.length <= 180 ? descripcion : BAJADA[tono](mayuscula(p.rubro), p.ciudad),
    propia: !!descripcion,
    servicios,
    estrellas: p.estrellas,
    resenas: p.resenas ?? 0,
    telefono: p.telefono,
    mapa: p.mapa,
  };
}

/** Cada cuánto una vista nueva cuenta como otra visita (y vuelve a avisar). */
export const PAUSA_VISITA_MS = 30 * 60 * 1000;

/** Anota que el negocio abrió su muestra. Devuelve si hay que avisar (primera vez o vuelve después de un rato). */
export function anotarVista(p: Prospecto, ahora = new Date()) {
  const m = (p.muestra ??= { vistas: 0 });
  const antes = m.ultima ? Date.parse(m.ultima) : 0;
  const nueva = !antes || ahora.getTime() - antes > PAUSA_VISITA_MS;
  const primera = !m.primera;
  m.vistas += 1;
  m.primera ??= ahora.toISOString();
  m.ultima = ahora.toISOString();
  if (nueva) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: primera ? "Abrió su muestra" : "Volvió a ver su muestra" });
  return { avisar: nueva, primera };
}

/** Tocó «Quiero esta web» en la muestra: la señal más fuerte. */
export function anotarQuiere(p: Prospecto, ahora = new Date()) {
  const m = (p.muestra ??= { vistas: 0 });
  const ya = !!m.quiere;
  m.quiere = ahora.toISOString();
  if (!ya) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: "Tocó «Quiero esta web» en su muestra" });
  return { avisar: !ya };
}
