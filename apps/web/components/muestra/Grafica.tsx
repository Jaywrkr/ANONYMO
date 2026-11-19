// Muestra «Color» (id «grafico», rehecha en sistema/84): un marco del color de la marca con un panel de papel adentro,
// el nombre enorme, un cielo de color con fichas flotando y un sello con su nota de Google.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { FRASE, RAZONES, largoDe, type Paleta } from "./estilos";
import { Frase } from "./Frase";
import { Cielo, Estrella, nota } from "./Cielo";

const titular = { fontFamily: "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif", fontVariationSettings: "'wdth' 88" } as const;
const TAM = ["text-[clamp(56px,17vw,150px)]", "text-[clamp(46px,13.5vw,112px)]", "text-[clamp(38px,10vw,84px)]"];

export function Grafica({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const razones = RAZONES[c.tono];
  const fondos: [string, string][] = [[k.bloque, k.sobreBloque], [k.acento, k.sobreAcento], [k.tinta, k.fondo]];
  const n = largoDe(c.nombre);
  return (
    <div style={{ background: k.bloque, color: k.tinta }} className="min-h-screen px-2.5 pb-44 pt-2.5 md:px-4 md:pt-4">
      {/* El panel de papel */}
      <div className="overflow-hidden rounded-[28px] md:rounded-[40px]" style={{ background: k.fondo }}>
        <header className="flex items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
          <span className="min-w-0 truncate rounded-full px-4 py-2.5 text-[14px] font-semibold" style={{ ...titular, background: k.suave }}>{c.nombre}</span>
          <nav className="hidden items-center gap-1 rounded-full p-1 text-[14px] md:flex" style={{ background: k.suave }}>
            <a href="#servicios" className="rounded-full px-4 py-2">Servicios</a><a href="#nosotros" className="rounded-full px-4 py-2">Por qué aquí</a><a href="#visitanos" className="rounded-full px-4 py-2">Cómo llegar</a>
          </nav>
          <button type="button" data-demo className="min-h-11 shrink-0 rounded-full px-5 text-[14px] font-semibold" style={{ background: k.tinta, color: k.fondo }}>Agendar</button>
        </header>

        <section className="px-4 pb-6 pt-12 text-center md:px-8 md:pt-20">
          <p className="text-[15px] md:text-[17px]" style={{ color: k.texto }}>{c.rubro} en {c.ciudad}</p>
          <h1 style={titular} className={`mx-auto mt-3 max-w-[15ch] text-balance font-extrabold leading-[.88] tracking-[-0.045em] ${TAM[n]}`}>{c.nombre}</h1>
          <p className="mx-auto mt-6 max-w-md text-[17px] leading-snug md:text-[19px]" style={{ color: k.texto }}>{c.bajada}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" data-demo className="min-h-14 rounded-full px-7 text-[16px] font-semibold" style={{ background: k.acento, color: k.sobreAcento }}>Agendar por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full px-6 text-[16px] font-medium" style={{ boxShadow: `inset 0 0 0 1.5px ${k.tinta}` }}>Cómo llegar</a> : null}
          </div>
        </section>

        {/* El cielo (o su foto) con fichas flotando: lo que se sabe de verdad del negocio */}
        <section className="relative px-2.5 pb-2.5 md:px-4 md:pb-4">
          <Cielo colores={k.cielo} foto={fotos[0]} alt={c.nombre} className="aspect-[4/5] rounded-[22px] sm:aspect-[16/9] md:rounded-[30px] lg:aspect-[21/9]" />
          <div className="pointer-events-none absolute inset-x-5 bottom-6 flex flex-wrap items-end justify-between gap-3 md:inset-x-10 md:bottom-10">
            <div className="muestra-entra rounded-[20px] px-4 py-3 text-left shadow-[0_10px_30px_rgba(0,0,0,.12)]" style={{ background: k.fondo, ["--giro" as string]: "-3deg", animationDelay: ".15s" }}>
              <p className="flex items-center gap-2 text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: c.hoy === "Cerrado" ? "#d1483b" : "#21b866" }} />{c.hoy === "Cerrado" ? "Hoy cerrado" : "Abierto hoy"}</p>
              {c.hoy !== "Cerrado" && <p style={titular} className="mt-0.5 text-[20px] font-bold tracking-[-0.02em]">{c.hoy}</p>}
            </div>
            {c.direccion ? (
              <div className="muestra-entra max-w-[62%] rounded-[20px] px-4 py-3 text-left shadow-[0_10px_30px_rgba(0,0,0,.12)]" style={{ background: k.fondo, ["--giro" as string]: "2deg", animationDelay: ".3s" }}>
                <p className="text-[12px]" style={{ color: k.texto }}>Estamos en</p>
                <p className="text-[14px] font-medium leading-snug">{c.direccion}</p>
              </div>
            ) : null}
          </div>
          {c.estrellas ? (
            // El sello con su nota: es de ellos y es lo primero que un cliente nuevo quiere saber.
            <div className="muestra-entra absolute right-5 top-4 grid h-[124px] w-[124px] place-items-center rounded-full text-center shadow-[0_12px_30px_rgba(0,0,0,.18)] md:right-12 md:top-8 md:h-[156px] md:w-[156px]" style={{ background: k.acento, color: k.sobreAcento, ["--giro" as string]: "8deg", animationDelay: ".45s" }}>
              <svg viewBox="0 0 100 100" aria-hidden className="muestra-gira absolute inset-0 h-full w-full">
                <defs><path id="aro" d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" /></defs>
                <text fontSize="8.4" fill="currentColor" style={{ fontWeight: 600 }}><textPath href="#aro" textLength="246" lengthAdjust="spacing">{`${c.resenas} reseñas en Google ✦ gracias por confiar ✦ `}</textPath></text>
              </svg>
              <div>
                <p style={titular} className="text-[38px] font-extrabold leading-none tracking-[-0.04em] md:text-[48px]">{nota(c.estrellas)}</p>
                <p className="mt-1 flex justify-center gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Estrella key={i} className="h-3 w-3 md:h-3.5 md:w-3.5" />)}</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Servicios: se abren al tocar */}
      <section id="servicios" className="mt-2.5 rounded-[28px] px-4 py-10 md:mt-4 md:rounded-[40px] md:px-10 md:py-16" style={{ background: k.fondo }}>
        <div className="grid gap-8 md:grid-cols-[1fr_1.5fr] md:gap-16">
          <div>
            <h2 style={titular} className="text-[44px] font-extrabold leading-[.9] tracking-[-0.04em] md:text-[72px]">Lo que hacemos</h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed" style={{ color: k.texto }}>Toca un servicio para ver de qué se trata. Si tienes dudas, escríbenos.</p>
          </div>
          <div>
            {c.servicios.map((s, i) => (
              <details key={s} open={i === 0} className="muestra-fila" style={{ borderTop: `2px solid ${k.tinta}`, borderBottom: i === c.servicios.length - 1 ? `2px solid ${k.tinta}` : undefined }}>
                <summary className="flex min-h-[72px] items-center justify-between gap-4 py-3">
                  <span style={titular} className="text-[26px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">{s}</span>
                  <span aria-hidden className="muestra-mas grid h-10 w-10 shrink-0 place-items-center rounded-full text-[24px] leading-none" style={{ background: k.suave }}>+</span>
                </summary>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
                  <p className="max-w-md text-[16px] leading-relaxed" style={{ color: k.texto }}>{c.detalles[i] || "Escríbenos y te contamos cómo trabajamos."}</p>
                  <button type="button" data-demo className="min-h-11 rounded-full px-5 text-[14px] font-semibold" style={{ background: k.tinta, color: k.fondo }}>Preguntar por WhatsApp</button>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* La frase, sobre el color de la marca */}
      <section className="px-4 py-16 text-center md:py-28" style={{ color: k.sobreBloque }}>
        <Frase texto={FRASE[c.tono]} style={titular} className="mx-auto max-w-4xl text-balance text-[34px] font-bold leading-[1.02] tracking-[-0.035em] md:text-[64px]" />
      </section>

      {/* Por qué aquí: tres tarjetas que se deslizan en el celular */}
      <section id="nosotros" className="-mx-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-2.5 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0" aria-label="Por qué aquí">
        {razones.map(([t, x], i) => (
          <article key={t} className="flex min-h-[260px] w-[78vw] shrink-0 snap-center flex-col justify-between rounded-[28px] p-6 md:min-h-[320px] md:w-auto md:rounded-[40px] md:p-8" style={{ background: i === 0 ? k.fondo : fondos[i]![0], color: i === 0 ? k.tinta : fondos[i]![1] }}>
            <p style={titular} className="text-[36px] font-extrabold leading-[.92] tracking-[-0.04em] md:text-[48px]">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
            <p className="mt-8 text-[16px] leading-relaxed opacity-85">{x}</p>
          </article>
        ))}
      </section>

      {fotos.length > 1 && (
        <section className="mt-2.5 grid gap-2.5 sm:grid-cols-2 md:mt-4 md:gap-4" aria-label="Fotos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotos.slice(1).map((f) => <img key={f} src={f} alt={c.nombre} data-foto loading="lazy" className={`aspect-[4/3] w-full rounded-[28px] object-cover md:rounded-[40px] ${fotos.length === 2 ? "sm:col-span-2 sm:aspect-[21/9]" : ""}`} />)}
        </section>
      )}

      {/* Visítanos y el cierre con el nombre gigante */}
      <section id="visitanos" className="mt-2.5 overflow-hidden rounded-[28px] md:mt-4 md:rounded-[40px]" style={{ background: k.tinta, color: k.fondo }}>
        <div className="grid gap-10 px-5 pt-10 md:grid-cols-2 md:px-10 md:pt-16">
          <div>
            <h2 style={titular} className="text-[44px] font-extrabold leading-[.9] tracking-[-0.04em] md:text-[72px]">Ven a vernos</h2>
            <p className="mt-5 text-[20px] leading-snug">{c.direccion || c.ciudad}</p>
            {c.telefono ? <p className="mt-1 text-[16px] opacity-70">{c.telefono}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" data-demo className="min-h-14 rounded-full px-7 text-[16px] font-semibold" style={{ background: k.acento, color: k.sobreAcento }}>Escríbenos por WhatsApp</button>
              {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full px-6 text-[16px] font-medium" style={{ boxShadow: `inset 0 0 0 1.5px ${k.fondo}` }}>Abrir en Google Maps</a> : null}
            </div>
          </div>
          <dl className="grid content-start self-end">
            {c.horario.map(([d, h]) => <div key={d} className="flex justify-between gap-4 py-3.5 text-[16px]" style={{ borderTop: `1px solid ${k.fondo}33` }}><dt className="opacity-70">{d}</dt><dd className="text-right font-medium">{h}</dd></div>)}
          </dl>
        </div>
        <p aria-hidden style={titular} className={`mt-12 break-words px-5 pb-8 font-extrabold leading-[.86] tracking-[-0.05em] md:px-10 ${TAM[n]}`}>{c.nombre}</p>
        <p className="px-5 pb-6 text-[12px] opacity-60 md:px-10">© {new Date().getFullYear()} {c.nombre}, {c.ciudad}</p>
      </section>
    </div>
  );
}
