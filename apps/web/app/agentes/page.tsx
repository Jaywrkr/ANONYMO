import { Agentes } from "@/components/paginas/Agentes";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Equipo — Anonymo", alternates: alternos("/agentes") };

export default function Pagina() {
  return <Agentes idioma="es" />;
}
