import { AGENTES, agentePorId, localizar } from "@anonymo/agentes";
import { Ficha } from "@/components/paginas/Ficha";
import { alternos } from "@/lib/idioma";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = agentePorId(id);
  const e = a && localizar(a, "en");
  return { title: e ? `${e.nombre}, ${e.rol.toLowerCase()} — Anonymo` : "Anonymo", description: e ? `${e.superpoder} “${e.frase}”` : undefined, alternates: alternos(`/agentes/${id}`) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Ficha id={(await params).id} idioma="en" />;
}
