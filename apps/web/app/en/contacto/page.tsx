import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contact — Anonymo", description: "Tell us what you need: Jay or Luna will reply within 24 hours.", alternates: alternos("/contacto") };

export default function Page() {
  return <Contacto idioma="en" />;
}
