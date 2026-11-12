// Las plantillas de la muestra (sistema/79): 2 variantes por rubro, con un negocio de ejemplo.
import Link from "next/link";
import { PLANTILLAS_MUESTRA } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { PestanasClientes } from "@/components/estudio/clientes/PestanasClientes";
import { TONOS, VARIANTES } from "@/lib/ejemplos-muestra";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plantillas de la muestra — Estudio", robots: { index: false } };

const NOMBRE_TONO: Record<string, string> = { salud: "Salud", legal: "Legal y contable", belleza: "Belleza y bienestar", otro: "Otros rubros" };
const TABLERO: Record<string, string | undefined> = {
  salud: "https://savee.com/thejaywrkr/boards/anonymo/muestras-salud/",
  legal: "https://savee.com/thejaywrkr/boards/anonymo/muestras-legal/",
  belleza: "https://savee.com/thejaywrkr/boards/anonymo/muestras-belleza/",
};

export default async function Plantillas() {
  await exigirEstudio();
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px] text-suave">Ventas · Imán</p>
      <h1 className={`${serif} text-[40px] leading-none`}>Plantillas de la muestra.</h1>
      <PestanasClientes actual="plantillas" />
      <p className="mt-5 max-w-3xl text-[15px] text-medio">
        Cada negocio recibe una de las dos. Si no eliges, sale mitad y mitad, para saber cuál hace que respondan más. Para cambiarla: Clientes nuevos → el negocio → «Más» → «Plantilla».
      </p>
      <dl className="mt-4 grid max-w-3xl gap-1 text-[14px]">
        {VARIANTES.map((v) => <div key={v}><dt className="inline font-medium">{PLANTILLAS_MUESTRA[v].nombre}: </dt><dd className="inline text-medio">{PLANTILLAS_MUESTRA[v].idea}</dd></div>)}
      </dl>
      <div className="mt-8 grid gap-10">
        {TONOS.map((t) => (
          <section key={t} aria-labelledby={`t-${t}`}>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id={`t-${t}`} className={`${serif} text-[28px] leading-none`}>{NOMBRE_TONO[t]}</h2>
              {TABLERO[t] && <a href={TABLERO[t]} target="_blank" rel="noreferrer" className="text-[13px] text-medio underline underline-offset-4">Referencias en Savee ↗</a>}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {VARIANTES.map((v) => (
                <figure key={v} className="m-0">
                  <div className="relative h-[520px] overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]">
                    {/* Vista de celular a escala: 390 px de ancho. */}
                    <iframe title={`${NOMBRE_TONO[t]} · ${PLANTILLAS_MUESTRA[v].nombre}`} src={`/m/ejemplo/${t}/${v}`} loading="lazy" className="absolute left-1/2 top-0 h-[1040px] w-[390px] origin-top -translate-x-1/2 scale-50 border-0" />
                  </div>
                  <figcaption className="mt-2 flex items-center justify-between text-[14px]">
                    <span className="font-medium">{PLANTILLAS_MUESTRA[v].nombre}</span>
                    <Link href={`/m/ejemplo/${t}/${v}`} target="_blank" className="text-medio underline underline-offset-4">Abrir ↗</Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
