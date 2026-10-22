import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contact — Anonymo", alternates: alternos("/contacto") };

export default function Page() {
  return <Contacto idioma="en" />;
}
