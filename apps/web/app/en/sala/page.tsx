import { Suspense } from "react";
import { listarProyectos } from "@/lib/proyectos";
import { alternos } from "@/lib/idioma";
import { Sala } from "../../sala/Sala";

export const metadata = { title: "The room — Anonymo", alternates: alternos("/sala") };

export default function Page() {
  return (
    <Suspense>
      <Sala proyectos={listarProyectos()} />
    </Suspense>
  );
}
