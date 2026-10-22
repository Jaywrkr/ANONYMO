import { Proceso } from "@/components/paginas/Proceso";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Process — Anonymo", description: "Seven phases, from idea to launch: what you get in each, how long it takes and who does it.", alternates: alternos("/proceso") };

export default function Page() {
  return <Proceso idioma="en" />;
}
