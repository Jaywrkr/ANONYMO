import type { Tramo } from "@anonymo/pipeline";

const dia = 86400000;
const corta = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short" });

// Línea de tiempo del proyecto: una barra por fase, con la fecha de hoy marcada.
export function Calendario({ tramos }: { tramos: Tramo[] }) {
  if (!tramos.length) return null;
  const ini = new Date(tramos[0].inicio).getTime();
  const fin = Math.max(new Date(tramos.at(-1)!.fin).getTime(), ini + dia);
  const total = fin - ini;
  const pos = (iso: string) => ((new Date(iso).getTime() - ini) / total) * 100;
  const hoy = Math.min(100, Math.max(0, ((Date.now() - ini) / total) * 100));
  return (
    <figure className="m-0">
      <div className="relative grid gap-2">
        <span aria-hidden className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[#c3221c]" style={{ left: `calc(132px + (100% - 132px) * ${hoy / 100})` }} />
        {tramos.map((t) => {
          const izq = pos(t.inicio);
          const ancho = Math.max(2, pos(t.fin) - izq);
          return (
            <div key={t.fase} className="grid grid-cols-[132px_1fr] items-center gap-0">
              <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-gris whitespace-nowrap">{String(t.fase).padStart(2, "0")} {t.nombre}</span>
              <div className="relative h-8 rounded-full bg-papel">
                <div
                  className={`absolute inset-y-0 rounded-full ${t.estado === "hecha" ? "bg-tinta" : t.estado === "en-curso" ? "border border-tinta bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgba(18,18,20,.12)_6px_12px)]" : "border border-dashed border-gris/60"}`}
                  style={{ left: `${izq}%`, width: `${ancho}%` }}
                  title={`${t.nombre}: ${corta(t.inicio)} – ${corta(t.fin)}${t.real ? "" : " (estimado)"}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-[13px] text-gris">
        <span>{corta(tramos[0].inicio)} → {corta(tramos.at(-1)!.fin)} · línea roja: hoy</span>
        <span>Lleno: hecha · rayado: en curso · punteado: estimado</span>
      </figcaption>
      <table className="sr-only">
        <caption>Calendario por fase</caption>
        <tbody>{tramos.map((t) => <tr key={t.fase}><td>{t.nombre}</td><td>{t.inicio}</td><td>{t.fin}</td><td>{t.estado}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
