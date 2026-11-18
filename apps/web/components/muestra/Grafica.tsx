// Muestra «Gráfico» (sistema/79): grilla suiza. Un bloque de color fuerte, secciones numeradas, listas con líneas
// y el nombre gigante al final. Referencias: Obys (New Layer Capital), Virtu Legal, St Kilda (Savee → ANONYMO → Muestras).
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { DETALLE, FRASE, RAZONES, type Paleta } from "./estilos";

function Seccion({ n, titulo, k, children, id }: { n: number; titulo: string; k: Paleta; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="grid gap-6 px-5 py-14 md:grid-cols-[12rem_1fr] md:px-10 md:py-20" style={{ borderTop: `1px solid ${k.linea}` }}>
      <div><span className="inline-block px-2 py-1 text-[20px] font-semibold leading-none" style={{ background: k.tinta, color: k.fondo }}>{n}:</span></div>
      <div>
        <h2 className="text-[40px] font-medium leading-[.95] tracking-[-0.03em] md:text-[64px]">{titulo}</h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function Grafica({ c, k, fotos = [] }: { c: ContenidoMuestra; k: Paleta; fotos?: string[] }) {
  const datos = [
    c.estrellas ? [`${c.estrellas.toLocaleString("es-EC")} ★`, "en Google"] : null,
    c.resenas ? [`${c.resenas}`, "reseñas"] : null,
    [c.ciudad, "donde estamos"],
  ].filter(Boolean) as [string, string][];
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-36 font-sans">
      <section className="flex min-h-[86svh] flex-col justify-between px-5 pb-8 pt-5 md:px-10" style={{ background: k.acento, color: k.sobreAcento }}>
        <header className="flex items-center justify-between gap-4 text-[13px]">
          <span className="font-medium">{c.nombre}</span>
          <nav className="hidden gap-6 md:flex"><a href="#servicios">Servicios</a><a href="#datos">Datos</a><a href="#visitanos">Visítanos</a></nav>
          <button type="button" data-demo className="min-h-10 rounded-none px-4 text-[13px] font-medium" style={{ background: k.sobreAcento, color: k.acento }}>Agendar →</button>
        </header>
        {/* El tamaño baja con el largo del nombre (sistema/83): uno largo no puede comerse la pantalla. */}
        <h1 className={`break-words font-medium leading-[.9] tracking-[-0.045em] ${c.nombre.length > 34 ? "text-[clamp(36px,6.4vw,96px)]" : c.nombre.length > 20 ? "text-[clamp(44px,9vw,136px)]" : "text-[clamp(56px,12.5vw,190px)]"}`}>{c.nombre}</h1>
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
          <p className="text-[13px] uppercase tracking-[.08em] opacity-80">{c.rubro} · {c.ciudad}</p>
          <p className="max-w-lg text-[18px] leading-snug">{c.bajada}</p>
          <button type="button" data-demo className="min-h-12 px-6 text-[15px] font-medium" style={{ background: k.tinta === k.sobreAcento ? k.fondo : k.tinta, color: k.tinta === k.sobreAcento ? k.tinta : k.fondo }}>Agendar por WhatsApp ↗</button>
        </div>
      </section>

      {fotos[0] && (
        // Su foto a todo el ancho, pegada a la portada de color: el contraste es la gracia de esta plantilla.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotos[0]} alt={c.nombre} data-foto className="block aspect-[4/3] w-full object-cover md:aspect-[21/9]" />
      )}

      <Seccion n={1} titulo="Lo que hacemos" k={k} id="servicios">
        <ol>
          {c.servicios.map((s, i) => (
            <li key={s} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-4 md:grid-cols-[3rem_1fr_1fr_auto]" style={{ borderTop: `1px solid ${k.linea}` }}>
              <span className="text-[13px]" style={{ color: k.texto }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[22px] font-medium tracking-[-0.01em]">{s}</span>
              <span className="hidden text-[14px] md:block" style={{ color: k.texto }}>{DETALLE[c.tono][i]}</span>
              <span aria-hidden style={{ color: k.acento }}>↗</span>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion n={2} titulo="En números" k={k} id="datos">
        <div className="grid gap-3 sm:grid-cols-3">
          {datos.map(([v, t]) => (
            <div key={t} className="relative px-5 py-6">
              {/* Corchetes en las esquinas, como en la grilla de Virtu Legal. */}
              <span aria-hidden className="absolute inset-y-0 left-0 w-3" style={{ borderLeft: `1px solid ${k.tinta}`, borderTop: `1px solid ${k.tinta}`, borderBottom: `1px solid ${k.tinta}` }} />
              <span aria-hidden className="absolute inset-y-0 right-0 w-3" style={{ borderRight: `1px solid ${k.tinta}`, borderTop: `1px solid ${k.tinta}`, borderBottom: `1px solid ${k.tinta}` }} />
              <p className="text-[40px] font-medium leading-none tracking-[-0.03em]">{v}</p>
              <p className="mt-2 text-[12px] uppercase tracking-[.08em]" style={{ color: k.texto }}>{t}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-[24px] leading-snug tracking-[-0.01em]"><span style={{ background: k.suave, color: k.tinta }}>{FRASE[c.tono]}</span></p>
      </Seccion>

      <Seccion n={3} titulo="Por qué nosotros" k={k}>
        <div className="grid gap-8 md:grid-cols-3">
          {RAZONES[c.tono].map(([t, x], i) => (
            <div key={t}>
              <p className="text-[56px] font-medium leading-none tracking-[-0.04em]" style={{ color: k.acento }}>0{i + 1}</p>
              <p className="mt-4 text-[20px] font-medium">{t === "De aquí" ? `De ${c.ciudad}` : t}</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
            </div>
          ))}
        </div>
      </Seccion>

      {fotos.length > 1 && (
        <div className="grid gap-px sm:grid-cols-2" style={{ borderTop: `1px solid ${k.linea}`, background: k.linea }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotos.slice(1).map((f) => <img key={f} src={f} alt={c.nombre} data-foto loading="lazy" className={`aspect-[4/3] w-full object-cover ${fotos.length === 2 ? "sm:col-span-2 sm:aspect-[21/9]" : ""}`} />)}
        </div>
      )}

      <Seccion n={4} titulo="Visítanos" k={k} id="visitanos">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-[24px] leading-snug">{c.direccion || c.ciudad}</p>
            {c.telefono ? <p className="mt-2 text-[16px]" style={{ color: k.texto }}>{c.telefono}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" data-demo className="min-h-12 px-6 text-[15px] font-medium" style={{ background: k.acento, color: k.sobreAcento }}>Escríbenos por WhatsApp</button>
              {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center px-2 text-[15px] underline underline-offset-4">Google Maps ↗</a> : null}
            </div>
          </div>
          <dl className="grid content-start">
            {c.horario.map(([d, h]) => <div key={d} className="flex justify-between gap-4 py-3 text-[16px]" style={{ borderTop: `1px solid ${k.linea}` }}><dt style={{ color: k.texto }}>{d}</dt><dd className="text-right">{h}</dd></div>)}
          </dl>
        </div>
      </Seccion>

      {/* El nombre gigante al final: la firma de la página. */}
      <footer className="overflow-hidden" style={{ background: k.tinta, color: k.fondo }}>
        <div className="flex justify-between px-5 pt-6 text-[12px] md:px-10"><span>© {new Date().getFullYear()} {c.nombre}</span><span>{c.ciudad}</span></div>
        <p aria-hidden className={`mt-6 break-words px-5 pb-6 font-medium leading-[.88] tracking-[-0.045em] md:px-10 ${c.nombre.length > 34 ? "text-[clamp(36px,6.4vw,96px)]" : c.nombre.length > 20 ? "text-[clamp(44px,9vw,136px)]" : "text-[clamp(56px,12.5vw,190px)]"}`}>{c.nombre}</p>
      </footer>
    </div>
  );
}
