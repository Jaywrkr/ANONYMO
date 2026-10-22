import { Casos } from "@/components/paginas/Casos";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Work — Anonymo", description: "Agency projects told by the team that made them.", alternates: alternos("/casos") };

export default function Page() {
  return <Casos idioma="en" />;
}
