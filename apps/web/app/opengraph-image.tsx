import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Unmake";

export default function Imagen() {
  return imagen({ etiqueta: "Jay y Luna", titulo: "Agencia creativa.", bajada: "Diseño, tecnología y comunicación, hechos por dos personas que lo han hecho muchas veces." });
}
