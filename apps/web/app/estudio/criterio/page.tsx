// Criterio de la casa y lo que saben los agentes (sistema/54).
// Jay y Luna escriben su estándar; todos los agentes y el revisor lo leen antes de cada entrega.
import { CRITERIO_PROPUESTO, OFICIO, PLANTILLAS, leerCriterio, type Disciplina } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { traer } from "@/lib/nube";
import { accionCriterio } from "@/app/estudio/acciones";
import { Enviar } from "@/app/estudio/nuevo/Enviar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Criterio de la casa — Estudio", robots: { index: false } };

const QUIENES: Record<Disciplina, string> = {
  web: "Orla, Vector, Lumen, Kine y Trofeo",
  identidad: "Nova, Mira y Kine",
  naming: "Verba, Rhea y Sonda",
  contenido: "Faro, Chispa, Corte, Lente y Escena",
  textos: "Rhea",
};

export default async function Pagina() {
  await exigirEstudio();
  await traer("_agencia");
  const c = leerCriterio();
  return (
    <div className="px-5 py-7 md:px-10">
      <h1 className={`${serif} text-[40px] leading-none`}>Criterio de la casa.</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-medio">Lo que para ustedes está bien hecho. Cada agente lo lee antes de trabajar y el revisor lo usa para calificar: si una entrega no llega a 8/10, se rehace sola antes de que la veas.</p>
      {/* El resultado de guardar (ok o error) lo muestra el aviso flotante del estudio. */}

      <form action={accionCriterio} className="mt-6 grid max-w-3xl gap-3 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
        <input type="hidden" name="revision" value={c.revision} />
        <label htmlFor="criterio" className="text-[14px] font-medium">Nuestro estándar</label>
        <textarea key={c.revision} id="criterio" name="texto" rows={9} defaultValue={c.texto} required minLength={20} maxLength={4000}
          className="w-full rounded-xl bg-[#f6f3ee] px-4 py-3 text-[14px] leading-relaxed outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]" />
        <p className="text-[12px] text-suave">Una idea por línea. Ejemplos: estudios o webs que admiran, lo que nunca quieren ver, cómo debe sonar la agencia. {c.fecha ? `Última vez: ${new Date(c.fecha).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${c.quien ? ` por ${c.quien === "luna" ? "Luna" : "Jay"}` : ""}.` : "Es el texto inicial: cámbialo cuando quieras."}</p>
        <div><Enviar className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white" texto="Guardar criterio" trabajando="Guardando…" /></div>
      </form>

      {c.texto !== CRITERIO_PROPUESTO && (
        <details className="mt-4 max-w-3xl rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]" data-propuesta>
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">Propuesta de criterio: 10 reglas con ejemplos</span>
            <span className="text-[12px] text-suave">Armada con lo que guardas en MyMind y el tablero «Criterio de la casa» de Savee.</span>
          </summary>
          <ol className="mt-3 grid gap-2 text-[14px] leading-relaxed text-medio">
            {CRITERIO_PROPUESTO.split("\n").map((l) => <li key={l}>{l}</li>)}
          </ol>
          <p className="mt-3 text-[12px] text-suave">Revísala en 15 minutos: cambia lo que no sea tuyo. Al usarla reemplaza el texto de arriba; lo puedes seguir editando.</p>
          <form action={accionCriterio} className="mt-3">
            <input type="hidden" name="revision" value={c.revision} />
            <input type="hidden" name="texto" value={CRITERIO_PROPUESTO} />
            <Enviar className="inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-medium shadow-[inset_0_0_0_1px_#1a1816]" texto="Usar esta propuesta" trabajando="Guardando…" />
          </form>
        </details>
      )}

      <h2 className={`${serif} mt-12 text-[28px]`}>Lo que saben los agentes.</h2>
      <p className="mt-2 max-w-2xl text-[14px] text-medio">El estándar de oficio de cada disciplina. Lo leen antes de trabajar y el revisor califica con la misma lista.</p>
      <div className="mt-5 grid max-w-3xl gap-3">
        {(Object.keys(OFICIO) as Disciplina[]).map((d) => {
          const o = OFICIO[d];
          return (
            <details key={d} className="group rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                <span className="text-[16px] font-medium">{o.nombre}</span>
                <span className="text-[12px] text-suave">{QUIENES[d]}</span>
                <span className="ml-auto text-medio transition group-open:rotate-45">+</span>
              </summary>
              <div className="mt-3 grid gap-4 text-[14px] leading-relaxed">
                <Bloque titulo="Cómo se hace bien" items={o.bien} />
                <Bloque titulo="Lo que se hace hoy" items={o.hoy} />
                <Bloque titulo="Lo que delata trabajo genérico" items={o.evitar} />
                <Bloque titulo="Con qué califica el revisor" items={o.rubrica.map(([, t]) => t)} />
              </div>
            </details>
          );
        })}
        <details className="group rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
            <span className="text-[16px] font-medium">Cómo comunica cada tipo de negocio</span>
            <span className="text-[12px] text-suave">{PLANTILLAS.length} rubros · se reconoce solo por el pedido</span>
            <span className="ml-auto text-medio transition group-open:rotate-45">+</span>
          </summary>
          <div className="mt-3 grid gap-4 text-[14px] leading-relaxed">
            {PLANTILLAS.filter((p) => p.comunica).map((p) => (
              <div key={p.id}>
                <p className="font-medium">{p.nombre}</p>
                <p className="text-medio"><span className="text-tinta">Tono:</span> {p.comunica!.tono} <span className="text-tinta">Códigos:</span> {p.comunica!.codigos} <span className="text-tinta">Pega:</span> {p.comunica!.pega} <span className="text-tinta">Evitar:</span> {p.comunica!.evitar}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function Bloque({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.12em] text-suave">{titulo}</p>
      <ul className="mt-1.5 grid gap-1.5">{items.map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="text-suave">—</span><span>{x}</span></li>)}</ul>
    </div>
  );
}
