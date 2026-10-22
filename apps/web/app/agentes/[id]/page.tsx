import { AGENTES, agentePorId } from "@anonymo/agentes";
import { Ficha } from "@/components/paginas/Ficha";
import { alternos } from "@/lib/idioma";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = agentePorId(id);
  return { title: a ? `${a.nombre}, ${a.rol.toLowerCase()} — Anonymo` : "Anonymo", description: a ? `${a.superpoder} “${a.frase}”` : undefined, alternates: alternos(`/agentes/${id}`) };
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return <Ficha id={(await params).id} idioma="es" />;
}
