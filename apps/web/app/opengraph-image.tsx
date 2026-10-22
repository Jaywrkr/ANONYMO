import { agentePorId } from "@anonymo/agentes";
import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export default function Imagen() {
  return imagen({ etiqueta: "Agencia creativa", titulo: "Trabajamos mientras duermes.", bajada: "Jay, Luna y 22 agentes.", agentes: ["atlas", "verba", "lumen", "chispa", "trofeo"].map((id) => agentePorId(id)!) });
}
