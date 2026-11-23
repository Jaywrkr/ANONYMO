// Quién escribe (sistema/90): la página de Jay para los negocios que reciben una muestra. Llega por WhatsApp, debajo de la
// firma, y desde la franja de la muestra. Responde en 20 segundos a «¿quién es este que me escribe?»: una cara, de dónde
// viene, reconocimientos que se pueden comprobar y trabajos que se pueden abrir.
// Todo lo que dice es comprobable: las menciones están en awwwards.com/minervo (revisado el 19 nov 2026). No se agregan
// premios ni clientes que no existan.
import type { Metadata } from "next";
import { leerProspectos, numeroInternacional, OFERTA, precio } from "@anonymo/pipeline";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Jay Jaramillo — diseño web en Cuenca",
  description: "Diseñador e ingeniero en Cuenca. Tres menciones de honor en Awwwards y más de 110 mil seguidores en Instagram.",
  robots: { index: false, follow: false },
  openGraph: { title: "Jay Jaramillo — diseño web en Cuenca", description: "Quién soy, qué he hecho y cómo trabajo.", images: [{ url: "/jay/jay.webp", width: 1200, height: 1500 }] },
};

const MENCIONES: { sitio: string; cuando?: string; url: string }[] = [
  { sitio: "Minervo", cuando: "abril de 2020", url: "https://www.awwwards.com/sites/minervo" },
  { sitio: "JAYWRKR V3", url: "https://www.awwwards.com/sites/jaywrkr-v3" },
  { sitio: "m|nero studio", url: "https://www.awwwards.com/sites/m-nero-studio" },
];

const INSTAGRAM = "https://www.instagram.com/jaywrkr/";

/** Lo concreto, arriba: cifra, qué es y dónde se comprueba. «Desde 2011» son 15 años en 2026. */
const CIFRAS: [string, string, string?][] = [
  ["3", "menciones de honor en Awwwards", "#menciones"],
  ["110k", "seguidores en Instagram", "#instagram"],
  [String(new Date().getFullYear() - 2011), "años trabajando en tecnología"],
];

const DATOS: [string, string][] = [
  ["Formación", "Diseño de experiencia e interfaces (UX/UI) y telecomunicaciones en el Politécnico de Milán. Viví en Italia de 2016 a 2020."],
  ["Oficio", "Trabajo en tecnología desde 2011. Soy ingeniero y también diseño: lo que dibujo, lo sé construir."],
  ["Estudio", "Director creativo de Minervo Studio, con cientos de páginas hechas para experiencias de marca."],
];

const TRABAJOS: { nombre: string; que: string; imagen: string; url: string; ver: string }[] = [
  { nombre: "Jay es ___", que: "Mi web personal: una sola página que se reescribe según lo que quieras saber de mí.", imagen: "/jay/web-jay.webp", url: "https://jayjaramillo.vercel.app", ver: "jayjaramillo.vercel.app" },
  { nombre: "Coresolutions", que: "Web para una empresa de tecnología de Ecuador: infraestructura, nube y ciberseguridad.", imagen: "/jay/web-coresolutions.webp", url: "https://coresolutions-web.vercel.app", ver: "coresolutions-web.vercel.app" },
];

const PASOS: [string, string][] = [
  ["Te mando una muestra", "Una idea de tu web, hecha con lo que ya se sabe de tu negocio. Gratis y sin compromiso."],
  ["La ajustamos juntos", "Tus fotos, tus servicios, tus colores. Sabes el precio antes de empezar."],
  [`Queda lista en ${OFERTA.web.dias} días`, "Publicada, rápida y pensada para el celular, que es desde donde te buscan."],
];

const mono = "font-mono text-[12px] tracking-[.02em]";

