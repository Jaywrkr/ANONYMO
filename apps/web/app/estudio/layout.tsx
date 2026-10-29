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
import { listarSolicitudes, nubeActiva, responsable, solicitudesEnNube, type Proyecto } from "@anonymo/pipeline";
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
  const vivos = todos.filter((p) => !p.papelera);
  const orden: Record<string, number> = { plan: 0, esperando: 0, "en-curso": 1, parado: 2, listo: 3 };
  vivos.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  // Lo mismo que cuenta «Te toca» en el inicio: proyectos que esperan tu decisión, lo que escribió el cliente y los pedidos de la web.
  const mio = (p: Proyecto) => momento(p, yo, responsable(p, p.faseActual));
  let solicitudes = 0;
  try { solicitudes = nubeActiva() ? await solicitudesEnNube() : listarSolicitudes().length; } catch {}
  const tetoca = vivos.filter((p) => mio(p).teToca).length + vivos.reduce((s, p) => s + (p.pendientesCliente?.length ?? 0), 0) + solicitudes;
  // La campana (sistema/35): lo pendiente, con su enlace al proyecto (no directo a revisar).
  const avisos = [
    ...vivos.filter((p) => mio(p).teToca).map((p) => ({ href: `/estudio/${p.pedido.id}`, titulo: p.pedido.cliente, detalle: mio(p).ahora, punto: espacio(p.pedido.id, p.marca).punto })),
    ...vivos.flatMap((p) => (p.pendientesCliente ?? []).map((n) => ({ href: `/estudio/${p.pedido.id}?ver=cliente#conversacion`, titulo: p.pedido.cliente, detalle: `Escribió en su portal: «${n.texto.slice(0, 90)}»`, punto: espacio(p.pedido.id, p.marca).punto }))),
    ...(solicitudes ? [{ href: "/estudio#te-toca", titulo: solicitudes === 1 ? "Un pedido nuevo desde la web" : `${solicitudes} pedidos nuevos desde la web`, detalle: "Atlas puede armar el plan con un toque.", punto: "#ff5a1f" }] : []),
  ];
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
    </>
  );
}
