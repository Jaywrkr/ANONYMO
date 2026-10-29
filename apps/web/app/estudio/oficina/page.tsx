import { listar } from "@anonymo/pipeline";
import { Oficina } from "@/components/estudio/Oficina";
import { traerTodo } from "@/lib/nube";
import { exigirEstudio, serif } from "@/lib/estudio";
import type { ProyectoOficina } from "@/lib/oficina";

export const dynamic = "force-dynamic";
export const metadata = { title: "El estudio — Anonymo", robots: { index: false } };

// La oficina en grande: los 22 en sus escritorios, en 3D. Tocas a uno y ves en qué está.
export default async function OficinaPagina() {
  await exigirEstudio();
  await traerTodo();
  const proyectos: ProyectoOficina[] = listar()
    .filter((p) => p.estado !== "listo")
    .map((p) => ({ id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas, revision: p.revision }));
  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <p className="text-[13px] text-suave">El estudio · 22 agentes en 6 áreas</p>
      <h1 className={`${serif} mt-1 text-[clamp(36px,4.4vw,56px)] leading-[1]`}>Quién está en qué.</h1>
      <p className="mt-3 max-w-xl text-[15px] text-medio">Toca a cualquiera para ver sus trabajos. Los que trabajan brillan en verde; los que esperan tu revisión, en naranja.</p>
      <div className="mt-8"><Oficina proyectos={proyectos} /></div>
    </div>
  );
}
