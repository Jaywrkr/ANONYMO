import { Proceso } from "@/components/paginas/Proceso";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Proceso — Anonymo", alternates: alternos("/proceso") };

export default function Pagina() {
  return <Proceso idioma="es" />;
}
