import { Agentes } from "@/components/paginas/Agentes";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Equipo — Anonymo", description: "Los 22 agentes de la agencia: estrategia, marca, producto digital, comunicación y crecimiento.", alternates: alternos("/agentes") };

export default function Pagina() {
  return <Agentes idioma="es" />;
}
