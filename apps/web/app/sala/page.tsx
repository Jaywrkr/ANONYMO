import { listarProyectos } from "@/lib/proyectos";
import { Sala } from "./Sala";

export const metadata = { title: "La sala — Anonymo" };

export default function Page() {
  return <Sala proyectos={listarProyectos()} />;
}
