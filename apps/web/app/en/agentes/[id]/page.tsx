import { AGENTES, agentePorId, localizar } from "@anonymo/agentes";
import { Ficha } from "@/components/paginas/Ficha";
import { alternos } from "@/lib/idioma";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = agentePorId(id);
  return { title: a ? `${a.nombre}, ${localizar(a, "en").rol} — Anonymo` : "Anonymo", alternates: alternos(`/agentes/${id}`) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Ficha id={(await params).id} idioma="en" />;
}
