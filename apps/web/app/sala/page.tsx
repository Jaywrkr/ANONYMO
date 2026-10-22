import { Suspense } from "react";
import { listarProyectos } from "@/lib/proyectos";
import { alternos } from "@/lib/idioma";
import { Sala } from "./Sala";

export const metadata = { title: "La sala — Anonymo", description: "Mira al equipo trabajar: cada fase, cada agente, lo que hizo y lo que necesita.", alternates: alternos("/sala") };

export default function Page() {
  return (
    <Suspense>
      <Sala proyectos={listarProyectos()} />
    </Suspense>
  );
}
