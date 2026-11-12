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
  muestra?: { vistas: number; primera?: string; ultima?: string; quiere?: string };
  /** La plantilla de su muestra (sistema/79). Sin elegir, sale de su id: la mitad «sereno» y la mitad «grafico», para comparar cuál responde mejor. */
  plantilla?: PlantillaMuestra;
}

/** Las dos variantes de la muestra (sistema/79): calma premium o grilla gráfica. */
export type PlantillaMuestra = "sereno" | "grafico";
export const PLANTILLAS_MUESTRA: Record<PlantillaMuestra, { nombre: string; idea: string }> = {
  sereno: { nombre: "Sereno", idea: "Papel cálido, serif liviana con una palabra en cursiva, bloques redondeados. Calma premium." },
  grafico: { nombre: "Gráfico", idea: "Grilla suiza, secciones numeradas, un bloque de color fuerte y listas con líneas." },
};

export interface ListaProspectos {
  actualizado: string;
  firma: string;
  /** El WhatsApp de ANONYMO (sistema/72): adonde escribe quien toca «Quiero esta web» en su muestra. */
  numero?: string;
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

export const FIRMA_INICIAL = "Jay · ANONYMO";
