import { Proceso } from "@/components/paginas/Proceso";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Proceso — Anonymo", description: "Siete fases, de la idea al lanzamiento: qué recibes en cada una, cuánto dura y quién la hace.", alternates: alternos("/proceso") };

export default function Pagina() {
  return <Proceso idioma="es" />;
}
