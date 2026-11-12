// La propuesta para un prospecto (sistema/80): precio, plazos, qué incluye y «Aceptar». Va en el recordatorio a los 3 días.
// Es pública (llega por WhatsApp), no se indexa y no muestra nada interno. Sale de OFERTA: si cambia el precio, cambia aquí solo.
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarPorMuestra, idMuestraValido, leerProspectos, numeroInternacional, OFERTA, precio } from "@anonymo/pipeline";
import { portalActivo } from "@/lib/estudio";
import { Aceptar } from "./Aceptar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const serif = { fontFamily: "'Instrument Serif', Georgia, serif" };

async function cargar(id: string) {
  if (!portalActivo() || !idMuestraValido(id)) return undefined;
  const l = await leerProspectos();
  const p = buscarPorMuestra(l.prospectos, id);
  if (!p || p.estado === "descartado") return undefined;
  return { nombre: p.nombre, acepto: !!p.propuesta?.acepto, numero: numeroInternacional(l.numero) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await cargar(id).catch(() => undefined);
  const title = d ? `Propuesta de web para ${d.nombre}` : "Propuesta";
  return { title, description: "Precio, plazos y lo que incluye. Hecha por ANONYMO.", robots: { index: false, follow: false }, openGraph: d ? { title, description: "Precio, plazos y lo que incluye. Hecha por ANONYMO.", siteName: "ANONYMO" } : undefined };
}

export default async function Propuesta({ params }: Props) {
  const { id } = await params;
  const d = await cargar(id);
  if (!d) notFound();
  const { web, plan, extras } = OFERTA;
  // OFERTA habla de «el cliente»; aquí se le habla al negocio de tú.
  const deTu = (x: string) => x.replace("que ya vio el cliente", "que ya viste").replace("el cliente solo revisa", "tú solo revisas");
  const pasos = [
    ["Aceptas", "Te escribimos por WhatsApp para el primer pago (50 %)."],
    ["Te preguntamos lo justo", "Tus servicios, horarios y fotos si tienes. Los textos los escribimos nosotros."],
    [`En ${web.dias} días, tu web`, `Partimos de la muestra que viste. Tienes ${web.rondas} rondas de cambios.`],
    ["Publicamos", "Con tu dominio .com. Pagas el otro 50 % al publicar."],
  ];
  return (
    <div className="min-h-screen bg-[#f5f3ee] pb-40 text-[#1a1816]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6 text-[13px] md:px-8">
        <span className="font-medium tracking-[.08em]">ANONYMO</span>
        <a href={`/m/${id}`} className="text-[#5d5a55] underline underline-offset-4">Ver tu muestra ↗</a>
      </header>

      <main className="mx-auto max-w-3xl px-5 md:px-8">
        <p className="mt-14 text-[12px] uppercase tracking-[.16em] text-[#5d5a55]">Propuesta</p>
        <h1 style={serif} className="mt-3 text-[44px] leading-[1.02] md:text-[64px]">Tu web, <em>{d.nombre}</em>.</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#5d5a55]">Una web hecha para tu negocio, a partir de la idea que ya viste. Precio cerrado, sin sorpresas.</p>

        <section aria-label="Precio" className="mt-10 grid gap-6 rounded-[28px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <p className="text-[14px] font-medium">{web.nombre}</p>
            <p style={serif} className="mt-1 text-[48px] leading-none">{precio(web.precio)}</p>
            <p className="mt-2 text-[14px] text-[#5d5a55]">Lista en {web.dias} días · {web.rondas} rondas de cambios · {web.pago}</p>
          </div>
          <ul className="grid content-start gap-2 text-[14px] leading-snug md:max-w-xs">
            {web.incluye.map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="text-[#25a35a]">✓</span><span>{deTu(x)}</span></li>)}
          </ul>
        </section>

        <section aria-labelledby="como" className="mt-14">
          <h2 id="como" style={serif} className="text-[32px] leading-none">Cómo sigue</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-[22px] bg-[#1a18161a] md:grid-cols-2">
            {pasos.map(([t, x], i) => (
              <li key={t} className="bg-[#f5f3ee] p-5">
                <p className="text-[12px] text-[#5d5a55]">0{i + 1}</p>
                <p className="mt-2 text-[16px] font-medium">{t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#5d5a55]">{x}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="despues" className="mt-14 grid gap-8 md:grid-cols-2">
          <div>
            <h2 id="despues" style={serif} className="text-[32px] leading-none">Después</h2>
            <p className="mt-4 text-[15px]"><span className="font-medium">{plan.nombre}: {precio(plan.precio)} al mes.</span> <span className="text-[#5d5a55]">El primer mes va incluido; después es opcional.</span></p>
            <ul className="mt-3 grid gap-1.5 text-[14px] text-[#5d5a55]">{plan.incluye.map((x) => <li key={x}>· {x}</li>)}</ul>
          </div>
          <div>
            <h2 style={serif} className="text-[32px] leading-none">Si quieres más</h2>
            <dl className="mt-4 grid text-[14px]">
              {extras.map((x) => <div key={x.nombre} className="flex justify-between gap-4 border-t border-[#1a18161a] py-3"><dt>{x.nombre}</dt><dd className="shrink-0 font-medium">{precio(x.precio)}</dd></div>)}
            </dl>
          </div>
        </section>

        <p className="mt-14 text-[12px] text-[#8a8680]">Precios en dólares, más IVA.</p>
      </main>
      <Aceptar id={id} nombre={d.nombre} numero={d.numero} yaAcepto={d.acepto} />
    </div>
  );
}
