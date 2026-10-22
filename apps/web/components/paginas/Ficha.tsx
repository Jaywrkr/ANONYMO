import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTES, FASES, agentePorId, localizar } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { PROYECTO, ESTADO_TEXTO } from "@/lib/proyecto";
import { PROYECTO_EN, ESTADO_TEXTO_EN } from "@/lib/proyecto-en";
import { area as nombreArea, enlace, fase, type Idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";

export function Ficha({ id, idioma }: { id: string; idioma: Idioma }) {
  const base = agentePorId(id);
  if (!base) notFound();
  const a = localizar(base, idioma);
  const t = T[idioma].ficha;
  const proyecto = idioma === "en" ? PROYECTO_EN : PROYECTO;
  const estados = idioma === "en" ? ESTADO_TEXTO_EN : ESTADO_TEXTO;
  const i = AGENTES.indexOf(base);
  const prev = AGENTES[(i - 1 + AGENTES.length) % AGENTES.length];
  const next = AGENTES[(i + 1) % AGENTES.length];
  const area = { nombre: nombreArea(a.area, idioma) };
  const fases = FASES.filter((f) => f.agentes.includes(a.id)).map((f) => fase(f.n, idioma));
  const trabajos = fases.map((f) => ({ f, m: proyecto.mensajes[f.n]?.[a.id] })).filter((x) => x.m);
  const ultimo = trabajos.find((x) => x.m!.estado !== "por-empezar") ?? trabajos[0];

  return (
    <main className="grid gap-6 px-[max(20px,env(safe-area-inset-left))] md:grid-cols-2 md:px-10">
      <div className="md:sticky md:top-0 md:h-[88vh] md:pl-8">
        <AgenteVista agente={base} className="aspect-square w-full md:aspect-auto md:h-full" distancia={6.2} />
      </div>
      <div className="flex flex-col justify-center py-6 md:py-16">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">
          {String(i + 1).padStart(2, "0")} / {AGENTES.length} · {area.nombre}
        </p>
        <h1 className="display mt-4 text-[clamp(96px,14vw,220px)]">{a.nombre}</h1>
        <p className="mt-2 text-2xl font-light tracking-tight">{a.rol}</p>
        <p className="mt-10 max-w-[24ch] text-[clamp(26px,2.6vw,38px)] font-light leading-[1.12] tracking-tight">“{a.frase}”</p>
        <dl className="mt-12 grid grid-cols-[120px_1fr] gap-x-6 gap-y-4 border-t border-tinta pt-5">
          {[
            [t.caracter, a.caracter],
            [t.influencias, a.adn],
            [t.superpoder, a.superpoder],
            [t.objeto, a.propNombre],
            [t.fases, fases.map((f) => `${String(f.n).padStart(2, "0")} ${f.nombre}`).join(" · ")],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{k}</dt>
              <dd className="text-base">{v}</dd>
            </div>
          ))}
        </dl>
        {ultimo && (
          <section className="mt-12 rounded-3xl bg-papel p-6">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">
              {t.actual} · {t.fase} {String(ultimo.f.n).padStart(2, "0")} {ultimo.f.nombre} · {estados[ultimo.m!.estado]}
            </p>
            <p className="mt-3 text-xl font-light leading-snug tracking-tight">“{ultimo.m!.dice}”</p>
            <p className="mt-3 text-[15px]"><span className="text-gris">{t.entrega}</span> {ultimo.m!.entrega}</p>
          </section>
        )}
        <div className="mt-12 flex justify-between font-mono text-[12px] uppercase tracking-[0.14em]">
          <Link href={enlace(`/agentes/${prev.id}`, idioma)} className="hover:underline">← {prev.nombre}</Link>
          <Link href={enlace("/sala", idioma)} className="text-gris hover:text-tinta">{t.sala}</Link>
          <Link href={enlace(`/agentes/${next.id}`, idioma)} className="hover:underline">{next.nombre} →</Link>
        </div>
      </div>
    </main>
  );
}
