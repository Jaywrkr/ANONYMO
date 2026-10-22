import { agentePorId } from "@anonymo/agentes";
import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export default function Imagen() {
  return imagen({ etiqueta: "La sala", titulo: "Mira al equipo trabajar.", bajada: "Cada fase, cada agente, lo que hizo y lo que necesita.", agentes: ["orla", "lumen", "vector", "kine", "tempo"].map((id) => agentePorId(id)!) });
}
