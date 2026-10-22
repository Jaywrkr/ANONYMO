import { Suspense } from "react";
import { listarProyectos } from "@/lib/proyectos";
import { alternos } from "@/lib/idioma";
import { Sala } from "./Sala";

export const metadata = { title: "La sala — Anonymo", alternates: alternos("/sala") };

export default function Page() {
  return (
    <Suspense>
      <Sala proyectos={listarProyectos()} />
    </Suspense>
  );
}
