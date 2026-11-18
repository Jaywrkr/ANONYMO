// Muestra «Mosaico» (sistema/85): todo en fichas redondeadas, como una app. Cada dato del negocio tiene su ficha:
// nombre, imagen, nota, horario, y un botón que ocupa una ficha entera.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { FRASE, RAZONES, largoDe, type Paleta } from "./estilos";
import { Cielo, Estrella, nota } from "./Cielo";

const titular = { fontFamily: "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif", fontVariationSettings: "'wdth' 100" } as const;
const TAM = ["text-[clamp(48px,13.5vw,104px)]", "text-[clamp(40px,11vw,84px)]", "text-[clamp(32px,8.6vw,64px)]"];
const ficha = "rounded-[26px] md:rounded-[32px]";

export function Mosaico({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const razones = RAZONES[c.tono];
  return (
    <div style={{ background: k.suave, color: k.tinta }} className="min-h-screen px-2.5 pb-44 pt-2.5 md:px-4 md:pt-4">
      <header className={`flex items-center justify-between gap-3 px-4 py-3 ${ficha}`} style={{ background: k.fondo }}>
        <span style={titular} className="min-w-0 truncate text-[16px] font-bold">{c.nombre}</span>
        <nav className="hidden gap-6 text-[14px] md:flex" style={{ color: k.texto }}><a href="#servicios">Servicios</a><a href="#nosotros">Por qué aquí</a><a href="#visitanos">Cómo llegar</a></nav>
        <button type="button" data-demo className="min-h-11 shrink-0 rounded-full px-5 text-[14px] font-semibold" style={{ background: k.tinta, color: k.fondo }}>Agendar</button>
      </header>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-6 md:gap-4">
        <section className={`col-span-2 flex flex-col justify-between p-6 md:col-span-4 md:row-span-2 md:min-h-[520px] md:p-10 ${ficha}`} style={{ background: k.fondo }}>
          <p className="text-[15px]" style={{ color: k.texto }}>{c.rubro} en {c.ciudad}</p>
          <div className="mt-10">
            <h1 style={titular} className={`max-w-[14ch] text-balance font-extrabold leading-[.9] tracking-[-0.045em] ${TAM[largoDe(c.nombre)]}`}>{c.nombre}</h1>
            <p className="mt-5 max-w-md text-[17px] leading-snug" style={{ color: k.texto }}>{c.bajada}</p>
          </div>
        </section>

        <Cielo colores={k.cielo} foto={fotos[0]} alt={c.nombre} className={`col-span-2 aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto ${ficha}`} />

        {c.estrellas ? (
          <section className={`flex flex-col justify-between p-5 md:col-span-2 md:p-7 ${ficha}`} style={{ background: k.bloque, color: k.sobreBloque }} aria-label="Reseñas">
            <p className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Estrella key={i} className="h-4 w-4" />)}</p>
            <div className="mt-8">
              <p style={titular} className="text-[56px] font-extrabold leading-none tracking-[-0.05em] md:text-[72px]">{nota(c.estrellas)}</p>
              <p className="mt-1 text-[13px] opacity-85">{c.resenas} reseñas en Google</p>
            </div>
          </section>
        ) : null}

        <section className={`flex flex-col justify-between p-5 md:col-span-2 md:p-7 ${c.estrellas ? "" : "col-span-2"} ${ficha}`} style={{ background: k.fondo }} aria-label="Horario de hoy">
          <p className="flex items-center gap-2 text-[13px] font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hoy === "Cerrado" ? "#d1483b" : "#21b866" }} />{c.hoy === "Cerrado" ? "Hoy cerrado" : "Abierto hoy"}</p>
          <p style={titular} className="mt-8 text-[26px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[32px]">{c.hoy === "Cerrado" ? "Te esperamos mañana" : c.hoy}</p>
        </section>

        <button type="button" data-demo className={`col-span-2 flex min-h-[112px] items-center justify-between gap-4 px-6 text-left md:col-span-2 md:px-7 ${ficha}`} style={{ background: k.acento, color: k.sobreAcento }}>
          <span style={titular} className="text-[26px] font-extrabold leading-[1] tracking-[-0.03em] md:text-[30px]">Agendar por WhatsApp</span>
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: k.sobreAcento, color: k.acento }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
          </span>
        </button>
      </div>

      <section id="servicios" className="mt-2.5 md:mt-4">
        <h2 style={titular} className={`px-6 py-7 text-[40px] font-extrabold leading-[.92] tracking-[-0.04em] md:px-10 md:py-10 md:text-[64px] ${ficha}`} >Lo que hacemos</h2>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
          {c.servicios.map((s, i) => (
            <article key={s} className={`flex min-h-[176px] flex-col justify-between p-5 md:min-h-[240px] md:p-7 ${ficha}`} style={{ background: i === 1 ? k.tinta : k.fondo, color: i === 1 ? k.fondo : k.tinta }}>
              <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: i === 1 ? k.acento : k.bloque }} />
              <div>
                <p style={titular} className="hyphens-auto break-words text-[19px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[26px]" lang="es">{s}</p>
                <p className="mt-2 text-[13px] leading-snug opacity-75 md:text-[14px]">{c.detalles[i] || "Escríbenos y te contamos."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`mt-2.5 px-6 py-14 md:mt-4 md:px-12 md:py-24 ${ficha}`} style={{ background: k.bloque, color: k.sobreBloque }}>
        <p style={titular} className="max-w-4xl text-balance text-[32px] font-bold leading-[1.04] tracking-[-0.035em] md:text-[60px]">{FRASE[c.tono]}</p>
      </section>

      <section id="nosotros" className="mt-2.5 grid gap-2.5 md:mt-4 md:grid-cols-3 md:gap-4" aria-label="Por qué aquí">
        {razones.map(([t, x]) => (
          <article key={t} className={`p-6 md:p-8 ${ficha}`} style={{ background: k.fondo }}>
            <p style={titular} className="text-[28px] font-extrabold leading-none tracking-[-0.035em] md:text-[34px]">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
          </article>
        ))}
      </section>

      {fotos.length > 1 && (
        <section className="mt-2.5 grid gap-2.5 sm:grid-cols-2 md:mt-4 md:gap-4" aria-label="Fotos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotos.slice(1).map((f) => <img key={f} src={f} alt={c.nombre} data-foto loading="lazy" className={`aspect-[4/3] w-full object-cover ${ficha} ${fotos.length === 2 ? "sm:col-span-2 sm:aspect-[21/9]" : ""}`} />)}
        </section>
      )}

      <section id="visitanos" className="mt-2.5 grid gap-2.5 md:mt-4 md:grid-cols-2 md:gap-4">
        <div className={`p-6 md:p-10 ${ficha}`} style={{ background: k.tinta, color: k.fondo }}>
          <h2 style={titular} className="text-[40px] font-extrabold leading-[.92] tracking-[-0.04em] md:text-[64px]">Ven a vernos</h2>
          <p className="mt-5 text-[19px] leading-snug">{c.direccion || c.ciudad}</p>
          {c.telefono ? <p className="mt-1 text-[15px] opacity-70">{c.telefono}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button type="button" data-demo className="min-h-14 rounded-full px-7 text-[16px] font-semibold" style={{ background: k.acento, color: k.sobreAcento }}>Escríbenos por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full px-6 text-[16px]" style={{ boxShadow: `inset 0 0 0 1.5px ${k.fondo}` }}>Abrir en Google Maps</a> : null}
          </div>
        </div>
        <dl className={`grid content-center p-6 md:p-10 ${ficha}`} style={{ background: k.fondo }}>
          {c.horario.map(([d, h], i) => <div key={d} className="flex justify-between gap-4 py-4 text-[16px]" style={{ borderTop: i ? `1px solid ${k.linea}` : undefined }}><dt style={{ color: k.texto }}>{d}</dt><dd className="text-right font-medium">{h}</dd></div>)}
        </dl>
      </section>

      <footer className={`mt-2.5 px-6 py-8 md:mt-4 md:px-10 ${ficha}`} style={{ background: k.fondo }}>
        <p aria-hidden style={titular} className={`break-words font-extrabold leading-[.9] tracking-[-0.045em] ${TAM[largoDe(c.nombre)]}`}>{c.nombre}</p>
        <p className="mt-5 text-[12px]" style={{ color: k.texto }}>© {new Date().getFullYear()} {c.nombre}, {c.ciudad}</p>
      </footer>
    </div>
  );
}
