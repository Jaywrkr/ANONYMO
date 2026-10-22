import Link from "next/link";
import { AGENTES, AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { Cumulo } from "@/components/escena/Cumulo";
import { Equipo } from "@/components/ui/Equipo";
import { Linea } from "@/components/ui/Revelar";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export default function Inicio() {
  return (
    <main className="relative">
      {/* Hero: póster. Titular gigante, el grupo de agentes encima. */}
      <section className={`relative ${lateral} pb-10 pt-6`}>
        <h1 className="display relative z-0 text-[clamp(72px,15.5vw,250px)]">
          <Linea i={0}>Trabajamos</Linea>
          <Linea i={1}>mientras</Linea>
          <Linea i={2}>duermes.</Linea>
        </h1>
        <Cumulo className="pointer-events-none relative mt-2 h-[340px] w-full md:absolute md:right-0 md:top-[-2%] md:mt-0 md:h-[78%] md:w-[62%]" />
        <div className="mt-10 grid gap-4 border-t border-tinta pt-4 font-mono text-[11px] uppercase tracking-[0.14em] md:grid-cols-3">
          <span>Agencia creativa · Cuenca, Ecuador</span>
          <span className="text-gris">2 humanos · {AGENTES.length} agentes · {FASES.length} fases</span>
          <span className="text-gris md:text-right">Webs, marcas y experiencias</span>
        </div>
      </section>

      {/* Manifiesto */}
      <section className={`${lateral} grid gap-10 py-24 md:grid-cols-12`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris md:col-span-3">Quiénes somos</p>
        <div className="md:col-span-9">
          <p className="max-w-[30ch] text-[clamp(26px,3.2vw,46px)] font-light leading-[1.12] tracking-[-0.02em]">
            Jay pone el código y el sistema. Luna pone la imagen, la gente y la fiesta. Veintidós agentes se aseguran de que nada se quede a medias.
          </p>
          <p className="display mt-16 text-[clamp(64px,11vw,180px)]">
            Menos humo.<br />Más obra.
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section id="equipo" className={`${lateral} py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(56px,8vw,128px)]">El equipo</h2>
          <p className="max-w-sm text-gris">Cada agente mezcla a los mejores del mundo en su oficio y lleva el objeto de su trabajo. Toca uno para conocerlo.</p>
        </div>
        <Equipo />
      </section>

      {/* Cómo trabajamos */}
      <section id="como" className={`${lateral} py-24`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display text-[clamp(56px,8vw,128px)]">Siete fases</h2>
          <Link href="/sala" className="font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4">Ver la sala en vivo →</Link>
        </div>
        <ol className="border-t border-tinta">
          {FASES.map((f) => (
            <li key={f.n} className="grid grid-cols-[64px_1fr] items-baseline gap-x-6 gap-y-2 border-b border-linea py-5 md:grid-cols-[120px_1.2fr_1.6fr_1fr]">
              <span className="display text-5xl md:text-6xl">{String(f.n).padStart(2, "0")}</span>
              <span className="text-2xl font-light tracking-tight">{f.nombre}</span>
              <span className="col-start-2 text-gris md:col-start-auto">{f.objetivo}</span>
              <span className="col-start-2 flex flex-wrap gap-1.5 md:col-start-auto md:justify-end">
                {f.agentes.map((id) => {
                  const a = agentePorId(id)!;
                  const ar = AREAS[a.area];
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-linea px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                      <i className="block h-2.5 w-2.5 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${ar.luz}, ${ar.medio} 45%, ${ar.sombra})` }} />
                      {a.nombre}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Eventos: la capa de Luna, psicodélica y con grano. */}
      <section className="relative overflow-hidden bg-noche text-hueso">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(40% 55% at 20% 30%, #ff3d8f 0%, transparent 70%), radial-gradient(45% 50% at 75% 65%, #ff8a1f 0%, transparent 70%), radial-gradient(35% 45% at 60% 15%, #6c4cf0 0%, transparent 70%), radial-gradient(30% 40% at 35% 85%, #2fd6b0 0%, transparent 70%)", filter: "blur(30px) saturate(1.2)" }} />
        <div className={`relative ${lateral} grid gap-10 py-28 md:grid-cols-12`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-hueso/70 md:col-span-3">Con Luna</p>
          <div className="md:col-span-9">
            <p className="display text-[clamp(56px,9vw,150px)] mix-blend-difference">También juntamos gente.</p>
            <p className="mt-8 max-w-[44ch] text-lg text-hueso/85">Shootings, lanzamientos y eventos. La marca no termina en la pantalla: se vive en un lugar, con música, luz y personas.</p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className={`${lateral} py-28`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Contacto</p>
        <p className="display mt-6 text-[clamp(64px,12vw,200px)]">¿Tienes un proyecto?</p>
        <p className="mt-6 max-w-md text-gris">Cuéntanos qué necesitas. Atlas arma el plan esa misma noche. El correo llega con el nombre de la agencia.</p>
      </section>
    </main>
  );
}
