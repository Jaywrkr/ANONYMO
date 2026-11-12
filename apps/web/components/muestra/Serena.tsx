// Muestra «Sereno» (sistema/79): calma premium. Papel cálido, serif liviana con una palabra en cursiva,
// bloques redondeados y mucho aire. Referencias: Aesop, Oura, Monist, Radiant (Savee → ANONYMO → Muestras).
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { DETALLE, FRASE, HORARIO_EJEMPLO, RAZONES, iniciales, type Paleta } from "./estilos";

const serif = { fontFamily: "'Instrument Serif', Georgia, serif" };

/** «Clínica Dental Sonrisa» → «Clínica Dental» + «Sonrisa» en cursiva. */
function nombreConCursiva(n: string) {
  const p = n.trim().split(/\s+/);
  if (p.length < 2) return <em className="italic">{n}</em>;
  return <>{p.slice(0, -1).join(" ")} <em className="italic">{p.at(-1)}</em></>;
}

export function Serena({ c, k }: { c: ContenidoMuestra; k: Paleta }) {
  const razones = RAZONES[c.tono];
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-36">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 md:px-10">
        <span style={serif} className="truncate text-[24px] leading-none">{c.nombre}</span>
        <nav className="hidden gap-8 text-[13px] uppercase tracking-[.12em] md:flex" style={{ color: k.texto }}>
          <a href="#servicios">Servicios</a><a href="#nosotros">Nosotros</a><a href="#visitanos">Visítanos</a>
        </nav>
        <button type="button" data-demo className="min-h-10 shrink-0 rounded-full px-5 text-[13px]" style={{ boxShadow: `inset 0 0 0 1px ${k.tinta}` }}>Agendar</button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 md:px-10 md:pt-16">
        <p className="text-[12px] uppercase tracking-[.18em]" style={{ color: k.acento }}>{c.rubro} — {c.ciudad}</p>
        <h1 style={serif} className="mt-5 max-w-5xl text-[56px] leading-[.95] md:text-[104px]">{nombreConCursiva(c.nombre)}</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <p className="max-w-xl text-[18px] leading-relaxed" style={{ color: k.texto }}>{c.bajada}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" data-demo className="min-h-12 rounded-full px-7 text-[15px]" style={{ background: k.tinta, color: k.fondo }}>Agendar por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center px-2 text-[15px] underline underline-offset-4">Cómo llegar</a> : null}
          </div>
        </div>
      </section>

      {/* La imagen grande sin fotos ajenas: color, luz y la inicial. Cuando sea su web, aquí va su foto. */}
      <section className="mx-auto mt-12 max-w-6xl px-5 md:px-10" aria-hidden>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-[16/8]" style={{ background: `radial-gradient(120% 120% at 15% 0%, ${k.suave} 0%, ${k.acento} 75%, ${k.tinta} 120%)` }}>
          <span className="absolute -bottom-[0.18em] right-6 select-none leading-none opacity-90" style={{ ...serif, fontSize: "clamp(14rem, 34vw, 30rem)", color: k.fondo }}>{iniciales(c.nombre).slice(0, 1)}</span>
          <div className="absolute bottom-5 left-5 rounded-2xl px-5 py-4 text-[13px] backdrop-blur" style={{ background: `${k.fondo}e6`, color: k.tinta }}>
            <p className="uppercase tracking-[.14em]" style={{ color: k.acento }}>Abierto hoy</p>
            <p className="mt-1">{HORARIO_EJEMPLO[0][1]}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28">
        <p style={serif} className="text-[34px] leading-tight md:text-[52px]">{FRASE[c.tono]}</p>
        {c.estrellas ? <p className="mt-6 text-[14px]" style={{ color: k.texto }}>{"★".repeat(Math.round(c.estrellas))} {c.estrellas.toLocaleString("es-EC")} en Google · {c.resenas} reseñas</p> : null}
      </section>

      <section id="servicios" className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_1.4fr] md:px-10">
        <div>
          <p className="text-[12px] uppercase tracking-[.18em]" style={{ color: k.acento }}>Servicios</p>
          <h2 style={serif} className="mt-3 text-[44px] leading-none md:text-[60px]">Lo que <em className="italic">hacemos</em></h2>
        </div>
        <ol className="grid">
          {c.servicios.map((s, i) => (
            <li key={s} className="grid grid-cols-[3rem_1fr] gap-x-4 py-6" style={{ borderTop: `1px solid ${k.linea}` }}>
              <span className="pt-2 text-[12px]" style={{ color: k.texto }}>{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span style={serif} className="block text-[28px] leading-tight">{s}</span>
                <span className="mt-1 block text-[14px]" style={{ color: k.texto }}>{DETALLE[c.tono][i]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="nosotros" className="mx-auto mt-24 max-w-6xl px-5 md:px-10">
        <div className="grid gap-px overflow-hidden rounded-[28px] md:grid-cols-3" style={{ background: k.linea }}>
          {razones.map(([t, x]) => (
            <div key={t} className="p-8" style={{ background: k.suave }}>
              <p style={serif} className="text-[28px] leading-tight">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="visitanos" className="mx-5 mt-24 grid max-w-6xl gap-px overflow-hidden rounded-[28px] md:mx-auto md:grid-cols-2" style={{ background: k.linea }}>
        <div className="p-8 md:p-12" style={{ background: k.fondo }}>
          <p className="text-[12px] uppercase tracking-[.18em]" style={{ color: k.acento }}>Agenda</p>
          <p style={serif} className="mt-3 text-[36px] leading-tight">Escríbenos y te <em className="italic">confirmamos</em> hoy.</p>
          <button type="button" data-demo className="mt-6 min-h-12 rounded-full px-7 text-[15px]" style={{ background: k.acento, color: k.sobreAcento }}>Agendar por WhatsApp</button>
          {c.telefono ? <p className="mt-4 text-[14px]" style={{ color: k.texto }}>o llama al {c.telefono}</p> : null}
        </div>
        <div className="p-8 md:p-12" style={{ background: k.fondo }}>
          <p className="text-[12px] uppercase tracking-[.18em]" style={{ color: k.acento }}>Visítanos</p>
          <p className="mt-3 text-[17px]">{c.direccion || c.ciudad}</p>
          <dl className="mt-6 grid gap-2 text-[15px]">
            {HORARIO_EJEMPLO.map(([d, h]) => <div key={d} className="flex justify-between gap-4 pb-2" style={{ borderBottom: `1px solid ${k.linea}` }}><dt style={{ color: k.texto }}>{d}</dt><dd>{h}</dd></div>)}
          </dl>
          {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="mt-6 inline-block text-[15px] underline underline-offset-4">Abrir en Google Maps</a> : null}
        </div>
      </section>

      <footer className="mx-auto mt-24 max-w-6xl px-5 text-center md:px-10">
        <p style={serif} className="text-[clamp(48px,11vw,150px)] leading-none">{nombreConCursiva(c.nombre)}</p>
        <p className="mt-6 text-[12px]" style={{ color: k.texto }}>© {new Date().getFullYear()} {c.nombre} · {c.ciudad}</p>
      </footer>
    </div>
  );
}
