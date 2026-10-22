import { Proceso } from "@/components/paginas/Proceso";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Process — Anonymo", alternates: alternos("/proceso") };

export default function Page() {
  return <Proceso idioma="en" />;
}
