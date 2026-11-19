// Muestra «Revista» (sistema/85): blanco, negro y el color de la marca. Titular condensado alineado a la izquierda,
// líneas gruesas, esquinas rectas y una cinta de servicios que corre. Para quien quiere verse serio y actual.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { FRASE, RAZONES, largoDe, type Paleta } from "./estilos";
import { Cielo, Lee, Palabras, Punto, nota } from "./Cielo";
import { Fotos, Opiniones, Pasos, Preguntas, type Tema } from "./Secciones";

const titular = { fontFamily: "'Bricolage Grotesque Variable', 'Arial Narrow', Arial, sans-serif", fontVariationSettings: "'wdth' 75" } as const;
const TAM = ["text-[clamp(64px,19vw,210px)]", "text-[clamp(52px,15vw,160px)]", "text-[clamp(42px,11.5vw,120px)]"];

export function Revista({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const razones = RAZONES[c.tono];
  const cinta = [...c.servicios, ...c.servicios];
  const regla = { borderTop: `3px solid ${k.tinta}` };
  const t: Tema = { k, titular, h2: "text-[48px] font-bold leading-[.88] tracking-[-0.03em] md:text-[84px]", h3: "text-[28px] font-bold leading-none tracking-[-0.02em] md:text-[32px]", radio: "", tarjeta: { background: k.suave, color: k.tinta }, peso: "font-bold", marca: k.bloque, apagado: k.texto, linea: k.tinta };
  const marco = "mt-14 px-4 md:mt-24 md:px-8";
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-44">
      <header className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <span style={titular} className="min-w-0 truncate text-[20px] font-bold tracking-[-0.01em]">{c.nombre}</span>
        <nav className="hidden gap-7 text-[14px] md:flex"><a href="#servicios">Servicios</a><a href="#nosotros">Por qué aquí</a><a href="#visitanos">Cómo llegar</a></nav>
        <button type="button" data-demo className="min-h-11 shrink-0 px-5 text-[14px] font-semibold" style={{ background: k.tinta, color: k.fondo }}>Agendar</button>
      </header>

      <section className="px-4 pt-6 md:px-8 md:pt-10" style={regla}>
        <div className="muestra-entra flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[14px] md:text-[15px]">
          <p>{c.rubro} en {c.ciudad}</p>
          {c.estrellas ? <p><span className="font-semibold">{nota(c.estrellas)} de 5</span> en Google, con {c.resenas} reseñas</p> : null}
        </div>
        <h1 style={{ ...titular, ["--tuerce" as string]: "0deg" }} className={`mt-6 max-w-[12ch] font-bold leading-[.84] tracking-[-0.035em] md:mt-10 ${TAM[largoDe(c.nombre)]}`}><Palabras texto={c.nombre} desde={120} /></h1>
        <div className="muestra-entra mt-8 grid gap-6 pb-8 md:mt-12 md:grid-cols-[1.2fr_1fr] md:items-end md:pb-12" style={{ animationDelay: ".5s" }}>
          <p className="max-w-lg text-[19px] leading-snug md:text-[22px]">{c.bajada}</p>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button type="button" data-demo className="muestra-brilla min-h-14 px-7 text-[16px] font-semibold" style={{ background: k.bloque, color: k.sobreBloque }}>Agendar por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center px-6 text-[16px] font-medium" style={{ boxShadow: `inset 0 0 0 2px ${k.tinta}` }}>Cómo llegar</a> : null}
          </div>
        </div>
      </section>

      <section className="relative">
        <Cielo colores={k.cielo} foto={fotos[0]} alt={c.nombre} className="muestra-abre aspect-[5/4] sm:aspect-[16/7]" flota={0.12} />
        <div className="muestra-entra absolute bottom-0 left-0 px-5 py-4 md:px-8 md:py-5" style={{ background: k.fondo, animationDelay: "1s" }}>
          <p className="flex items-center gap-2 text-[13px]" style={{ color: k.texto }}><Punto abierto={c.hoy !== "Cerrado"} />{c.hoy === "Cerrado" ? "Hoy" : "Abierto hoy"}</p>
          <p style={titular} className="text-[30px] font-bold leading-none tracking-[-0.02em] md:text-[40px]">{c.hoy}</p>
        </div>
      </section>

      {/* La cinta de servicios, que corre sola */}
      <div className="overflow-hidden py-3.5" style={{ background: k.bloque, color: k.sobreBloque }} aria-hidden>
        <div className="muestra-cinta">
          {[0, 1].map((v) => <p key={v} style={titular} className="flex shrink-0 items-center text-[22px] font-semibold md:text-[28px]">{cinta.map((s, i) => <span key={i} className="flex items-center"><span className="px-5">{s}</span><span className="h-2 w-2 rotate-45" style={{ background: k.sobreBloque }} /></span>)}</p>)}
        </div>
      </div>

      <section id="servicios" className="mt-14 px-4 md:mt-24 md:px-8">
        <div className="grid gap-8 pt-6 md:grid-cols-[1fr_2fr] md:gap-12 md:pt-8" style={regla}>
          <h2 data-aparece="lado" style={titular} className="text-[48px] font-bold leading-[.88] tracking-[-0.03em] md:text-[84px]">Lo que hacemos</h2>
          <ul className="grid gap-x-10 md:grid-cols-2">
            {c.servicios.map((s, i) => (
              <li key={s} data-aparece className="py-5" style={{ borderTop: i > (0) ? `1px solid ${k.tinta}` : undefined, ["--n" as string]: i }}>
                <p style={titular} className="text-[30px] font-bold leading-none tracking-[-0.02em] md:text-[36px]">{s}</p>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: k.texto }}>{c.detalles[i] || "Escríbenos y te contamos cómo trabajamos."}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 px-4 md:mt-24 md:px-8">
        <p style={{ ...titular, ...regla }} className="pt-6 text-[40px] font-bold leading-[.95] tracking-[-0.03em] md:max-w-[18ch] md:pt-8 md:text-[92px]"><Lee texto={FRASE[c.tono]} /></p>
      </section>

      <section id="nosotros" className="mt-14 px-4 md:mt-24 md:px-8">
        <div className="grid md:grid-cols-3" style={regla}>
          {razones.map(([t, x], i) => (
            <div key={t} data-aparece className={`py-7 md:py-10 ${i ? "md:pl-8" : ""} ${i < 2 ? "md:pr-8" : ""}`} style={{ borderTop: i ? `1px solid ${k.tinta}` : undefined, ["--n" as string]: i }}>
              <p style={titular} className="text-[34px] font-bold leading-none tracking-[-0.025em] md:text-[44px]">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={marco}><Pasos c={c} t={t} className="pt-6 md:pt-8" style={regla} /></div>
      <div className={marco}><Opiniones c={c} t={t} className="pt-6 md:pt-8" style={regla} /></div>
      <Fotos c={c} t={t} fotos={fotos} className="mt-14 !gap-1 md:mt-24" />
      <div className={marco}><Preguntas c={c} t={t} className="pt-6 md:pt-8" style={regla} /></div>

      <section id="visitanos" className="mt-14 md:mt-24" style={{ background: k.tinta, color: k.fondo }}>
        <div className="grid gap-10 px-4 py-12 md:grid-cols-2 md:px-8 md:py-20">
          <div data-aparece="lado">
            <h2 style={titular} className="text-[48px] font-bold leading-[.88] tracking-[-0.03em] md:text-[84px]">Ven a vernos</h2>
            <p className="mt-5 text-[20px] leading-snug">{c.direccion || c.ciudad}</p>
            {c.telefono ? <p className="mt-1 text-[16px] opacity-70">{c.telefono}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" data-demo className="muestra-brilla min-h-14 px-7 text-[16px] font-semibold" style={{ background: k.bloque, color: k.sobreBloque }}>Escríbenos por WhatsApp</button>
              {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center px-6 text-[16px]" style={{ boxShadow: `inset 0 0 0 2px ${k.fondo}` }}>Abrir en Google Maps</a> : null}
            </div>
          </div>
          <dl className="grid content-end">
            {c.horario.map(([d, h], i) => <div key={d} data-aparece className="flex justify-between gap-4 py-4 text-[17px]" style={{ borderTop: `1px solid ${k.fondo}55`, ["--n" as string]: i }}><dt className="opacity-70">{d}</dt><dd className="text-right font-medium">{h}</dd></div>)}
          </dl>
        </div>
        <p aria-hidden data-aparece style={titular} className={`break-words px-4 pb-6 font-bold leading-[.84] tracking-[-0.035em] md:px-8 ${TAM[largoDe(c.nombre)]}`}>{c.nombre}</p>
        <p className="px-4 pb-6 text-[12px] opacity-60 md:px-8">© {new Date().getFullYear()} {c.nombre}, {c.ciudad}</p>
      </section>
    </div>
  );
}
