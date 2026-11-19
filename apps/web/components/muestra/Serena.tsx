// Muestra «Sereno» (rehecha en sistema/84): papel claro, una serif suave y grande al centro, la imagen dentro de un arco
// y mucho aire. Para quien vende calma y confianza.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { FRASE, RAZONES, largoDe, type Paleta } from "./estilos";
import { Cielo, Estrella, Lee, Palabras, nota } from "./Cielo";
import { Fotos, Opiniones, Pasos, Preguntas, type Tema } from "./Secciones";

const serif = { fontFamily: "'Fraunces Variable', Georgia, serif", fontVariationSettings: "'SOFT' 100", fontWeight: 340 } as const;
const TAM = ["text-[clamp(54px,15vw,128px)]", "text-[clamp(44px,12vw,100px)]", "text-[clamp(36px,9vw,76px)]"];

export function Serena({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const razones = RAZONES[c.tono];
  const n = largoDe(c.nombre);
  const t: Tema = { k, titular: serif, h2: "text-[42px] leading-none tracking-[-0.025em] md:text-[64px]", h3: "text-[26px] leading-tight tracking-[-0.015em] md:text-[30px]", radio: "rounded-[28px] md:rounded-[32px]", tarjeta: { background: k.suave, color: k.tinta }, peso: "", marca: k.bloque, apagado: k.texto, linea: k.linea };
  // La serif entra sin torcerse, saliendo de una niebla suave.
  const calma = { ["--tuerce" as string]: "0deg", ["--nube" as string]: "12px" };
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-44">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-10 md:py-7">
        <span style={serif} className="min-w-0 truncate text-[21px] leading-none">{c.nombre}</span>
        <nav className="hidden gap-8 text-[14px] md:flex" style={{ color: k.texto }}>
          <a href="#servicios">Servicios</a><a href="#nosotros">Por qué aquí</a><a href="#visitanos">Cómo llegar</a>
        </nav>
        <button type="button" data-demo className="min-h-11 shrink-0 rounded-full px-5 text-[14px]" style={{ boxShadow: `inset 0 0 0 1px ${k.tinta}` }}>Agendar</button>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8 text-center md:px-10 md:pt-14">
        <p className="muestra-entra text-[15px]" style={{ color: k.bloque }}>{c.rubro} en {c.ciudad}</p>
        <h1 style={{ ...serif, ...calma }} className={`mx-auto mt-4 max-w-[14ch] text-balance leading-[.94] tracking-[-0.03em] ${TAM[n]}`}><Palabras texto={c.nombre} desde={150} /></h1>
        <p className="muestra-entra mx-auto mt-6 max-w-md text-[17px] leading-relaxed" style={{ color: k.texto, animationDelay: ".5s" }}>{c.bajada}</p>
        <div className="muestra-entra mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3" style={{ animationDelay: ".65s" }}>
          <button type="button" data-demo className="min-h-14 rounded-full px-8 text-[16px]" style={{ background: k.tinta, color: k.fondo }}>Agendar por WhatsApp</button>
          {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[16px] underline decoration-1 underline-offset-[6px]">Cómo llegar</a> : null}
        </div>
      </section>

      {/* La imagen en un arco, con lo que se sabe de verdad del negocio apoyado en su base */}
      <section className="relative mx-auto mt-12 w-[78%] max-w-[440px] md:mt-16">
        <Cielo colores={k.cielo} foto={fotos[0]} alt={c.nombre} className="muestra-abre aspect-[3/4] rounded-t-full rounded-b-[28px]" />
        <div className="muestra-mece absolute -left-[12%] bottom-10 rounded-[18px] px-4 py-3 text-left shadow-[0_14px_40px_rgba(0,0,0,.10)]" style={{ background: k.fondo, animationDelay: ".9s, 1.8s" }}>
          <p className="text-[12px]" style={{ color: k.texto }}>{c.hoy === "Cerrado" ? "Hoy" : "Abierto hoy"}</p>
          <p style={serif} className="text-[22px] leading-tight">{c.hoy}</p>
        </div>
        {c.estrellas ? (
          <div className="muestra-mece absolute -right-[12%] top-[38%] rounded-[18px] px-4 py-3 text-left shadow-[0_14px_40px_rgba(0,0,0,.10)]" style={{ background: k.fondo, animationDelay: "1.05s, 2.6s" }}>
            <p className="flex items-center gap-1.5"><span style={serif} className="text-[26px] leading-none">{nota(c.estrellas)}</span><Estrella className="h-4 w-4" color={k.bloque} /></p>
            <p className="mt-0.5 text-[12px]" style={{ color: k.texto }}>{c.resenas} reseñas en Google</p>
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center md:py-32">
        <p style={{ ...serif, fontStyle: "italic" }} className="text-balance text-[32px] leading-[1.12] tracking-[-0.015em] md:text-[54px]"><Lee texto={FRASE[c.tono]} /></p>
      </section>

      <section id="servicios" className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1fr_1.5fr] md:gap-16 md:px-10">
        <h2 data-aparece style={serif} className="text-[42px] leading-none tracking-[-0.025em] md:text-[64px]">Servicios</h2>
        <ul>
          {c.servicios.map((s, i) => (
            <li key={s} data-aparece className="grid gap-1 py-6 md:grid-cols-[1.1fr_1fr] md:items-baseline md:gap-8" style={{ borderTop: `1px solid ${k.linea}`, borderBottom: i === c.servicios.length - 1 ? `1px solid ${k.linea}` : undefined, ["--n" as string]: i }}>
              <span style={serif} className="text-[28px] leading-tight tracking-[-0.015em] md:text-[32px]">{s}</span>
              <span className="text-[15px] leading-relaxed" style={{ color: k.texto }}>{c.detalles[i] || "Escríbenos y te contamos cómo trabajamos."}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="nosotros" data-aparece="escala" className="mx-5 mt-20 max-w-6xl rounded-[32px] px-6 py-10 md:mx-auto md:mt-28 md:px-12 md:py-16" style={{ background: k.suave }}>
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {razones.map(([t, x]) => (
            <div key={t}>
              <span aria-hidden className="block h-2.5 w-2.5 rounded-full" style={{ background: k.bloque }} />
              <p style={serif} className="mt-4 text-[30px] leading-tight tracking-[-0.02em]">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
            </div>
          ))}
        </div>
      </section>

      <Pasos c={c} t={t} className="mx-auto mt-20 max-w-6xl px-5 md:mt-28 md:px-10" />
      <Opiniones c={c} t={t} className="mx-auto mt-20 max-w-6xl px-5 md:mt-28 md:px-10" />
      <Fotos c={c} t={t} fotos={fotos} className="mx-auto mt-16 max-w-6xl px-5 md:mt-24 md:px-10" />
      <Preguntas c={c} t={t} className="mx-auto mt-20 max-w-6xl px-5 md:mt-28 md:px-10" />

      <section id="visitanos" className="mx-auto mt-20 grid max-w-6xl gap-12 px-5 md:mt-28 md:grid-cols-2 md:gap-16 md:px-10">
        <div data-aparece>
          <h2 style={serif} className="text-[42px] leading-none tracking-[-0.025em] md:text-[64px]">Ven a vernos</h2>
          <p className="mt-5 text-[19px] leading-snug">{c.direccion || c.ciudad}</p>
          {c.telefono ? <p className="mt-1 text-[15px]" style={{ color: k.texto }}>{c.telefono}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" data-demo className="min-h-14 rounded-full px-8 text-[16px]" style={{ background: k.bloque, color: k.sobreBloque }}>Escríbenos por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[16px] underline decoration-1 underline-offset-[6px]">Abrir en Google Maps</a> : null}
          </div>
        </div>
        <dl className="grid content-start">
          {c.horario.map(([d, h], i) => <div key={d} data-aparece className="flex justify-between gap-4 py-4 text-[16px]" style={{ borderTop: `1px solid ${k.linea}`, borderBottom: i === c.horario.length - 1 ? `1px solid ${k.linea}` : undefined, ["--n" as string]: i }}><dt style={{ color: k.texto }}>{d}</dt><dd className="text-right">{h}</dd></div>)}
        </dl>
      </section>

      <footer className="mx-auto mt-24 max-w-6xl px-5 text-center md:mt-36 md:px-10">
        <p aria-hidden data-aparece style={serif} className={`text-balance leading-[.94] tracking-[-0.03em] ${TAM[n]}`}>{c.nombre}</p>
        <p className="mt-8 text-[12px]" style={{ color: k.texto }}>© {new Date().getFullYear()} {c.nombre}, {c.ciudad}</p>
      </footer>
    </div>
  );
}
