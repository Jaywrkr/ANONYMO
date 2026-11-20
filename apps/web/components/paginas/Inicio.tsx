import Image from "next/image";
import Link from "next/link";
import { Linea } from "@/components/ui/Revelar";
import { PruebaSocial } from "@/components/ui/PruebaSocial";
import { DatosEstructurados } from "@/components/ui/DatosEstructurados";
import { Foto } from "@/components/ui/Foto";
import { enlace, type Idioma } from "@/lib/idioma";
import { textosInicio, trabajos, type Trabajo } from "@/lib/inicio";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";
const rotulo = "font-mono text-[12px] uppercase tracking-[0.14em]";
const titulo = "display text-[clamp(56px,8vw,128px)]";

function Enlaces({ t, claro }: { t: Trabajo; claro?: boolean }) {
  if (!t.enlaces?.length) return null;
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-1 ${rotulo}`}>
      {t.enlaces.map((e) => (
        <li key={e.href}>
          <a href={e.href} target="_blank" rel="noopener" className={`inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0 ${claro ? "text-hueso" : "text-tinta"} hover:opacity-70`}>{e.texto}</a>
        </li>
      ))}
    </ul>
  );
}

// Una pieza del trabajo. Con captura, la imagen manda; sin captura, manda el nombre.
function Pieza({ t, sinEnlace, prioridad }: { t: Trabajo; sinEnlace: string; prioridad?: boolean }) {
  const destino = t.enlaces?.length === 1 ? t.enlaces[0].href : undefined;
  if (!t.imagen) {
    return (
      <article data-pieza={t.id} className="flex h-full min-h-[260px] flex-col justify-between gap-10 rounded-3xl bg-tinta p-6 text-hueso md:min-h-[340px] md:p-8">
        <p className={`${rotulo} text-hueso/70`}>{t.tipo}</p>
        <div className="grid gap-4">
          <h3 className="display text-[clamp(40px,4.6vw,76px)]">{t.nombre}</h3>
          <p className="max-w-[44ch] text-[17px] text-hueso/80">{t.texto}</p>
          <Enlaces t={t} claro />
        </div>
      </article>
    );
  }
  const imagen = (
    <Image src={`/trabajo/${t.imagen}.webp`} alt={t.nombre} fill sizes="(min-width: 768px) 48vw, 92vw" priority={prioridad} className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
  );
  return (
    <article data-pieza={t.id} className="grid content-start gap-4">
      {destino ? (
        <a href={destino} target="_blank" rel="noopener" aria-label={t.nombre} className="group relative block aspect-[2/1] overflow-hidden rounded-3xl border border-linea bg-papel">{imagen}</a>
      ) : (
        <div className="group relative aspect-[2/1] overflow-hidden rounded-3xl border border-linea bg-papel">{imagen}</div>
      )}
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline md:gap-x-6">
        <h3 className="text-[26px] font-light leading-tight tracking-[-0.02em]">{t.nombre}</h3>
        <p className={`${rotulo} text-gris`}>{t.tipo}</p>
        <p className="max-w-[52ch] text-[17px] text-gris md:col-span-2">{t.texto}</p>
        <div className="md:col-span-2">{t.enlaces?.length ? <Enlaces t={t} /> : <p className={`${rotulo} text-gris`}>{sinEnlace}</p>}</div>
      </div>
    </article>
  );
}

export function Inicio({ idioma }: { idioma: Idioma }) {
  const t = textosInicio(idioma);
  const lista = trabajos(idioma);
  return (
    <main className="relative">
      <DatosEstructurados idioma={idioma} />

      {/* Portada: el titular y qué somos. Nada más. */}
      <section className={`hero relative ${lateral} pb-10 pt-6`}>
        <h1 className="display display-apretada text-[clamp(76px,17vw,280px)]">
          <Linea i={0}>{t.titulo[0]}</Linea>
          <Linea i={1}>{t.titulo[1]}</Linea>
        </h1>
        <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
          <p className="max-w-[26ch] text-[clamp(24px,2.9vw,42px)] font-light leading-[1.14] tracking-[-0.02em] md:col-span-8">{t.bajada}</p>
          <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
            <a href="#trabajo" className={`inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-hueso ${rotulo}`}>{t.verTrabajo}</a>
            <Link href={enlace("/contacto", idioma)} className={`inline-flex min-h-12 items-center rounded-full border border-tinta px-7 ${rotulo}`}>{t.hablemos}</Link>
          </div>
        </div>
        <ul className={`mt-12 grid gap-3 border-t border-tinta pt-4 md:grid-cols-3 ${rotulo}`}>
          <li>{t.datos[0]}</li>
          <li className="text-gris">{t.datos[1]}</li>
          <li className="text-gris md:text-right">{t.datos[2]}</li>
        </ul>
      </section>

      {/* Trabajo */}
      <section id="trabajo" className={`${lateral} scroll-mt-6 py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className={titulo}>{t.trabajo.titulo}</h2>
          <p className="max-w-sm text-[17px] text-gris">{t.trabajo.texto}</p>
        </div>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {lista.map((x, i) => <Pieza key={x.id} t={x} sinEnlace={t.trabajo.sinEnlace} prioridad={i === 1} />)}
        </div>
      </section>

      {/* Qué hacemos */}
      <section id="servicios" className={`${lateral} scroll-mt-6 py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className={titulo}>{t.hacemos.titulo}</h2>
          <p className="max-w-sm text-[17px] text-gris">{t.hacemos.texto}</p>
        </div>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.hacemos.bloques.map((b) => (
            <div key={b.nombre} className="border-t border-tinta pt-4">
              <h3 className="text-[26px] font-light leading-tight tracking-[-0.02em]">{b.nombre}</h3>
              <ul className="mt-5 grid gap-2 text-[17px] text-gris">
                {b.lista.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" className={`${lateral} scroll-mt-6 py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className={titulo}>{t.nosotros.titulo}</h2>
          <p className="max-w-sm text-[17px] text-gris">{t.nosotros.texto}</p>
        </div>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {t.nosotros.personas.map((p) => (
            <article key={p.id} className="grid gap-6 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-end">
              {p.id === "jay" ? (
                <figure className="relative m-0 aspect-[4/5] overflow-hidden rounded-3xl">
                  <Image src="/jay/jay.webp" alt={p.alt} fill sizes="(min-width: 640px) 220px, 92vw" className="object-cover" />
                </figure>
              ) : (
                <Foto nombre={p.id} alt={p.alt} pendiente={p.pendiente} colores={["#ff6fb1", "#ffe7f3"]} tamanos="(min-width: 640px) 220px, 92vw" />
              )}
              <div>
                <p className={`${rotulo} text-gris`}>{p.rol}</p>
                <h3 className="mt-2 text-[34px] font-light leading-none tracking-[-0.02em]">{p.nombre}</h3>
                <p className="mt-4 max-w-[48ch] text-[17px] text-gris">{p.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Cómo trabajamos: cuatro pasos, en orden. */}
      <section id="como" className={`${lateral} scroll-mt-6 py-16`}>
        <h2 className={`${titulo} mb-10`}>{t.como.titulo}</h2>
        <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.como.pasos.map((p, i) => (
            <li key={p.nombre} className="border-t border-tinta pt-4">
              <span className="display block text-[72px] text-gris">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-[26px] font-light leading-tight tracking-[-0.02em]">{p.nombre}</h3>
              <p className="mt-3 max-w-[38ch] text-[17px] text-gris">{p.texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 max-w-[60ch] text-[17px] text-gris">{t.como.apoyo}</p>
      </section>

      <PruebaSocial idioma={idioma} />

      {/* Precios */}
      <section id="precios" className={`${lateral} scroll-mt-6 py-16`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className={titulo}>{t.precios.titulo}</h2>
          <p className="max-w-sm text-[17px] text-gris">{t.precios.texto}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {t.precios.planes.map((p) => (
            <div key={p.nombre} className="rounded-3xl border border-linea bg-papel p-6 md:p-8">
              <h3 className={`${rotulo} text-gris`}>{p.nombre}</h3>
              <p className="display mt-6 text-[clamp(48px,4.4vw,72px)]">{p.precio}</p>
              <p className="mt-5 max-w-[40ch] text-[17px] text-gris">{p.texto}</p>
            </div>
          ))}
        </div>
        <p className={`mt-6 ${rotulo} text-gris`}>{t.precios.nota}</p>
      </section>

      {/* Contacto */}
      <section className={`${lateral} py-28`}>
        <p className="display text-[clamp(64px,12vw,200px)]">{t.contacto.titulo}</p>
        <p className="mt-10 max-w-md text-lg text-gris">{t.contacto.texto}</p>
        <Link href={enlace("/contacto", idioma)} className={`mt-8 inline-flex min-h-12 items-center rounded-full bg-tinta px-8 text-hueso ${rotulo}`}>{t.contacto.boton}</Link>
      </section>
    </main>
  );
}
