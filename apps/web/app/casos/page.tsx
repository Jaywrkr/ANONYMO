import { Casos } from "@/components/paginas/Casos";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Casos — Anonymo", description: "Proyectos de la agencia contados por el equipo que los hizo.", alternates: alternos("/casos") };

export default function Pagina() {
  return <Casos idioma="es" />;
}
