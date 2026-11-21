import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export default function Image() {
  return imagen({ etiqueta: "Jay and Luna", titulo: "Creative agency.", bajada: "Design, technology and communication, made by two people who have done it many times." });
}
