import Link from "next/link";
import { FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { enlace, fase, servicio, type Idioma } from "@/lib/idioma";
import { precioFase } from "@/lib/precios";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export function Proceso({ idioma }: { idioma: Idioma }) {
  const en = idioma === "en";
  return (
    <main className={lateral}>
      <div className="grid gap-6 pb-16 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">{en ? "Process" : "Proceso"}</h1>
        <p className="max-w-sm text-gris md:col-span-4">
          {en
            ? "Seven phases. Start at any of them: if you already have a name, we start at identity; if you have a brand, at the website. In each phase you know what you get and who does it."
            : "Siete fases. Puedes entrar por cualquiera: si ya tienes nombre, empezamos en identidad; si ya tienes marca, en la web. En cada fase sabes qué recibes y quién lo hace."}
        </p>
      </div>
      <ol>
        {FASES.map((x) => {
          const f = fase(x.n, idioma);
          const s = servicio(x.n, idioma);
          return (
            <li key={f.n} className="grid gap-8 border-t border-tinta py-12 md:grid-cols-12">
              <div className="md:col-span-5">
                <p className="display text-[clamp(110px,14vw,230px)]">{String(f.n).padStart(2, "0")}</p>
                <h2 className="mt-2 text-4xl font-light tracking-tight">{f.nombre}</h2>
                <p className="mt-2 max-w-sm text-gris">{f.objetivo}</p>
              </div>
              <div className="grid content-start gap-8 md:col-span-7">
                <dl className="grid grid-cols-[120px_1fr] gap-x-6 gap-y-3">
                  <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "You get" : "Recibes"}</dt>
                  <dd>
                    <ul className="grid gap-1">
                      {s.entrega.map((e) => (
                        <li key={e} className="text-xl font-light tracking-tight">{e}</li>
                      ))}
                    </ul>
                  </dd>
                  <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Typical length" : "Duración típica"}</dt>
                  <dd>{s.dura}</dd>
                  <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Price" : "Precio"}</dt>
                  <dd>{precioFase(x.n, idioma).texto}</dd>
                </dl>
                <ul className="flex flex-wrap gap-2">
                  {f.agentes.map((id) => {
                    const a = agentePorId(id)!;
                    return (
                      <li key={id} className="w-24">
                        <Link href={enlace(`/agentes/${id}`, idioma)} className="block">
                          <AgenteVista agente={a} className="aspect-square w-full" />
                          <span className="block text-center font-mono text-[12px] uppercase tracking-[0.12em]">{a.nombre}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="max-w-xl border-t border-tinta pt-6 text-[15px] text-gris">
        {en
          ? "Each phase is priced on its own and you only pay for the ones you need. The exact number comes in phase 01, once Atlas and Ledger understand the project."
          : "Cada fase se cobra por separado y solo pagas las que necesitas. El número exacto sale en la fase 01, cuando Atlas y Ledger entienden el proyecto."}
      </p>
      <div className="mt-8 border-t border-tinta pt-12">
        <Link href={enlace("/sala", idioma)} className="font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">{en ? "See a live project in the room →" : "Ver un proyecto en vivo en la sala →"}</Link>
      </div>
    </main>
  );
}
