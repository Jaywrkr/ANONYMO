// Clientes nuevos (sistema/66): Imán busca negocios con buena reputación y mala presencia web.

export type EstadoProspecto = "nuevo" | "contactado" | "respondio" | "reunion" | "cliente" | "descartado";

export const ESTADOS_PROSPECTO: Record<EstadoProspecto, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  respondio: "Respondió",
  reunion: "Reunión",
  cliente: "Cliente",
  descartado: "Descartado",
};

/** Lo que encontró la revisión de la web del negocio. */
export type RevisionWeb =
  | { estado: "social"; red: string }
  | { estado: "rota"; motivo: string }
  | {
      estado: "ok";
      https: boolean;
      celular: boolean;
      titulo: string;
      hechaCon?: string;
      anio?: number;
      ms: number;
      /** Lo que Sonda leyó en la web (sistema/71): para personalizar el primer mensaje. */
      sonda?: { descripcion?: string; secciones: string[]; redes: string[] };
      /** El color de marca que se ve en su web (sistema/85). */
      color?: string;
    };

/** Cuántos negocios nuevos se escriben por día, como máximo: WhatsApp castiga los envíos masivos (sistema/71). */
export const TANDA_DIARIA = 20;

export interface Prospecto {
  /** Id del lugar en Google Maps. */
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  /** La búsqueda que lo trajo («odontólogo»). */
  rubro: string;
  estrellas?: number;
  resenas: number;
  web?: string;
  telefono?: string;
  mapa?: string;
  /** Su horario en Google, una línea por día empezando en lunes (sistema/81). */
  horario?: string[];
  revision?: RevisionWeb;
  estado: EstadoProspecto;
  notas?: string;
  /** El mensaje escrito a mano (si no hay, se arma solo). */
  mensaje?: string;
  agregado: string;
  actualizado: string;
  /** Quién lo cambió por última vez (jay o luna). */
  por?: string;
  /** Si ya se convirtió en pedido, el id del proyecto. */
  proyecto?: string;
  /** Lo que pasó con este negocio, en orden (sistema/70): lo muestra su ficha de cliente. */
  historial?: { cuando: string; que: string; por?: string }[];
  /** Lo que pasó con su muestra (sistema/72): cuántas veces la abrió y si tocó «Quiero esta web». */
  muestra?: { vistas: number; primera?: string; ultima?: string; quiere?: string; chat?: string };
  /** La plantilla de su muestra (sistema/79). Sin elegir, sale de su id: la se reparten parejo entre las cinco, para comparar cuál responde mejor. */
  plantilla?: PlantillaMuestra;
  /** El color de su marca si Jay lo puso a mano (sistema/85): #RRGGBB. Si no hay, va el de su web o el de su rubro. */
  color?: string;
  /** Cómo se le llama en su muestra, su propuesta y los mensajes si el nombre corto que sale solo no convence (sistema/83). */
  alias?: string;
  /** El precio de su web si no es el de la oferta (sistema/82), en dólares sin IVA. Lo pone Jay antes de mandar la propuesta. */
  precio?: number;
  /** Cuántas fotos subió el negocio a su muestra (sistema/82). Viven en `_fotos/<id de muestra>/` en la nube privada. */
  fotos?: number;
  /** Las fotos las puso el estudio, no el negocio (sistema/87). */
  fotosEstudio?: boolean;
  /** Cuándo se le mandó el seguimiento (sistema/80): un solo recordatorio a los 3 días sin respuesta. */
  seguimiento?: string;
  /** Lo que pasó con su propuesta (sistema/80): cuántas veces la abrió y cuándo tocó «Aceptar». */
  propuesta?: { vistas: number; ultima?: string; acepto?: string };
}

/** Las dos variantes de la muestra (sistema/79): calma premium o grilla gráfica. */
export type PlantillaMuestra = "sereno" | "grafico" | "mosaico" | "revista" | "noche";
export const PLANTILLAS_MUESTRA: Record<PlantillaMuestra, { nombre: string; idea: string }> = {
  grafico: { nombre: "Color", idea: "Un marco del color de la marca, el nombre enorme, tarjetas redondeadas y un sello con su nota de Google." },
  sereno: { nombre: "Sereno", idea: "Papel claro, una serif suave y grande al centro y la imagen dentro de un arco. Calma y confianza." },
  mosaico: { nombre: "Mosaico", idea: "Todo en fichas redondeadas, como una app: nombre, nota, horario y servicios, cada uno en su ficha." },
  revista: { nombre: "Revista", idea: "Blanco, negro y el color de la marca. Titular condensado, líneas gruesas y una cinta de servicios que corre." },
  noche: { nombre: "Noche", idea: "Fondo oscuro con un resplandor del color de la marca y fichas de vidrio. Elegante y nocturna." },
};
/** En qué orden se reparten solas. */
export const ORDEN_PLANTILLAS: PlantillaMuestra[] = ["grafico", "sereno", "mosaico", "revista", "noche"];
export const esPlantilla = (x: unknown): x is PlantillaMuestra => typeof x === "string" && x in PLANTILLAS_MUESTRA;

export interface ListaProspectos {
  actualizado: string;
  firma: string;
  /** El WhatsApp de ANONYMO (sistema/72): adonde escribe quien toca «Quiero esta web» en su muestra. */
  numero?: string;
  /** Cuántos mensajes por semana se quiere mandar (sistema/89). Sin poner, 50. */
  meta?: number;
  prospectos: Record<string, Prospecto>;
}

/** Los rubros con los que se empezó: salud, legal y contable, belleza y bienestar. */
export const GRUPOS_RUBRO = [
  { id: "salud", nombre: "Salud", busquedas: ["odontólogo", "médico especialista", "fisioterapia", "psicólogo", "dermatólogo", "pediatra"] },
  { id: "legal", nombre: "Legal y contable", busquedas: ["abogado", "notaría", "estudio contable"] },
  { id: "belleza", nombre: "Belleza y bienestar", busquedas: ["spa", "barbería", "centro de estética", "salón de belleza", "gimnasio"] },
] as const;

/** Centro aproximado de cada ciudad, para que Google busque cerca. */
export const CIUDADES: Record<string, { lat: number; lng: number }> = {
  Cuenca: { lat: -2.9001, lng: -79.0059 },
  Quito: { lat: -0.1807, lng: -78.4678 },
  Guayaquil: { lat: -2.1709, lng: -79.9224 },
  Loja: { lat: -3.9931, lng: -79.2042 },
  Azogues: { lat: -2.7397, lng: -78.8486 },
};

export const FIRMA_INICIAL = "Jay Jaramillo · ANONYMO";
