import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contacto — Anonymo", description: "Cuéntanos qué necesitas: Jay o Luna te responden en menos de 24 horas.", alternates: alternos("/contacto") };

export default function Pagina() {
  return <Contacto idioma="es" />;
}
