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
        <span aria-hidden className="pointer-events-none absolute inset-y-0 z-10 w-px bg-urgente" style={{ left: `calc(96px + (100% - 96px) * ${hoy / 100})` }} />
        {tramos.map((t) => {
          const izq = pos(t.inicio);
          const ancho = Math.max(2, pos(t.fin) - izq);
          return (
            <div key={t.fase} className="grid grid-cols-[96px_1fr] items-center gap-0">
              <span className="truncate pr-2 text-[12px] text-medio">{t.nombre}</span>
              <div className="relative h-7 rounded-full bg-[#f4f1eb]">
                <div
                  className={`absolute inset-y-0 rounded-full ${t.estado === "hecha" ? "bg-tinta" : t.estado === "en-curso" ? "bg-[repeating-linear-gradient(45deg,#2bb673_0_6px,#5fcb93_6px_12px)]" : "border border-dashed border-[#cfc8bc]"}`}
                  style={{ left: `${izq}%`, width: `${ancho}%` }}
                  title={`${t.nombre}: ${corta(t.inicio)} – ${corta(t.fin)}${t.real ? "" : " (estimado)"}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 grid gap-1 text-[12px] text-suave">
        <span>{corta(tramos[0].inicio)} → {corta(tramos.at(-1)!.fin)} · la línea naranja es hoy</span>
        <span>Negro: hecha · verde: en curso · punteado: estimado</span>
      </figcaption>
      <table className="sr-only">
        <caption>Calendario por fase</caption>
        <tbody>{tramos.map((t) => <tr key={t.fase}><td>{t.nombre}</td><td>{t.inicio}</td><td>{t.fin}</td><td>{t.estado}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
