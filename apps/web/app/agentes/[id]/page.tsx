import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTES, AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const a = agentePorId((await params).id);
  return { title: a ? `${a.nombre} — Anonymo` : "Anonymo" };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = agentePorId(id);
  if (!a) notFound();
  const i = AGENTES.indexOf(a);
  const prev = AGENTES[(i - 1 + AGENTES.length) % AGENTES.length];
  const next = AGENTES[(i + 1) % AGENTES.length];
  const area = AREAS[a.area];
  const fases = FASES.filter((f) => f.agentes.includes(a.id));

  return (
    <main className="grid gap-6 px-[max(20px,env(safe-area-inset-left))] md:grid-cols-2 md:px-10">
      <div className="md:sticky md:top-0 md:h-[88vh]">
        <AgenteVista agente={a} className="aspect-square w-full md:aspect-auto md:h-full" distancia={6.2} />
      </div>
      <div className="flex flex-col justify-center py-6 md:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">
          {String(i + 1).padStart(2, "0")} / {AGENTES.length} · {area.nombre}
        </p>
        <h1 className="display mt-4 text-[clamp(96px,14vw,220px)]">{a.nombre}</h1>
        <p className="mt-2 text-2xl font-light tracking-tight">{a.rol}</p>
        <p className="mt-10 max-w-[24ch] text-[clamp(26px,2.6vw,38px)] font-light leading-[1.12] tracking-tight">“{a.frase}”</p>
        <dl className="mt-12 grid grid-cols-[120px_1fr] gap-x-6 gap-y-4 border-t border-tinta pt-5">
          {[
            ["Carácter", a.caracter],
            ["Su ADN", a.adn],
            ["Superpoder", a.superpoder],
            ["Su objeto", a.propNombre],
            ["Fases", fases.map((f) => `${String(f.n).padStart(2, "0")} ${f.nombre}`).join(" · ")],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">{k}</dt>
              <dd className="text-base">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
          <Link href={`/agentes/${prev.id}`} className="hover:underline">← {prev.nombre}</Link>
          <Link href="/sala" className="text-gris hover:text-tinta">La sala</Link>
          <Link href={`/agentes/${next.id}`} className="hover:underline">{next.nombre} →</Link>
        </div>
      </div>
    </main>
  );
}
