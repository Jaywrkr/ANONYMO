import Link from "next/link";
import { notFound } from "next/navigation";
import { agentePorId, FASES } from "@anonymo/agentes";
import { contarCambios, diferencias, existe, leerEntrega, leerProyecto, versiones, type TareaId } from "@anonymo/pipeline";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { html } from "@/lib/markdown";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrega — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string; tarea: string }>; searchParams: Promise<{ v?: string; comparar?: string }> };

export default async function EntregaEstudio({ params, searchParams }: Props) {
  exigirEstudio();
  const { id, tarea } = await params;
  const { v, comparar } = await searchParams;
  const t = tarea.replace("-", ".") as TareaId;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const actual = leerEntrega(id, t);
  const anteriores = versiones(id, t);
  const e = v ? leerEntrega(id, t, Number(v)) ?? actual : actual;
  const contra = comparar ? leerEntrega(id, t, Number(comparar)) : undefined;
  const diff = contra && actual ? diferencias(contra.contenido, actual.contenido) : undefined;
  const base = `/estudio/${id}/${tarea}`;
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
          {actual && anteriores.length > 0 && (
            <nav aria-label="Versiones" className="mt-4 flex flex-wrap items-center gap-2">
              <span className={etiqueta}>Versiones</span>
              <a href={base} aria-current={!v && !comparar ? "page" : undefined} className={`rounded-full border px-3 py-1 text-[14px] ${!v && !comparar ? "border-tinta bg-tinta text-hueso" : "border-linea"}`}>v{actual.version} actual</a>
              {anteriores.map((n) => (
                <span key={n} className="flex gap-1">
                  <a href={`${base}?v=${n}`} aria-current={v === String(n) ? "page" : undefined} className={`rounded-full border px-3 py-1 text-[14px] ${v === String(n) ? "border-tinta bg-tinta text-hueso" : "border-linea"}`}>v{n}</a>
                  <a href={`${base}?comparar=${n}`} className={`rounded-full px-2 py-1 text-[14px] underline underline-offset-4 ${comparar === String(n) ? "font-medium" : "text-gris"}`}>comparar</a>
                </span>
              ))}
            </nav>
          )}
          {diff ? (
            <div className="mt-8">
              <p className={etiqueta}>v{comparar} → v{actual!.version} · +{contarCambios(diff).agregadas} −{contarCambios(diff).quitadas} líneas</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-papel p-4 font-mono text-[13px] leading-6">
                {diff.map((l, i) => (
                  <div key={i} className={l.tipo === "agregada" ? "bg-[#dff3e4] text-[#0b4a1f]" : l.tipo === "quitada" ? "bg-[#fde8e4] text-[#7a1a0c] line-through decoration-1" : "text-gris"}>
                    {l.tipo === "agregada" ? "+ " : l.tipo === "quitada" ? "− " : "  "}{l.texto || " "}
                  </div>
                ))}
              </pre>
            </div>
          ) : (
            e && <div className="entrega mt-8" dangerouslySetInnerHTML={{ __html: html(e.contenido) }} />
          )}
        </article>
      </div>
    </main>
  );
}
