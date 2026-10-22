import Link from "next/link";
import { AGENTES, FASES } from "@anonymo/agentes";
import { CumuloDiferido as Cumulo } from "@/components/escena/CumuloDiferido";
import { Equipo } from "@/components/ui/Equipo";
import { Linea } from "@/components/ui/Revelar";
import { FasesScroll } from "@/components/ui/FasesScroll";
import { Reloj } from "@/components/ui/Reloj";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

import { enlace, type Idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";

export function Inicio({ idioma }: { idioma: Idioma }) {
  const t = T[idioma].inicio;
  return (
    <main className="relative">
      {/* Hero: póster. Titular gigante, el grupo de agentes encima. */}
      <section className={`hero relative ${lateral} pb-10 pt-6 transition-colors duration-700`}>
        <h1 className="display display-apretada relative z-0 text-[clamp(72px,15.5vw,250px)]">
          <Linea i={0}>{t.titulo[0]}</Linea>
          <Linea i={1}>{t.titulo[1]}</Linea>
          <Linea i={2}>{t.titulo[2]}</Linea>
        </h1>
        <Cumulo className="pointer-events-none relative mt-2 h-[340px] w-full md:absolute md:right-0 md:top-[-2%] md:mt-0 md:h-[78%] md:w-[52%]" />
        <div className="mt-10 grid gap-4 border-t border-tinta pt-4 font-mono text-[12px] uppercase tracking-[0.14em] md:grid-cols-3">
          <span>{t.agencia}</span>
          <span className="text-gris"><Reloj /></span>
          <span className="text-gris md:text-right">{t.cuenta(AGENTES.length, FASES.length)}</span>
        </div>
      </section>

      {/* Manifiesto */}
      <section className={`${lateral} grid gap-10 py-16 md:grid-cols-12`}>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris md:col-span-3">{t.quienes}</p>
        <div className="md:col-span-9">
          <p className="max-w-[30ch] text-[clamp(26px,3.2vw,46px)] font-light leading-[1.12] tracking-[-0.02em]">
            {t.manifiesto}
          </p>
          <p className="display mt-16 text-[clamp(64px,11vw,180px)]">
            <span className="block">{t.lema[0]}</span><span className="block pt-[0.14em]">{t.lema[1]}</span>
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section id="equipo" className={`${lateral} py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(56px,8vw,128px)]">{t.equipo}</h2>
          <p className="max-w-sm text-[17px] text-gris">{t.equipoTexto} <a href={enlace("/agentes", idioma)} className="text-tinta underline underline-offset-4">{t.porArea}</a></p>
        </div>
        <Equipo />
      </section>

      {/* Cómo trabajamos: secuencia horizontal */}
      <FasesScroll />

      {/* Eventos: la capa de Luna, psicodélica y con grano. */}
      <section className="relative overflow-hidden bg-noche text-hueso">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(40% 55% at 20% 30%, #ff3d8f 0%, transparent 70%), radial-gradient(45% 50% at 75% 65%, #ff8a1f 0%, transparent 70%), radial-gradient(35% 45% at 60% 15%, #6c4cf0 0%, transparent 70%), radial-gradient(30% 40% at 35% 85%, #2fd6b0 0%, transparent 70%)", filter: "blur(30px) saturate(1.2)" }} />
        <div className={`relative ${lateral} grid gap-10 py-28 md:grid-cols-12`}>
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-hueso/70 md:col-span-3">{t.conLuna}</p>
          <div className="md:col-span-9">
            <p className="display text-[clamp(56px,9vw,150px)] text-hueso">{t.gente}</p>
            <p className="mt-8 max-w-[44ch] text-lg text-hueso/85">{t.genteTexto}</p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className={`${lateral} py-28`}>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{t.contacto}</p>
        <p className="display mt-6 text-[clamp(64px,12vw,200px)]">{t.proyecto}</p>
        <p className="mt-10 max-w-md text-lg text-gris">{t.proyectoTexto}</p>
        <Link href={enlace("/contacto", idioma)} className="mt-8 inline-block rounded-full bg-tinta px-8 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-hueso">{t.escribenos}</Link>
      </section>
    </main>
  );
}
