// Un mes de contenido como un planner (sistema/96; planner en sistema/114): el calendario con el arte de cada día.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ESTILOS, estiloPara, leerMesContenido, listarPiezasFaro, nombreMes } from "@anonymo/pipeline";
import { proyectosDe, leerFichas } from "@anonymo/pipeline";
import { exigirEstudio, serif, titulo } from "@/lib/estudio";
import { PlannerMes } from "@/components/estudio/contenido/PlannerMes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes de contenido — Estudio", robots: { index: false } };

/** Las redes del cliente, de su ficha («Dónde publica»): solo esas se muestran y para esas se escribe. */
const REDES: [RegExp, string][] = [[/instagram/i, "Instagram"], [/tiktok/i, "TikTok"], [/youtube|shorts/i, "YouTube"], [/linkedin/i, "LinkedIn"], [/facebook/i, "Facebook"], [/\bx\b|twitter|threads/i, "X / Threads"]];

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  const m = await leerMesContenido(id);
  if (!m) notFound();
  const estilo = m.estiloArte ?? ((m.estilo && ESTILOS[m.estilo]) || estiloPara(m.cliente, m.nombre));
  // Las piezas que Faro diseña para este mes (sistema/127) y si el cliente tiene trabajo real para que las diseñe.
  const faro = (await listarPiezasFaro(m.cliente).catch(() => [])).filter((x) => x.enMes?.mes === m.id);
  const conTrabajo = proyectosDe((await leerFichas().catch(() => ({ fichas: {} as Record<string, never> }))).fichas[m.cliente]?.direccion).length > 0;
  const redes = REDES.filter(([r]) => r.test(m.canales)).map(([, n]) => n);
  return (
    <div className="px-4 py-7 md:px-10">
      <p><Link href="/estudio/contenido" className="text-[13px] text-medio underline-offset-4 hover:underline">← Contenido</Link></p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <h1 className={`${titulo}`}>{m.nombre} <span className="text-medio">· {nombreMes(m.mes)}</span></h1>
        <p className="flex flex-wrap items-center gap-1.5 pb-2" aria-label="Dónde publica" data-redes>
          {(redes.length ? redes : [m.canales]).map((r) => <span key={r} className="rounded-full bg-white px-3 py-1 text-[12px] shadow-[inset_0_0_0_1px_var(--color-borde)]">{r}</span>)}
          <span className="text-[12px] text-suave">· {m.piezas.length} publicaciones</span>
        </p>
      </div>
      {m.pedido && <p className="mt-1 max-w-3xl text-[13px] text-medio">Lo que se pidió: {m.pedido}</p>}
      <div className="mt-5"><PlannerMes inicial={m} estilo={estilo} faro={faro} conTrabajo={conTrabajo} /></div>
    </div>
  );
}
