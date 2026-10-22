import { agentePorId, AGENTES, localizar } from "@anonymo/agentes";
import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const a = localizar(agentePorId((await params).id)!, "en");
  return imagen({ etiqueta: a.rol, titulo: a.nombre, bajada: `“${a.frase}”`, agentes: [a] });
}