export default async function Jay() {
  // El WhatsApp es el de Unmake, el mismo de «Quiero esta web». Sin número guardado, queda Instagram.
  let numero: string | undefined;
  try { numero = numeroInternacional((await leerProspectos()).numero); } catch { /* sin nube: la página se ve igual, sin el botón */ }
  const wa = numero ? `https://wa.me/${numero}?text=${encodeURIComponent("Hola Jay, vi tu página y quiero saber más de la web para mi negocio.")}` : undefined;
  const linea = { borderColor: "#d8d8d3" };
  return (
    <main className="min-h-screen font-sans" style={{ background: "#f4f4f1", color: "#121212" }}>
      <div className="mx-auto grid max-w-6xl md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* La foto: lo primero que se ve. En escritorio se queda quieta mientras se lee el resto. */}
        <div className="md:sticky md:top-0 md:h-screen md:p-6">
          <div className="relative h-[78vh] max-h-[640px] min-h-[420px] overflow-hidden md:h-full md:max-h-none" style={{ background: "#0c0c0c" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/jay/jay.webp" alt="Jay Jaramillo, sentado, con camiseta blanca y lentes" width={1200} height={1500} fetchPriority="high" className="h-full w-full object-cover object-[50%_18%]" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(12,12,12,0) 0%, rgba(12,12,12,.86) 78%)" }} />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-7">
              <p className={`${mono} flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80`}><span>Cuenca, Ecuador</span><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-white underline underline-offset-4">@jaywrkr ↗</a></p>
              <h1 className="text-[clamp(44px,12vw,76px)] font-normal leading-[.94] tracking-[-0.035em]">Jay Jaramillo</h1>
            </div>
          </div>
        </div>

        <div className="px-5 pb-28 pt-8 md:px-10 md:pb-24 md:pt-16">
          <p className="max-w-[26ch] text-[clamp(26px,6.4vw,38px)] leading-[1.12] tracking-[-0.025em]">Diseño webs para negocios de Cuenca. Soy quien te escribió por WhatsApp.</p>
          {/* Tres cifras concretas, cada una comprobable con un toque. */}
          <dl data-cifras className="mt-9 grid grid-cols-3 border-y" style={linea}>
            {CIFRAS.map(([n, t, href], i) => (
              <div key={t} className={`py-5 ${i ? "border-l pl-3 sm:pl-5" : ""} pr-2`} style={linea}>
                <dd className="text-[clamp(40px,11.5vw,72px)] font-light leading-[.9] tracking-[-0.05em]">{n}</dd>
                <dt className={`${mono} mt-3 leading-snug`} style={{ color: "#4a4a47" }}>{href ? <a href={href} target={href.startsWith("#") ? undefined : "_blank"} rel="noreferrer" className="underline underline-offset-4">{t}</a> : t}</dt>
              </div>
            ))}
          </dl>

          <section id="menciones" aria-labelledby="t-menciones" className="-mx-5 mt-12 scroll-mt-4 px-5 py-9 md:-mx-0 md:px-8 md:py-10" style={{ background: "#0c0c0c", color: "#f4f4f1" }}>
            <h2 id="t-menciones" className={mono} style={{ color: "#a3a39d" }}>Reconocimientos</h2>
            <p className="mt-3 max-w-[22ch] text-[clamp(28px,7vw,40px)] font-light leading-[1.06] tracking-[-0.03em]">Mención de honor en Awwwards, tres veces.</p>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed" style={{ color: "#a3a39d" }}>Awwwards es el premio internacional de diseño web. Un jurado de diseñadores revisa cada sitio.</p>
            <ul className="mt-6 border-t" style={{ borderColor: "#34342f" }}>
              {MENCIONES.map((m) => (
                <li key={m.url} className="border-b" style={{ borderColor: "#34342f" }}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex min-h-16 items-center justify-between gap-4 py-3">
                    <span className="text-[19px] tracking-[-0.01em]">{m.sitio}{m.cuando ? <span className={`${mono} ml-3`} style={{ color: "#a3a39d" }}>{m.cuando}</span> : null}</span>
                    <span className={`${mono} shrink-0 underline underline-offset-4`}>Ver la ficha ↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className={`${mono} mt-4`} style={{ color: "#a3a39d" }}>Las tres con Minervo, mi estudio.</p>
          </section>

          {/* Instagram: 114 mil seguidores y cuenta verificada el 19 nov 2026. Se dice «más de 110 mil» para que no envejezca. */}
          <section id="instagram" aria-labelledby="t-instagram" className="mt-14 scroll-mt-4">
            <h2 id="t-instagram" className={mono} style={{ color: "#6a6a66" }}>Instagram</h2>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-4 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/jay/instagram.webp" alt="Seis publicaciones de @jaywrkr: frases cortas en blanco y negro" loading="lazy" width={1384} height={1224} className="w-full" />
              <span className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <span>
                  <span className="flex items-center gap-2 text-[clamp(30px,8vw,44px)] font-light leading-none tracking-[-0.035em]">@jaywrkr
                    <svg viewBox="0 0 24 24" aria-label="Cuenta verificada" role="img" className="h-6 w-6 shrink-0"><path fill="#1d9bf0" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.500l-2.6-1.9-3.2.1-1-3-2.600-1.9 1-3-1-3 2.600-1.900 1-3 3.200.100z" /><path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.300 12.200l2.600 2.600 4.900-5.400" /></svg>
                  </span>
                  <span className="mt-2 block text-[16px]" style={{ color: "#4a4a47" }}>Más de 110 mil seguidores. Verdades incómodas, diseñadas simple.</span>
                </span>
                <span className={`${mono} underline underline-offset-4`}>Abrir Instagram ↗</span>
              </span>
            </a>
          </section>

          <section aria-labelledby="t-datos" className="mt-14">
            <h2 id="t-datos" className={mono} style={{ color: "#6a6a66" }}>De dónde vengo</h2>
            <dl className="mt-4 border-t" style={linea}>
              {DATOS.map(([t, d]) => (
                <div key={t} className="grid gap-1 border-b py-4 sm:grid-cols-[120px_1fr] sm:gap-6" style={linea}>
                  <dt className={mono} style={{ color: "#6a6a66" }}>{t}</dt>
                  <dd className="text-[16px] leading-relaxed">{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="t-trabajos" className="mt-14">
            <h2 id="t-trabajos" className={mono} style={{ color: "#6a6a66" }}>Trabajo que puedes abrir</h2>
            <ul className="mt-4 grid gap-8">
              {TRABAJOS.map((t) => (
                <li key={t.url}>
                  <a href={t.url} target="_blank" rel="noreferrer" className="group block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.imagen} alt={`Captura de la web ${t.nombre}`} loading="lazy" width={1552} height={772} className="aspect-[2/1] w-full border object-cover object-left-top" style={linea} />
                    <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[20px] tracking-[-0.015em]">{t.nombre}</span>
                      <span className={`${mono} underline underline-offset-4`}>{t.ver} ↗</span>
                    </span>
                    <span className="mt-1 block max-w-[52ch] text-[15px] leading-relaxed" style={{ color: "#4a4a47" }}>{t.que}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-pasos" className="mt-14">
            <h2 id="t-pasos" className={mono} style={{ color: "#6a6a66" }}>Cómo trabajo</h2>
            <ol className="mt-4 border-t" style={linea}>
              {PASOS.map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[28px_1fr] gap-3 border-b py-4" style={linea}>
                  <span className={mono} style={{ color: "#6a6a66" }}>{i + 1}</span>
                  <span><span className="block text-[18px] tracking-[-0.01em]">{t}</span><span className="mt-1 block text-[15px] leading-relaxed" style={{ color: "#4a4a47" }}>{d}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "#4a4a47" }}>La web de una página cuesta {precio(OFERTA.web.precio)}. Trabajo con Unmake, el estudio que tengo con Luna, que se encarga de fotos y comunicación.</p>
          </section>

          <section aria-label="Contacto" className="mt-12 flex flex-wrap gap-2.5">
            {wa && <a href={wa} target="_blank" rel="noreferrer" data-wa className="inline-flex min-h-14 items-center px-7 text-[16px] font-medium" style={{ background: "#25d366", color: "#0a0a0a" }}>Escríbeme por WhatsApp</a>}
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center px-6 text-[16px]" style={{ boxShadow: "inset 0 0 0 1.5px #121212" }}>Instagram @jaywrkr ↗</a>
          </section>
          <p className={`${mono} mt-10`} style={{ color: "#6a6a66" }}>© {new Date().getFullYear()} Jay Jaramillo · Unmake</p>
        </div>
      </div>
    </main>
  );
}
