import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { Suspense } from "react";
import { Avisos } from "@/components/estudio/Avisos";
import { Trabajando } from "@/components/estudio/Trabajando";
import { Marco, type EspacioBarra } from "@/components/estudio/Marco";
import { exigirEstudio } from "@/lib/estudio";
import { espacio } from "@/lib/espacio";
import { resumenProyectos } from "@/lib/nube";
import { sesionConfigurada } from "@/lib/sesion";
import { responsable, type Proyecto } from "@anonymo/pipeline";
import { pendientes } from "@/lib/pendientes";
import { Vigia } from "@/components/estudio/Vigia";
import { momento } from "@/lib/camino";

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
  // Lo pendiente (campana y contador): lo mismo que cuenta «Te toca» en el inicio.
  const { avisos, vivos, solicitudes } = await pendientes(yo, todos);
  const orden: Record<string, number> = { plan: 0, esperando: 0, "en-curso": 1, parado: 2, listo: 3 };
  vivos.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  const mio = (p: Proyecto) => momento(p, yo, responsable(p, p.faseActual));
  const tetoca = avisos.length + Math.max(0, solicitudes - 1);
  const espacios: EspacioBarra[] = vivos.map((p) => {
    const e = espacio(p.pedido.id, p.marca);
    const caras = Object.entries(p.tareas)
      .filter(([t, est]) => est === "en-curso" || (p.estado === "esperando" && est === "lista" && t.startsWith(`${p.faseActual}.`)))
      .map(([t]) => t.split(".")[1]);
    return {
      id: p.pedido.id,
      nombre: p.pedido.cliente,
      punto: e.punto,
      marco: e.marco,
      caras: [...new Set(caras)],
      senal: ((t) => (t === "toca" || t === "otro" || t === "cortado" ? "toca" : t === "vivo" ? "vivo" : t === "pausa" ? "parado" : "listo"))(mio(p).tono),
    };
  });
  return (
    <>
      <Suspense fallback={<div className="estudio-marco min-h-dvh" />}>
        <Marco yo={yo} conSalir={sesionConfigurada()} espacios={espacios} tetoca={tetoca} avisos={avisos} papelera={todos.length - vivos.length}>
          {children}
        </Marco>
      </Suspense>
      <Suspense fallback={null}><Avisos /></Suspense>
      <Suspense fallback={null}><Trabajando /></Suspense>
      <Vigia inicial={avisos.map((a) => a.clave)} />
    </>
  );
}
