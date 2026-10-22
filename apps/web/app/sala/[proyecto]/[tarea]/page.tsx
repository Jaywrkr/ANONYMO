import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { leerEntrega, listarProyectos, rutasDeEntregas } from "@/lib/proyectos";

type Params = { params: Promise<{ proyecto: string; tarea: string }> };

export function generateStaticParams() {
  return rutasDeEntregas();
}
export const dynamicParams = false;

const MODO: Record<string, string> = { simulado: "Simulado", real: "Escrito por el agente", manual: "Escrito en sesión con Claude" };

export async function generateMetadata({ params }: Params) {
  const { proyecto, tarea } = await params;
  const e = leerEntrega(proyecto, tarea.replace("-", "."));
  return { title: e ? `${e.titulo} — La sala` : "La sala" };
}

// Una entrega completa del pipeline, tal como la dejó el agente.
export default async function Entrega({ params }: Params) {
  const { proyecto, tarea } = await params;
  const id = tarea.replace("-", ".");
  const e = leerEntrega(proyecto, id);
  const p = listarProyectos().find((x) => x.id === proyecto);
  const a = e && agentePorId(e.agente);
  if (!e || !p || !a) notFound();
  const fase = FASES.find((f) => f.n === Number(id.split(".")[0]))!;
  // Sin el título del markdown: ya está arriba.
  const html = await marked.parse(e.contenido.replace(/^# .*\n+/, ""), { gfm: true });
  const tareas = Object.values(p.mensajes).flatMap((m) => Object.values(m)).map((m) => m.tarea!).filter(Boolean);
  const i = tareas.indexOf(id);
  const vecina = (k: number) => tareas[(i + k + tareas.length) % tareas.length];
  const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] pb-16 md:px-10">
      <Link href="/sala" className={`${etiqueta} inline-flex min-h-11 items-center underline underline-offset-4`}>← La sala</Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AgenteVista agente={a} className="aspect-square w-full max-w-[360px]" distancia={5.6} />
          <p className={`${etiqueta} mt-4`}>{p.nombre} · Fase {String(fase.n).padStart(2, "0")} · {fase.nombre}</p>
          <p className="display mt-2 text-7xl">{a.nombre}</p>
          <p className="mt-1 text-lg font-light">{a.rol} · {AREAS[a.area].nombre}</p>
          <p className="mt-6 text-xl font-light leading-snug tracking-tight">“{e.dice}”</p>
          <dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 border-t border-linea pt-4 text-[15px]">
            <dt className={etiqueta}>Necesita</dt>
            <dd>{e.necesita}</dd>
            <dt className={etiqueta}>Versión</dt>
            <dd>{e.version} · {MODO[e.modo] ?? e.modo}</dd>
            {e.nota !== undefined && (<><dt className={etiqueta}>Nota</dt><dd>{e.nota}</dd></>)}
          </dl>
        </aside>
        <article className="max-w-[72ch]">
          <h1 className="display text-[clamp(56px,7vw,112px)]">{e.titulo}</h1>
          <div className="entrega mt-8" dangerouslySetInnerHTML={{ __html: html }} />
          <nav className="mt-16 flex justify-between gap-4 border-t border-tinta pt-4" aria-label="Otras entregas">
            <Link href={`/sala/${proyecto}/${vecina(-1).replace(".", "-")}`} className={`${etiqueta} min-h-11 underline underline-offset-4`}>← Anterior</Link>
            <Link href={`/sala/${proyecto}/${vecina(1).replace(".", "-")}`} className={`${etiqueta} min-h-11 underline underline-offset-4`}>Siguiente →</Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
