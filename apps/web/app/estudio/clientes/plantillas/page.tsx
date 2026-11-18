// Las plantillas de la muestra (sistema/79): 2 variantes por rubro, con un negocio de ejemplo.
import Link from "next/link";
import { leerProspectos, PLANTILLAS_MUESTRA, resultadosPlantillas } from "@anonymo/pipeline";
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
  // Cómo le va a cada una (sistema/81). Si la nube no responde, la página se ve igual sin la tabla.
  const res = await leerProspectos().then((l) => resultadosPlantillas(Object.values(l.prospectos)), () => undefined);
  const total = res ? res.sereno.enviadas + res.grafico.enviadas : 0;
  const pct = (n: number, de: number) => (de ? `${Math.round((n / de) * 100)} %` : "—");
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
      {res && (
        <section aria-label="Cuál funciona mejor" className="mt-8 max-w-3xl rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <h2 className="text-[15px] font-medium">Cuál funciona mejor</h2>
          <p className="text-[12px] text-suave">De las muestras enviadas: cuántas abrieron, cuántos tocaron «Quiero esta web» y cuántos aceptaron la propuesta.</p>
          {total === 0 ? (
            <p className="mt-2 text-[14px] text-medio">Todavía no hay muestras enviadas. Cuando mandes la primera tanda, aquí se ve cuál plantilla abren más y cuál consigue más «Quiero esta web».</p>
          ) : (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[13px] sm:text-[14px]">
                  <thead className="text-[12px] text-suave"><tr><th className="py-1.5 font-normal">Plantilla</th><th className="font-normal">Enviadas</th><th className="font-normal">Abiertas</th><th className="font-normal">Quieren</th><th className="font-normal">Aceptaron</th></tr></thead>
                  <tbody>
                    {VARIANTES.map((v) => { const f = res[v]; return (
                      <tr key={v} className="border-t border-black/5">
                        <th scope="row" className="py-2.5 font-medium">{PLANTILLAS_MUESTRA[v].nombre}</th>
                        <td>{f.enviadas}</td>
                        <td>{f.abiertas} <span className="whitespace-nowrap text-suave">· {pct(f.abiertas, f.enviadas)}</span></td>
                        <td>{f.quieren} <span className="whitespace-nowrap text-suave">· {pct(f.quieren, f.enviadas)}</span></td>
                        <td>{f.aceptaron} <span className="whitespace-nowrap text-suave">· {pct(f.aceptaron, f.enviadas)}</span></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
              {total < 40 && <p className="mt-2 text-[12px] text-suave">Con {total} {total === 1 ? "enviada" : "enviadas"} todavía es pronto para decidir: espera a unas 40 antes de quedarte con una.</p>}
            </>
          )}
        </section>
      )}
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
