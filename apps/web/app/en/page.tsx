import { Inicio } from "@/components/paginas/Inicio";
import { alternos } from "@/lib/idioma";

export const metadata = {
  title: "Anonymo — creative agency",
  description: "Design, technology and communication, made by two people who have done it many times.",
  alternates: alternos("/"),
};

export default function Page() {
  return <Inicio idioma="en" />;
}
