import Link from "next/link";
import { notFound } from "next/navigation";
import { agentePorId, FASES } from "@anonymo/agentes";
import { existe, leerEntrega, leerProyecto, type TareaId } from "@anonymo/pipeline";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { html } from "@/lib/markdown";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrega — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string; tarea: string }> };

export default async function EntregaEstudio({ params }: Props) {
  exigirEstudio();
  const { id, tarea } = await params;
  const t = tarea.replace("-", ".") as TareaId;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const e = leerEntrega(id, t);
  const a = agentePorId(t.split(".")[1]);
  if (!a || !p.plan.tareas.includes(t)) notFound();
  const fase = FASES.find((f) => f.n === Number(t.split(".")[0]))!;
  return (
    <main className={`${lateral} pb-16`}>
      <Link href={`/estudio/${id}`} className={`${etiqueta} inline-flex min-h-11 items-center underline underline-offset-4`}>← {p.pedido.cliente}</Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AgenteVista agente={a} className="aspect-square w-full max-w-[320px]" distancia={5.6} />
          <p className={`${etiqueta} mt-4`}>Fase {String(fase.n).padStart(2, "0")} · {fase.nombre}</p>
          <p className="display mt-2 text-7xl">{a.nombre}</p>
          {e && <p className="mt-4 text-xl font-light leading-snug">“{e.dice}”</p>}
          {e && <p className="mt-4 text-[15px]"><span className={etiqueta}>Necesita</span><br />{e.necesita}</p>}
          {e && <p className={`${etiqueta} mt-4`}>v{e.version} · {e.modo}</p>}
        </aside>
        <article className="max-w-[72ch]">
          <h1 className="display text-[clamp(48px,6vw,96px)]">{e?.titulo ?? "Sin entrega todavía"}</h1>
          {e && <div className="entrega mt-8" dangerouslySetInnerHTML={{ __html: html(e.contenido) }} />}
        </article>
      </div>
    </main>
  );
}
