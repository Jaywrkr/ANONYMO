import Link from "next/link";
import { notFound } from "next/navigation";
import { FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { casosPublicos } from "@/lib/proyectos";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return casosPublicos().map((c) => ({ id: c.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = casosPublicos().find((x) => x.id === id);
  return { title: `${c?.nombre ?? "Caso"} — Anonymo` };
}

const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

// Un caso real, contado por el equipo que lo hizo. Solo existe si el cliente dio permiso.
export default async function Caso({ params }: Props) {
  const { id } = await params;
  const c = casosPublicos().find((x) => x.id === id);
  if (!c) notFound();
  const fases = c.fases.map((n) => ({ fase: FASES.find((f) => f.n === n)!, mensajes: Object.entries(c.mensajes[n] ?? {}) }));
  return (
    <main className="px-[max(20px,env(safe-area-inset-left))] pb-20 md:px-10">
      <Link href="/casos" className={`${etiqueta} inline-flex min-h-11 items-center underline underline-offset-4`}>← Casos</Link>
      <h1 className="display mt-4 text-[clamp(72px,12vw,200px)]">{c.nombre}</h1>
      <p className="mt-4 max-w-[52ch] text-[clamp(20px,2vw,28px)] font-light leading-snug tracking-tight">{c.resumen ?? c.descripcion}</p>

      {c.cliente && c.cliente.length > 0 && (
        <section className="mt-16 border-t border-tinta pt-6">
          <p className={etiqueta}>Lo que pidió el cliente en el camino</p>
          <ul className="mt-4 grid gap-4">
            {c.cliente.map((n) => (
              <li key={n.fecha + n.texto} className="text-[clamp(28px,3.4vw,52px)] font-light leading-tight tracking-tight">
                “{n.texto}” <span className={`${etiqueta} block md:inline`}>→ lo atendieron {n.agentes.map((a) => agentePorId(a)?.nombre).join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fases.map(({ fase, mensajes }) => (
        <section key={fase.n} className="mt-16 border-t border-tinta pt-6">
          <p className={etiqueta}>{String(fase.n).padStart(2, "0")} · {fase.nombre} · {fase.objetivo}</p>
          <ul className="mt-6 grid gap-8 md:grid-cols-2">
            {mensajes.map(([id, m]) => {
              const a = agentePorId(id)!;
              return (
                <li key={id} className="grid grid-cols-[96px_1fr] items-start gap-4">
                  <AgenteVista agente={a} className="aspect-square w-24" distancia={5.6} />
                  <div>
                    <p className={etiqueta}>{a.nombre} · {m.entrega}</p>
                    <p className="mt-2 text-xl font-light leading-snug">“{m.dice}”</p>
                    {m.tarea && <Link href={`/sala/${c.id}/${m.tarea.replace(".", "-")}`} className={`${etiqueta} mt-2 inline-flex min-h-11 items-center underline underline-offset-4`}>Leer la entrega →</Link>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Link href="/contacto" className="display mt-20 inline-block text-[clamp(48px,7vw,110px)] underline decoration-1 underline-offset-8">¿El tuyo? Hablemos →</Link>
    </main>
  );
}
