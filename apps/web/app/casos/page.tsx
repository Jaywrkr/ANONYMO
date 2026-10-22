import { Casos } from "@/components/paginas/Casos";
import { alternos } from "@/lib/idioma";

export const metadata = { title: "Casos — Anonymo", alternates: alternos("/casos") };

export default function Pagina() {
  return <Casos idioma="es" />;
}
