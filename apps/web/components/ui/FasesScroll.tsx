"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useQuieto } from "@/lib/movimiento";
import { usePathname } from "next/navigation";
import { AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { enlace, fase, idiomaDeRuta, servicio, type Idioma } from "@/lib/idioma";

function Tarjeta({ n, idioma }: { n: number; idioma: Idioma }) {
  const f = fase(n, idioma);
  const s = servicio(n, idioma);
  return (
    <article className="flex h-full w-[82vw] shrink-0 flex-col justify-between rounded-[28px] border border-linea bg-papel p-6 sm:w-[60vw] md:w-[38vw] md:p-8">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="display text-[clamp(96px,10vw,160px)]">{String(n).padStart(2, "0")}</span>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{s.dura}</span>
        </div>
        <h3 className="text-4xl font-light tracking-tight">{f.nombre}</h3>
        <p className="mt-2 text-[17px] text-gris">{f.objetivo}</p>
        <ul className="mt-6 grid gap-1 border-t border-linea pt-4 text-lg font-light tracking-tight">
          {s.entrega.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </div>
      <ul className="mt-6 flex flex-wrap gap-1">
        {f.agentes.map((id) => {
          const a = agentePorId(id)!;
          return (
            <li key={id} className="w-[72px]">
              <AgenteVista agente={a} className="aspect-square w-full" />
              <span className="block text-center font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: AREAS[a.area].texto ?? AREAS[a.area].sombra }}>{a.nombre}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// Escritorio: la sección se queda fija y las fases pasan de lado mientras haces scroll.
// Móvil o movimiento reducido: fila horizontal que se desliza con el dedo.
export function FasesScroll() {
  const seccion = useRef<HTMLElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const quieto = useQuieto();
  const idioma = idiomaDeRuta(usePathname());
  const en = idioma === "en";
  const [desplazar, setDesplazar] = useState(0);
  const [fijo, setFijo] = useState(false);
  useEffect(() => {
    const medir = () => {
      const ok = window.innerWidth >= 768 && !quieto;
      setFijo(ok);
      if (pista.current) setDesplazar(Math.max(0, pista.current.scrollWidth - window.innerWidth + 80));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [quieto]);
  const { scrollYProgress } = useScroll({ target: seccion, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -desplazar]);

  const cabecera = (
    <div className="flex flex-wrap items-end justify-between gap-6 px-[max(20px,env(safe-area-inset-left))] md:px-10">
      <h2 className="display text-[clamp(56px,8vw,128px)]">{en ? "Seven phases" : "Siete fases"}</h2>
      <p className="max-w-sm text-[17px] text-gris">{en ? "Start at any of them. In each one you know what you get, how long it takes and who does it." : "Puedes entrar por cualquiera. En cada una sabes qué recibes, cuánto dura y quién lo hace."}</p>
    </div>
  );
  const fin = (
    <Link href={enlace("/sala", idioma)} className="flex w-[70vw] shrink-0 items-center justify-center rounded-[28px] bg-tinta p-8 text-hueso sm:w-[40vw] md:w-[28vw]">
      <span className="display text-[clamp(56px,6vw,96px)]">{en ? "Enter the room →" : "Entra a la sala →"}</span>
    </Link>
  );

  if (!fijo) {
    return (
      <section id="como" className="py-16">
        {cabecera}
        <div className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(20px,env(safe-area-inset-left))] pb-4">
          {FASES.map((f) => <div key={f.n} className="snap-start"><Tarjeta n={f.n} idioma={idioma} /></div>)}
          {fin}
        </div>
      </section>
    );
  }
  return (
    <section id="como" ref={seccion} style={{ height: `calc(100vh + ${desplazar}px)` }} className="relative">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-8 overflow-hidden py-10">
        {cabecera}
        <motion.div ref={pista} style={{ x }} className="flex h-[min(62vh,600px)] gap-4 pl-10 pr-10">
          {FASES.map((f) => <Tarjeta key={f.n} n={f.n} idioma={idioma} />)}
          {fin}
        </motion.div>
      </div>
    </section>
  );
}
