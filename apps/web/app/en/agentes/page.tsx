import { Agentes } from "@/components/paginas/Agentes";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Team — Anonymo", alternates: alternos("/agentes") };

export default function Page() {
  return <Agentes idioma="en" />;
}
