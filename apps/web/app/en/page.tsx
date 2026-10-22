import { Inicio } from "@/components/paginas/Inicio";
import { alternos } from "@/lib/idioma";

export const metadata = {
  title: "Anonymo — we work while you sleep",
  description: "Jay and Luna's creative agency, with a team of 22 agents.",
  alternates: alternos("/"),
};

export default function Page() {
  return <Inicio idioma="en" />;
}
