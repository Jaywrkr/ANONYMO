import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contacto — Anonymo", description: "Cuéntanos qué necesitas: Atlas arma el plan esa misma noche.", alternates: alternos("/contacto") };

export default function Pagina() {
  return <Contacto idioma="es" />;
}
