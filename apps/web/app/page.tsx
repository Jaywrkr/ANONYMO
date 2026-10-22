import Link from "next/link";
import { AGENTES, FASES } from "@anonymo/agentes";
import { Cumulo } from "@/components/escena/Cumulo";
import { Equipo } from "@/components/ui/Equipo";
import { Linea } from "@/components/ui/Revelar";
import { FasesScroll } from "@/components/ui/FasesScroll";
import { Reloj } from "@/components/ui/Reloj";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export default function Inicio() {
  return (
    <main className="relative">
      {/* Hero: póster. Titular gigante, el grupo de agentes encima. */}
      <section className={`hero relative ${lateral} pb-10 pt-6 transition-colors duration-700`}>
        <h1 className="display display-apretada relative z-0 text-[clamp(72px,15.5vw,250px)]">
          <Linea i={0}>Trabajamos</Linea>
          <Linea i={1}>mientras</Linea>
          <Linea i={2}>duermes.</Linea>
        </h1>
        <Cumulo className="pointer-events-none relative mt-2 h-[340px] w-full md:absolute md:right-0 md:top-[-2%] md:mt-0 md:h-[78%] md:w-[52%]" />
        <div className="mt-10 grid gap-4 border-t border-tinta pt-4 font-mono text-[12px] uppercase tracking-[0.14em] md:grid-cols-3">
          <span>Agencia creativa · Cuenca, Ecuador</span>
          <span className="text-gris"><Reloj /></span>
          <span className="text-gris md:text-right">2 humanos · {AGENTES.length} agentes · {FASES.length} fases</span>
        </div>
      </section>

      {/* Manifiesto */}
      <section className={`${lateral} grid gap-10 py-16 md:grid-cols-12`}>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris md:col-span-3">Quiénes somos</p>
        <div className="md:col-span-9">
          <p className="max-w-[30ch] text-[clamp(26px,3.2vw,46px)] font-light leading-[1.12] tracking-[-0.02em]">
            Jay pone el código y el sistema. Luna pone la imagen, la gente y la fiesta. Veintidós agentes se aseguran de que nada se quede a medias.
          </p>
          <p className="display mt-16 text-[clamp(64px,11vw,180px)]">
            <span className="block">Menos humo.</span><span className="block pt-[0.14em]">Más obra.</span>
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section id="equipo" className={`${lateral} py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(56px,8vw,128px)]">El equipo</h2>
          <p className="max-w-sm text-[17px] text-gris">Cada agente mezcla a los mejores del mundo en su oficio y lleva el objeto de su trabajo. Toca uno para conocerlo. <a href="/agentes" className="text-tinta underline underline-offset-4">Ver por área</a></p>
        </div>
        <Equipo />
      </section>

      {/* Cómo trabajamos: secuencia horizontal */}
      <FasesScroll />

      {/* Eventos: la capa de Luna, psicodélica y con grano. */}
      <section className="relative overflow-hidden bg-noche text-hueso">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(40% 55% at 20% 30%, #ff3d8f 0%, transparent 70%), radial-gradient(45% 50% at 75% 65%, #ff8a1f 0%, transparent 70%), radial-gradient(35% 45% at 60% 15%, #6c4cf0 0%, transparent 70%), radial-gradient(30% 40% at 35% 85%, #2fd6b0 0%, transparent 70%)", filter: "blur(30px) saturate(1.2)" }} />
        <div className={`relative ${lateral} grid gap-10 py-28 md:grid-cols-12`}>
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-hueso/70 md:col-span-3">Con Luna</p>
          <div className="md:col-span-9">
            <p className="display text-[clamp(56px,9vw,150px)] text-hueso">También juntamos gente.</p>
            <p className="mt-8 max-w-[44ch] text-lg text-hueso/85">Shootings, lanzamientos y eventos. La marca no termina en la pantalla: se vive en un lugar, con música, luz y personas.</p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className={`${lateral} py-28`}>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">Contacto</p>
        <p className="display mt-6 text-[clamp(64px,12vw,200px)]">¿Tienes un proyecto?</p>
        <p className="mt-10 max-w-md text-lg text-gris">Cuéntanos qué necesitas. Atlas arma el plan esa misma noche.</p>
        <Link href="/contacto" className="mt-8 inline-block rounded-full bg-tinta px-8 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-hueso">Escríbenos</Link>
      </section>
    </main>
  );
}
