import { Inicio } from "@/components/paginas/Inicio";
import { alternos } from "@/lib/idioma";

export const metadata = { alternates: alternos("/") };

export default function Pagina() {
  return <Inicio idioma="es" />;
}
