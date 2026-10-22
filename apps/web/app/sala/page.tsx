import { Suspense } from "react";
import { listarProyectos } from "@/lib/proyectos";
import { Sala } from "./Sala";

export const metadata = { title: "La sala — Anonymo" };

export default function Page() {
  return (
    <Suspense>
      <Sala proyectos={listarProyectos()} />
    </Suspense>
  );
}
