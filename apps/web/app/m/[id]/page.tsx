// La muestra de un prospecto (sistema/72): una idea de su web, hecha por ANONYMO con lo que ya se sabe del negocio.
// Es pública (llega por WhatsApp), no se indexa y no muestra nada interno: ni puntaje, ni notas, ni lo que falla en su web.
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarPorMuestra, contenidoMuestra, idMuestraValido, leerProspectos, numeroInternacional, OFERTA, precio, type ContenidoMuestra, type Tono } from "@anonymo/pipeline";
import { portalActivo } from "@/lib/estudio";
import { Visto } from "./Visto";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function cargar(id: string) {
  if (!portalActivo() || !idMuestraValido(id)) return undefined;
  const l = await leerProspectos();
  const p = buscarPorMuestra(l.prospectos, id);
  if (!p || p.estado === "descartado") return undefined;
  return { c: contenidoMuestra(p), numero: numeroInternacional(l.numero) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await cargar(id).catch(() => undefined);
  if (!d) return { title: "Muestra", robots: { index: false, follow: false } };
  // Es lo que se ve en la vista previa de WhatsApp.
  return {
    title: `Idea de web para ${d.c.nombre}`,
    description: "Una muestra hecha por ANONYMO. Ábrela para verla en tu celular.",
    robots: { index: false, follow: false },
    openGraph: { title: `Idea de web para ${d.c.nombre}`, description: "Una muestra hecha por ANONYMO. Ábrela para verla en tu celular.", siteName: "ANONYMO" },
  };
}

const PALETA: Record<Tono, { fondo: string; tinta: string; acento: string; suave: string; texto: string }> = {
  salud: { fondo: "#f5faf9", tinta: "#0d2b2e", acento: "#0f766e", suave: "#dcefec", texto: "#43605f" },
  legal: { fondo: "#f7f5f0", tinta: "#18203a", acento: "#22406f", suave: "#e7e2d4", texto: "#55596a" },
  belleza: { fondo: "#fbf6f2", tinta: "#2b1d1a", acento: "#b4533c", suave: "#f2e0d6", texto: "#6d5650" },
  otro: { fondo: "#f7f7f5", tinta: "#1a1816", acento: "#e2442a", suave: "#ecebe7", texto: "#5d5a55" },
};

const RAZONES: Record<Tono, [string, string][]> = {
  salud: [["Citas sin esperas", "Eliges el horario desde el celular y te confirmamos por WhatsApp."], ["Te explicamos cada paso", "Antes de empezar sabes qué vamos a hacer, cuánto dura y cuánto cuesta."], ["Seguimiento real", "Después de cada tratamiento te escribimos para saber cómo sigues."]],
  legal: [["Claridad desde el inicio", "En la primera reunión sales sabiendo qué opciones tienes."], ["Costos por adelantado", "Sabes cuánto cuesta tu trámite antes de empezar."], ["Te mantenemos al tanto", "Te avisamos cada avance sin que tengas que preguntar."]],
  belleza: [["Reserva en un minuto", "Escoge tu turno por WhatsApp, sin llamadas."], ["Productos de calidad", "Trabajamos con marcas que cuidan tu piel y tu cabello."], ["Un espacio para ti", "Llegas, te relajas y sales como querías."]],
  otro: [["Atención directa", "Hablas con quien hace el trabajo, sin intermediarios."], ["Respuesta rápida", "Escríbenos por WhatsApp y te contestamos el mismo día."], ["Hecho en " , "Conocemos la ciudad y a nuestros clientes."]],
};

const iniciales = (n: string) => n.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/i.test(w) && w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || n.slice(0, 1).toUpperCase();

export default async function Muestra({ params }: Props) {
  const { id } = await params;
  const d = await cargar(id);
  if (!d) notFound();
  const { c, numero } = d;
  const k = PALETA[c.tono];
  const razones = RAZONES[c.tono].map(([t, x]) => (t === "Hecho en " ? [`Hecho en ${c.ciudad}`, x] : [t, x]));
  const serif = { fontFamily: "'Instrument Serif', Georgia, serif" };
  return (
    <div style={{ background: k.fondo, color: k.tinta }} className="min-h-screen pb-36 font-sans">
      <p className="px-5 py-2 text-center text-[12px]" style={{ background: k.tinta, color: k.fondo }}>
        Idea de web para {c.nombre}, hecha por ANONYMO. Los textos son de ejemplo.
      </p>

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-medium" style={{ background: k.acento, color: k.fondo }}>{iniciales(c.nombre)}</span>
          <span className="truncate text-[15px] font-medium">{c.nombre}</span>
        </div>
        <nav className="hidden gap-7 text-[14px] md:flex" style={{ color: k.texto }}>
          <a href="#servicios">Servicios</a><a href="#nosotros">Nosotros</a><a href="#ubicacion">Ubicación</a>
        </nav>
        <button type="button" data-demo className="min-h-10 shrink-0 rounded-full px-5 text-[14px] font-medium" style={{ background: k.tinta, color: k.fondo }}>Agendar</button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.15fr_.85fr] md:px-10 md:pt-14">
        <div>
          <p className="text-[13px] uppercase tracking-[.14em]" style={{ color: k.acento }}>{c.rubro} · {c.ciudad}</p>
          <h1 style={serif} className="mt-4 text-[52px] leading-[.95] md:text-[88px]">{c.nombre}</h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed md:text-[20px]" style={{ color: k.texto }}>{c.bajada}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" data-demo className="min-h-12 rounded-full px-7 text-[15px] font-medium" style={{ background: k.acento, color: "#fff" }}>Agendar por WhatsApp</button>
            {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full px-7 text-[15px]" style={{ boxShadow: `inset 0 0 0 1px ${k.tinta}33` }}>Cómo llegar</a> : null}
          </div>
          {c.estrellas ? (
            <p className="mt-8 text-[14px]" style={{ color: k.texto }}>
              <span style={{ color: k.acento }}>{"★".repeat(Math.round(c.estrellas))}</span> {c.estrellas.toLocaleString("es-EC")} en Google · {c.resenas} reseñas
            </p>
          ) : null}
        </div>
        <Lamina c={c} k={k} />
      </section>

      <section id="servicios" className="mx-auto max-w-6xl px-5 py-14 md:px-10">
        <h2 style={serif} className="text-[40px] leading-none md:text-[56px]">Lo que hacemos</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.servicios.map((s, i) => (
            <li key={s} className="rounded-3xl p-6" style={{ background: "#fff", boxShadow: `0 0 0 1px ${k.tinta}10` }}>
              <p className="text-[12px]" style={{ color: k.acento }}>{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-10 text-[19px] font-medium leading-snug">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="nosotros" className="py-16" style={{ background: k.suave }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-3 md:px-10">
          {razones.map(([t, x]) => (
            <div key={t}>
              <p style={serif} className="text-[30px] leading-tight">{t}</p>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: k.texto }}>{x}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ubicacion" className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-2 md:px-10">
        <div>
          <h2 style={serif} className="text-[40px] leading-none md:text-[56px]">Visítanos</h2>
          <p className="mt-5 text-[16px]" style={{ color: k.texto }}>{c.direccion || c.ciudad}</p>
          {c.telefono ? <p className="mt-2 text-[16px]">{c.telefono}</p> : null}
        </div>
        <div className="grid content-start gap-3 md:justify-items-end">
          <button type="button" data-demo className="min-h-12 rounded-full px-7 text-[15px] font-medium" style={{ background: k.tinta, color: k.fondo }}>Escríbenos por WhatsApp</button>
          {c.mapa ? <a href={c.mapa} target="_blank" rel="noreferrer" className="text-[15px] underline underline-offset-4">Abrir en Google Maps</a> : null}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-[13px] md:px-10" style={{ color: k.texto }}>© {new Date().getFullYear()} {c.nombre}</footer>

      <Visto id={id} nombre={c.nombre} numero={numero} oferta={{ dias: OFERTA.web.dias, precio: precio(OFERTA.web.precio) }} />
    </div>
  );
}

/** La imagen del inicio sin fotos ajenas: una composición con el color y la inicial del negocio. */
function Lamina({ c, k }: { c: ContenidoMuestra; k: (typeof PALETA)[Tono] }) {
  return (
    <div aria-hidden className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem]" style={{ background: `radial-gradient(120% 90% at 20% 10%, ${k.suave} 0%, ${k.acento} 70%, ${k.tinta} 100%)` }}>
      <span className="absolute -bottom-10 -right-4 select-none leading-none" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22rem", color: k.fondo, opacity: 0.9 }}>{iniciales(c.nombre).slice(0, 1)}</span>
      <div className="absolute left-6 top-6 rounded-2xl px-4 py-3 text-[13px] backdrop-blur" style={{ background: `${k.fondo}e6`, color: k.tinta }}>
        <p className="font-medium">{c.servicios[0]}</p>
        <p style={{ color: k.texto }}>{c.ciudad}</p>
      </div>
    </div>
  );
}
