import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { Suspense } from "react";
import { Avisos } from "@/components/estudio/Avisos";
import { Marco, type EspacioBarra } from "@/components/estudio/Marco";
import { exigirEstudio } from "@/lib/estudio";
import { espacio } from "@/lib/espacio";
import { resumenProyectos } from "@/lib/nube";
import { sesionConfigurada } from "@/lib/sesion";
import { responsable, type Proyecto } from "@anonymo/pipeline";

// Todo el estudio vive dentro del marco: barra de espacios a la izquierda y el contenido en una tarjeta (sistema/32).
export default async function LayoutEstudio({ children }: { children: React.ReactNode }) {
  const yo = await exigirEstudio();
  let todos: Proyecto[] = [];
  try {
    todos = await resumenProyectos();
  } catch (e) {
    // Si la nube no responde, la barra queda vacía pero la página sigue (y la página dirá el error).
    console.error("[estudio] barra sin proyectos:", (e as Error).message);
  }
  const vivos = todos.filter((p) => !p.papelera);
  const orden: Record<string, number> = { plan: 0, esperando: 0, "en-curso": 1, parado: 2, listo: 3 };
  vivos.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  const tocaA = (p: Proyecto) => (p.estado === "plan" ? true : p.estado === "esperando" && responsable(p, p.faseActual) === yo);
  const espacios: EspacioBarra[] = vivos.map((p) => {
    const e = espacio(p.pedido.id);
    const caras = Object.entries(p.tareas)
      .filter(([t, est]) => est === "en-curso" || (p.estado === "esperando" && est === "lista" && t.startsWith(`${p.faseActual}.`)))
      .map(([t]) => t.split(".")[1]);
    return {
      id: p.pedido.id,
      nombre: p.pedido.cliente,
      punto: e.punto,
      marco: e.marco,
      caras: [...new Set(caras)],
      senal: p.estado === "plan" || p.estado === "esperando" ? "toca" : p.estado === "en-curso" ? "vivo" : p.estado === "parado" ? "parado" : p.estado === "listo" ? "listo" : "",
    };
  });
  return (
    <>
      <Suspense fallback={<div className="estudio-marco min-h-dvh" />}>
        <Marco yo={yo} conSalir={sesionConfigurada()} espacios={espacios} tetoca={vivos.filter(tocaA).length} papelera={todos.length - vivos.length}>
          {children}
        </Marco>
      </Suspense>
      <Suspense fallback={null}><Avisos /></Suspense>
    </>
  );
}
