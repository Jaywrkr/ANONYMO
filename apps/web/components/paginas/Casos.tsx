import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { casosPublicos } from "@/lib/proyectos";

import { enlace, type Idioma } from "@/lib/idioma";
import { PruebaSocial } from "@/components/ui/PruebaSocial";
import { Foto, rutaFoto } from "@/components/ui/Foto";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export function Casos({ idioma }: { idioma: Idioma }) {
  const en = idioma === "en";
  const lumen = agentePorId("lumen")!;
  const casos = casosPublicos();
  const huecos = Math.max(0, 3 - casos.length);
  return (
    <main className={lateral}>
      <div className="grid gap-6 pb-16 pt-4 md:grid-cols-12 md:items-end">
        <h1 className="display text-[clamp(80px,13vw,210px)] md:col-span-8">{en ? "Work" : "Casos"}</h1>
        <p className="max-w-sm text-gris md:col-span-4">{en ? "The first case is us: this site is made with the same process we use with every client, in plain sight." : "El primer caso somos nosotros: esta web se hace con el mismo proceso que usamos con cada cliente, a la vista de todos."}</p>
      </div>

      <article className="grid gap-8 border-t border-tinta py-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Case 01 · In progress" : "Caso 01 · En curso"}</p>
          <h2 className="display mt-4 text-[clamp(72px,9vw,150px)]">Anonymo</h2>
          <p className="mt-4 max-w-[46ch] text-xl font-light leading-snug tracking-tight">
            {en ? "Our own agency: name, identity and a website built to compete on Awwwards. It's at phase 4." : "Nuestra propia agencia: nombre, identidad y una web hecha para competir en Awwwards. Va por la fase 4."}
          </p>
          <dl className="mt-10 grid max-w-xl grid-cols-[120px_1fr] gap-x-6 gap-y-3 border-t border-linea pt-4">
            <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Phases" : "Fases"}</dt><dd>{en ? "01 Kickoff → 04 Web" : "01 Arranque → 04 Web"}</dd>
            <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Team" : "Equipo"}</dt><dd>Atlas, Nova, Sonda, Verba, Orla, Lumen, Vector, Kine</dd>
          </dl>
          <Link href={enlace("/sala", idioma)} className="mt-8 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">{en ? "See it in the room →" : "Verlo en la sala →"}</Link>
        </div>
        {rutaFoto("estudio") ? (
          <Foto nombre="estudio" alt={en ? "The studio" : "El estudio"} pendiente="" proporcion="3 / 2" className="md:col-span-5" />
        ) : (
          <AgenteVista agente={lumen} className="aspect-square w-full md:col-span-5" distancia={5.2} />
        )}
      </article>

      <section className="grid gap-3 border-t border-tinta py-12 md:grid-cols-3">
        {casos.map((c, i) => (
          <Link key={c.id} href={`/casos/${c.id}`} className="group flex aspect-[4/5] flex-col justify-between rounded-3xl bg-papel p-6 transition-transform hover:-translate-y-1">
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Case" : "Caso"} {String(i + 2).padStart(2, "0")}</span>
            <span>
              <span className="display block text-6xl">{c.nombre}</span>
              <span className="mt-3 block text-[15px] text-gris">{c.resumen ?? c.descripcion}</span>
            </span>
          </Link>
        ))}
        {Array.from({ length: huecos }, (_, i) => String(casos.length + i + 2).padStart(2, "0")).map((n) => (
          <Link key={n} href={enlace("/contacto", idioma)} className="group flex aspect-[4/5] flex-col justify-between rounded-3xl border border-dashed border-linea p-6 transition-colors hover:border-tinta">
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Case" : "Caso"} {n}</span>
            <span className="display text-6xl text-gris transition-colors group-hover:text-tinta">{en ? "Your project here" : "Tu proyecto aquí"}</span>
          </Link>
        ))}
      </section>
      <PruebaSocial idioma={idioma} />
    </main>
  );
}
