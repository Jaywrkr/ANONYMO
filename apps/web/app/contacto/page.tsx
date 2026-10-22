import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contacto — Anonymo", alternates: alternos("/contacto") };

export default function Pagina() {
  return <Contacto idioma="es" />;
}
