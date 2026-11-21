// Un mes de contenido (sistema/96): las series y las piezas para revisar.
import Link from "next/link";
import { notFound } from "next/navigation";
import { leerMesContenido, nombreMes } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { MesRevision } from "@/components/estudio/contenido/MesRevision";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes de contenido — Estudio", robots: { index: false } };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  const m = await leerMesContenido(id);
  if (!m) notFound();
  return (
    <div className="px-5 py-7 md:px-10">
      <p><Link href="/estudio/contenido" className="text-[13px] text-medio underline-offset-4 hover:underline">← Contenido</Link></p>
      <h1 className={`${serif} mt-3 text-[36px] leading-tight`}>{m.nombre}</h1>
      <p className="mt-1 text-[14px] text-medio">{nombreMes(m.mes).replace(/^./, (x) => x.toUpperCase())} · {m.piezas.length} publicaciones · {m.canales}</p>
      <section aria-label="Series" className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-3">
        {m.series.map((s) => (
          <div key={s.nombre} className="rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
            <p className="text-[15px] font-medium">{s.nombre}</p>
            {s.para && <p className="mt-1 text-[13px] text-medio">{s.para}</p>}
          </div>
        ))}
      </section>
      {m.pedido && <p className="mt-4 max-w-3xl text-[13px] text-medio">Lo que se pidió: {m.pedido}</p>}
      <div className="mt-6 max-w-3xl"><MesRevision inicial={m} /></div>
    </div>
  );
}
