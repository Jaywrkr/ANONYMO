import Link from "next/link";
import { testimonios } from "@/lib/proyectos";
import { enlace, type Idioma } from "@/lib/idioma";

// Lo que dicen los clientes (web/13). Solo aparece cuando hay testimonios reales de casos públicos: nunca inventados.
export function PruebaSocial({ idioma }: { idioma: Idioma }) {
  const lista = testimonios();
  if (!lista.length) return null;
  const en = idioma === "en";
  return (
    <section aria-label={en ? "What clients say" : "Lo que dicen los clientes"} className="px-[max(20px,env(safe-area-inset-left))] py-20 md:px-10">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "What clients say" : "Lo que dicen los clientes"}</p>
      <ul className="mt-8 grid gap-10 md:grid-cols-2">
        {lista.map((t) => (
          <li key={t.caso}>
            <figure>
              <blockquote className="text-[clamp(26px,3vw,44px)] font-light leading-[1.12] tracking-tight">“{t.texto}”</blockquote>
              <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-4 font-mono text-[12px] uppercase tracking-[0.14em] text-gris">
                <span>{t.autor}</span>
                <Link href={enlace(`/casos/${t.caso}`, idioma)} className="underline underline-offset-4">{en ? "See the case" : "Ver el caso"} →</Link>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
