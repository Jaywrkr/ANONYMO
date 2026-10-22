import { agentePorId, AGENTES } from "@anonymo/agentes";
import { imagen, tamano, tipo } from "@/lib/og";

export const size = tamano;
export const contentType = tipo;
export const alt = "Anonymo";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export default async function Imagen({ params }: { params: Promise<{ id: string }> }) {
  const a = agentePorId((await params).id)!;
  return imagen({ etiqueta: a.rol, titulo: a.nombre, bajada: `“${a.frase}”`, agentes: [a] });
}
