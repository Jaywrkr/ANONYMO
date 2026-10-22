import { Contacto } from "@/components/paginas/Contacto";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Contact — Anonymo", description: "Tell us what you need: Atlas drafts the plan that same night.", alternates: alternos("/contacto") };

export default function Page() {
  return <Contacto idioma="en" />;
}
