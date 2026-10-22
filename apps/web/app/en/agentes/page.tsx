import { Agentes } from "@/components/paginas/Agentes";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Team — Anonymo", description: "The agency's 22 agents: strategy, brand, digital product, communication and growth.", alternates: alternos("/agentes") };

export default function Page() {
  return <Agentes idioma="en" />;
}
