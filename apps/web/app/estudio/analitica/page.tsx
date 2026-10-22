import { agentePorId } from "@anonymo/agentes";
import { resumenAnalitica } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { etiqueta, exigirEstudio, lateral } from "@/lib/estudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas — Estudio", robots: { index: false } };

// El tablero de Pulso: lo que pasa en la web, sin cookies (web/19).
export default async function Analitica({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await exigirEstudio();
  await traer("_analitica");
  const dias = Number((await searchParams).dias) || 30;
  const r = resumenAnalitica(dias);
  const cifra = (n: string | number, t: string) => (
    <div className="rounded-3xl bg-papel p-6"><p className={etiqueta}>{t}</p><p className="display mt-2 text-6xl">{n}</p></div>
  );
  const lista = (t: string, l: [string, number][], nombre = (k: string) => k) => (
    <div className="rounded-3xl border border-linea p-6">
      <p className={etiqueta}>{t}</p>
      <ul className="mt-3 grid gap-1 text-[15px]">{l.length ? l.map(([k, n]) => <li key={k} className="flex justify-between gap-4"><span className="truncate">{nombre(k)}</span><span>{n}</span></li>) : <li className="text-gris">Sin datos todavía.</li>}</ul>
    </div>
  );
  return (
    <main className={`${lateral} pb-16`}>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-4">
        <h1 className="display text-[clamp(64px,10vw,160px)]">Métricas</h1>
        <nav className="flex gap-3 font-mono text-[12px] uppercase tracking-[0.12em]">
          {[7, 30, 90].map((d) => <a key={d} href={`?dias=${d}`} aria-current={d === dias ? "page" : undefined} className={d === dias ? "underline underline-offset-4" : "text-gris"}>{d} días</a>)}
        </nav>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {cifra(r.vistas, "Visitas")}
        {cifra(`${r.salaSegundos} s`, "Tiempo promedio en la sala")}
        {cifra(r.formularios, "Pedidos desde el formulario")}
        {cifra(`${r.celular}% · ${r.ingles}%`, "Celular · en inglés")}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {lista("Páginas más vistas", r.paginas)}
        {lista("De dónde vienen", r.origenes)}
        {lista("Agentes más vistos en la sala", r.agentes, (k) => agentePorId(k)?.nombre ?? k)}
      </div>
      <p className="mt-6 max-w-xl text-[14px] text-gris">Sin cookies ni IP: solo página, evento, idioma, tipo de equipo y el dominio de origen. Respeta “No rastrear”. Los datos quedan en proyectos/_analitica (fuera del repo).</p>
    </main>
  );
}
