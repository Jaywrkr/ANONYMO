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
  description: "Quién soy, qué he hecho y cómo trabajo. Diseñador e ingeniero en Cuenca, con tres menciones de honor en Awwwards.",
  robots: { index: false, follow: false },
  openGraph: { title: "Jay Jaramillo — diseño web en Cuenca", description: "Quién soy, qué he hecho y cómo trabajo.", images: [{ url: "/jay/jay.webp", width: 1200, height: 1500 }] },
};

const MENCIONES: { sitio: string; cuando?: string; url: string }[] = [
  { sitio: "Minervo", cuando: "abril de 2020", url: "https://www.awwwards.com/sites/minervo" },
  { sitio: "JAYWRKR V3", url: "https://www.awwwards.com/sites/jaywrkr-v3" },
  { sitio: "m|nero studio", url: "https://www.awwwards.com/sites/m-nero-studio" },
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
  // El WhatsApp es el de ANONYMO, el mismo de «Quiero esta web». Sin número guardado, queda Instagram.
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
              <p className={`${mono} text-white/75`}>Cuenca, Ecuador</p>
              <h1 className="mt-2 text-[clamp(44px,12vw,76px)] font-normal leading-[.94] tracking-[-0.035em]">Jay Jaramillo</h1>
            </div>
          </div>
        </div>

        <div className="px-5 pb-28 pt-8 md:px-10 md:pb-24 md:pt-16">
          <p className="max-w-[26ch] text-[clamp(26px,6.4vw,38px)] leading-[1.12] tracking-[-0.025em]">Diseño webs para negocios de Cuenca. Soy quien te escribió por WhatsApp.</p>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed" style={{ color: "#4a4a47" }}>
            Es normal desconfiar de un mensaje con un enlace. Por eso esta página: aquí está mi cara, de dónde vengo y trabajo mío que puedes abrir y revisar.
          </p>

          <section aria-labelledby="t-menciones" className="mt-14">
            <h2 id="t-menciones" className={mono} style={{ color: "#6a6a66" }}>Reconocimientos</h2>
            <p className="mt-3 max-w-[30ch] text-[24px] leading-[1.18] tracking-[-0.02em]">Tres menciones de honor en Awwwards, el premio internacional de diseño web.</p>
            <ul className="mt-5 border-t" style={linea}>
              {MENCIONES.map((m) => (
                <li key={m.url} className="border-b" style={linea}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-between gap-4 py-3 text-[16px]">
                    <span>{m.sitio}{m.cuando ? <span style={{ color: "#6a6a66" }}>, {m.cuando}</span> : null}</span>
                    <span className={`${mono} shrink-0 underline underline-offset-4`}>Ver en Awwwards ↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "#6a6a66" }}>Las tres con Minervo, mi estudio. Cada enlace abre la ficha en el sitio de Awwwards.</p>
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
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "#4a4a47" }}>La web de una página cuesta {precio(OFERTA.web.precio)}. Trabajo con ANONYMO, el estudio que tengo con Luna, que se encarga de fotos y comunicación.</p>
          </section>

          <section aria-label="Contacto" className="mt-12 flex flex-wrap gap-2.5">
            {wa && <a href={wa} target="_blank" rel="noreferrer" data-wa className="inline-flex min-h-14 items-center px-7 text-[16px] font-medium" style={{ background: "#25d366", color: "#0a0a0a" }}>Escríbeme por WhatsApp</a>}
            <a href="https://www.instagram.com/jaywrkr/" target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center px-6 text-[16px]" style={{ boxShadow: "inset 0 0 0 1.5px #121212" }}>Instagram @jaywrkr ↗</a>
          </section>
          <p className={`${mono} mt-10`} style={{ color: "#6a6a66" }}>© {new Date().getFullYear()} Jay Jaramillo · ANONYMO</p>
        </div>
      </div>
    </main>
  );
}
