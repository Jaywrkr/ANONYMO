// Muestra «Noche» (sistema/85): fondo oscuro con un resplandor del color de la marca detrás del nombre y fichas de vidrio.
// Para barberías, estética, estudios: quien quiere verse elegante y de noche.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { FRASE, RAZONES, largoDe, type Paleta } from "./estilos";
import { Cielo, Estrella, nota } from "./Cielo";

const serif = { fontFamily: "'Fraunces Variable', Georgia, serif", fontVariationSettings: "'SOFT' 50", fontWeight: 300 } as const;
const TAM = ["text-[clamp(54px,15.5vw,150px)]", "text-[clamp(44px,12.5vw,116px)]", "text-[clamp(36px,9.4vw,88px)]"];
const vidrio = { background: "rgba(255,255,255,.07)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;

export function Noche({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const razones = RAZONES[c.tono];
  const brillo = { background: k.acento, color: k.sobreAcento, boxShadow: `0 0 0 1px ${k.acento}, 0 10px 40px -6px ${k.acento}99` };
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-44">
      {/* La portada: el resplandor ocupa todo y el nombre va encima */}
      <section className="relative overflow-hidden">
        <Cielo colores={k.cielo} alt="" className="absolute inset-0" style={{ background: k.fondo }} />
        <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${k.fondo}55 0%, ${k.fondo}00 35%, ${k.fondo} 97%)` }} />
        <div className="relative">
          <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-8 md:py-6">
            <span style={serif} className="min-w-0 truncate text-[21px]">{c.nombre}</span>
            <nav className="hidden gap-1 rounded-full p-1 text-[14px] md:flex" style={vidrio}><a href="#servicios" className="rounded-full px-4 py-2">Servicios</a><a href="#nosotros" className="rounded-full px-4 py-2">Por qué aquí</a><a href="#visitanos" className="rounded-full px-4 py-2">Cómo llegar</a></nav>
            <button type="button" data-demo className="min-h-11 shrink-0 rounded-full px-5 text-[14px]" style={vidrio}>Agendar</button>
          </header>
          <div className="px-4 pb-16 pt-16 text-center md:px-8 md:pb-28 md:pt-24">
            <p className="text-[15px]" style={{ color: k.texto }}>{c.rubro} en {c.ciudad}</p>
            <h1 style={serif} className={`mx-auto mt-4 max-w-[13ch] text-balance leading-[.92] tracking-[-0.035em] ${TAM[largoDe(c.nombre)]}`}>{c.nombre}</h1>
            <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed" style={{ color: k.texto }}>{c.bajada}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button type="button" data-demo className="min-h-14 rounded-full px-8 text-[16px] font-medium" style={brillo}>Agendar por WhatsApp</button>
              {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full px-6 text-[16px]" style={vidrio}>Cómo llegar</a> : null}
            </div>
            <div className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-2.5 text-left md:mt-16">
              <div className="muestra-entra rounded-[22px] px-5 py-4" style={{ ...vidrio, animationDelay: ".15s" }}>
                <p className="flex items-center gap-2 text-[13px]" style={{ color: k.texto }}><span className="h-2 w-2 rounded-full" style={{ background: c.hoy === "Cerrado" ? "#ff6b5e" : "#3ddc84", boxShadow: `0 0 10px ${c.hoy === "Cerrado" ? "#ff6b5e" : "#3ddc84"}` }} />{c.hoy === "Cerrado" ? "Hoy" : "Abierto hoy"}</p>
                <p style={serif} className="mt-1 text-[24px] leading-tight">{c.hoy}</p>
              </div>
              {c.estrellas ? (
                <div className="muestra-entra rounded-[22px] px-5 py-4" style={{ ...vidrio, animationDelay: ".3s" }}>
                  <p className="text-[13px]" style={{ color: k.texto }}>{c.resenas} reseñas en Google</p>
                  <p className="mt-1 flex items-center gap-2"><span style={serif} className="text-[24px] leading-tight">{nota(c.estrellas)}</span><span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Estrella key={i} className="h-3.5 w-3.5" color={k.acento} />)}</span></p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {fotos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotos[0]} alt={c.nombre} data-foto className="mx-auto mt-2 block aspect-[4/3] w-[calc(100%-2rem)] max-w-6xl rounded-[28px] object-cover md:aspect-[21/9]" />
      ) : null}

      <section id="servicios" className="mx-auto mt-16 max-w-6xl px-4 md:mt-28 md:px-8">
        <h2 style={serif} className="text-[44px] leading-none tracking-[-0.03em] md:text-[72px]">Lo que hacemos</h2>
        <ul className="mt-8 grid gap-2.5 md:mt-12 md:grid-cols-2 md:gap-4">
          {c.servicios.map((s, i) => (
            <li key={s} className="rounded-[24px] p-6 md:p-8" style={{ background: k.bloque, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
              <p style={serif} className="text-[30px] leading-tight tracking-[-0.02em] md:text-[36px]">{s}</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: k.texto }}>{c.detalles[i] || "Escríbenos y te contamos cómo trabajamos."}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center md:py-36">
        <p style={{ ...serif, fontStyle: "italic" }} className="text-balance text-[34px] leading-[1.1] tracking-[-0.02em] md:text-[60px]">{FRASE[c.tono]}</p>
      </section>

      <section id="nosotros" className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3 md:gap-12 md:px-8" aria-label="Por qué aquí">
        {razones.map(([t, x]) => (
          <div key={t} className="pt-6" style={{ borderTop: `1px solid ${k.linea}` }}>
            <p style={serif} className="text-[32px] leading-tight tracking-[-0.02em]" >{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
            <p className="mt-2 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
          </div>
        ))}
      </section>

      {fotos.length > 1 && (
        <section className="mx-auto mt-14 grid max-w-6xl gap-2.5 px-4 sm:grid-cols-2 md:gap-4 md:px-8" aria-label="Fotos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotos.slice(1).map((f) => <img key={f} src={f} alt={c.nombre} data-foto loading="lazy" className={`aspect-[4/3] w-full rounded-[28px] object-cover ${fotos.length === 2 ? "sm:col-span-2 sm:aspect-[21/9]" : ""}`} />)}
        </section>
      )}

      <section id="visitanos" className="mx-4 mt-20 max-w-6xl overflow-hidden rounded-[32px] md:mx-auto md:mt-32" style={{ background: k.bloque, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
        <div className="grid gap-10 p-6 md:grid-cols-2 md:p-12">
          <div>
            <h2 style={serif} className="text-[44px] leading-none tracking-[-0.03em] md:text-[72px]">Ven a vernos</h2>
            <p className="mt-5 text-[19px] leading-snug">{c.direccion || c.ciudad}</p>
            {c.telefono ? <p className="mt-1 text-[15px]" style={{ color: k.texto }}>{c.telefono}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" data-demo className="min-h-14 rounded-full px-7 text-[16px] font-medium" style={brillo}>Escríbenos por WhatsApp</button>
              {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full px-6 text-[16px]" style={vidrio}>Abrir en Google Maps</a> : null}
            </div>
          </div>
          <dl className="grid content-end">
            {c.horario.map(([d, h]) => <div key={d} className="flex justify-between gap-4 py-4 text-[16px]" style={{ borderTop: `1px solid ${k.linea}` }}><dt style={{ color: k.texto }}>{d}</dt><dd className="text-right">{h}</dd></div>)}
          </dl>
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-6xl px-4 text-center md:mt-32 md:px-8">
        <p aria-hidden style={serif} className={`text-balance leading-[.92] tracking-[-0.035em] ${TAM[largoDe(c.nombre)]}`}>{c.nombre}</p>
        <p className="mt-8 text-[12px]" style={{ color: k.texto }}>© {new Date().getFullYear()} {c.nombre}, {c.ciudad}</p>
      </footer>
    </div>
  );
}
