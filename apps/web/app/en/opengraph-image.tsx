import { agentePorId } from "@anonymo/agentes";
import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export default function Image() {
  return imagen({ etiqueta: "Creative agency", titulo: "We work while you sleep.", bajada: "Jay, Luna and 22 agents.", agentes: ["atlas", "verba", "lumen", "chispa", "trofeo"].map((id) => agentePorId(id)!) });
}
