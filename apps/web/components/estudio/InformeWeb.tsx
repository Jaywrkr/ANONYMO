// El informe del mes de una web en vivo (sistema/99): lo ven el estudio y el cliente, con las mismas palabras.
import { NOMBRE_ORIGEN, nombreDelMes, type MesVisitas, type ResumenVisitas } from "@anonymo/pipeline";

const pct = (ahora: number, antes?: number) => (antes ? Math.round(((ahora - antes) / antes) * 100) : undefined);

function Cifra({ titulo, n, antes, ayuda }: { titulo: string; n: number; antes?: number; ayuda?: string }) {
  const c = pct(n, antes);
  return (
    <div className="rounded-2xl bg-[#faf8f4] p-4" data-cifra={titulo}>
      <p className="text-[13px] text-medio">{titulo}</p>
      <p className="mt-1 font-serif text-[34px] leading-none">{n}</p>
      <p className="mt-1.5 text-[12px] text-suave">{c === undefined ? ayuda ?? " " : `${c >= 0 ? "+" : ""}${c} % que el mes anterior`}</p>
    </div>
  );
}

export function InformeWeb({ mes, datos, r }: { mes: string; datos: MesVisitas; r: ResumenVisitas }) {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const serie = Array.from({ length: dias }, (_, i) => { const d = `${mes}-${String(i + 1).padStart(2, "0")}`; return { d, n: datos.dias[d]?.visita ?? 0, c: (datos.dias[d]?.whatsapp ?? 0) + (datos.dias[d]?.llamada ?? 0) }; });
  const max = Math.max(1, ...serie.map((x) => x.n));
  return (
    <div className="grid gap-4" data-informe-web>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra titulo="Visitas" n={r.visita} antes={r.antes?.visita} />
        <Cifra titulo="Escribieron por WhatsApp" n={r.whatsapp} antes={r.antes?.whatsapp} />
        <Cifra titulo="Llamaron" n={r.llamada} antes={r.antes?.llamada} />
        <Cifra titulo="De cada 100 visitas, contactaron" n={r.conversion} ayuda="WhatsApp y llamadas" />
      </div>
      <figure className="rounded-2xl bg-[#faf8f4] p-4">
        <figcaption className="text-[13px] text-medio">Visitas por día en {nombreDelMes(mes)}</figcaption>
        <div className="mt-3 flex h-28 items-end gap-[2px]" role="img" aria-label={`Visitas por día: ${serie.filter((x) => x.n).map((x) => `día ${Number(x.d.slice(8))}, ${x.n}`).join("; ") || "ninguna todavía"}`}>
          {serie.map((x) => (
            <span key={x.d} title={`${Number(x.d.slice(8))}: ${x.n} visitas${x.c ? `, ${x.c} contactos` : ""}`} className="relative flex-1 rounded-t-[2px] bg-tinta/80" style={{ height: `${Math.max(x.n ? 4 : 1, (x.n / max) * 100)}%`, opacity: x.n ? 1 : 0.15 }}>
              {x.c > 0 && <span className="absolute inset-x-0 -top-1.5 mx-auto h-1.5 w-1.5 rounded-full bg-[#17714a]" />}
            </span>
          ))}
        </div>
        <p className="mt-2 flex justify-between text-[11px] text-suave"><span>1</span><span>{dias}</span></p>
        <p className="mt-1 text-[12px] text-suave">Los puntos verdes son días con mensajes o llamadas.</p>
      </figure>
      {r.origen.length > 0 && (
        <div className="rounded-2xl bg-[#faf8f4] p-4">
          <p className="text-[13px] text-medio">De dónde llegaron</p>
          <ul className="mt-2 grid gap-1.5 text-[14px]">
            {r.origen.map(([o, n]) => (
              <li key={o} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="min-w-0"><span className="block truncate">{NOMBRE_ORIGEN[o]}</span><span aria-hidden className="mt-1 block h-1 rounded-full bg-[#eee9e0]"><span className="block h-full rounded-full bg-tinta" style={{ width: `${Math.round((n / Math.max(1, r.visita)) * 100)}%` }} /></span></span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!r.visita && <p className="text-[13.5px] text-medio">Todavía no hay visitas este mes. Se cuentan desde que la web está en vivo, sin cookies ni datos de las personas.</p>}
    </div>
  );
}
