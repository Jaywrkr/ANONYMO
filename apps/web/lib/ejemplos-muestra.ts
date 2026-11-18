// Negocios de ejemplo para ver las plantillas (sistema/79). Ficticios: ningún dato real.
import { contenidoMuestra, type PlantillaMuestra, type Prospecto, type Tono } from "@anonymo/pipeline";

const BASE: Record<Tono, Pick<Prospecto, "nombre" | "rubro" | "direccion" | "estrellas" | "resenas" | "telefono">> = {
  salud: { nombre: "Clínica Dental Sonrisa", rubro: "odontólogo", direccion: "Av. Solano 3-45, Cuenca", estrellas: 4.9, resenas: 128, telefono: "099 000 0001" },
  legal: { nombre: "Estudio Jurídico Andrade", rubro: "abogado", direccion: "Calle Larga 8-20, Cuenca", estrellas: 4.8, resenas: 46, telefono: "099 000 0002" },
  belleza: { nombre: "Barbería Don Bigote", rubro: "barbería", direccion: "Presidente Córdova 5-11, Cuenca", estrellas: 4.9, resenas: 210, telefono: "099 000 0003" },
  otro: { nombre: "Taller Norte", rubro: "taller de carpintería", direccion: "Av. de las Américas 12-40, Cuenca", estrellas: 4.7, resenas: 32, telefono: "099 000 0004" },
};

export const TONOS: Tono[] = ["salud", "legal", "belleza", "otro"];
export const VARIANTES: PlantillaMuestra[] = ["sereno", "grafico"];

export function ejemploMuestra(tono: Tono, plantilla: PlantillaMuestra) {
  const b = BASE[tono];
  return contenidoMuestra({ ...b, id: `ejemplo-${tono}`, ciudad: "Cuenca", estado: "nuevo", agregado: "", actualizado: "", plantilla, mapa: "https://maps.google.com" });
}
