import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { resumenAnalitica } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { exigirEstudio, serif } from "@/lib/estudio";
import { Cara } from "@/components/estudio/piezas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas — Estudio", robots: { index: false } };

// El tablero de Pulso: lo que pasa en la web pública, sin cookies (web/19).
export default async function Analitica({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await exigirEstudio();
  await traer("_analitica");
  const pedido = Number((await searchParams).dias);
  const dias = [7, 30, 90].includes(pedido) ? pedido : 30;
  const r = resumenAnalitica(dias);
  const cifra = (n: string | number, t: string) => (
    <div className="rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
      <p className="text-[12px] text-suave">{t}</p>
      <p className={`${serif} mt-1 text-[48px] leading-none`}>{n}</p>
    </div>
  );
  const lista = (t: string, l: [string, number][], fila?: (k: string) => React.ReactNode) => {
    const max = Math.max(1, ...l.map(([, n]) => n));
    return (
      <div className="tarjeta p-5">
        <p className="text-[12px] text-suave">{t}</p>
        <ul className="mt-3 grid gap-2.5 text-[14px]">
          {l.length ? l.map(([k, n]) => (
            <li key={k}>
              <span className="flex items-center justify-between gap-4"><span className="flex min-w-0 items-center gap-2 truncate">{fila ? fila(k) : k}</span><span className="text-medio">{n}</span></span>
              <span className="mt-1 block h-[3px] rounded-full bg-borde"><i className="block h-full rounded-full bg-tinta" style={{ width: `${(n / max) * 100}%` }} /></span>
            </li>
          )) : <li className="text-suave">Sin datos todavía.</li>}
        </ul>
      </div>
    );
  };
  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Cara id="pulso" tam={52} flota />
          <div>
            <p className="text-[13px] text-suave">Métricas de la web · las cuida Pulso</p>
            <h1 className={`${serif} text-[clamp(36px,4.4vw,56px)] leading-[1]`}>Lo que pasa en la web.</h1>
          </div>
        </div>
        <nav aria-label="Período" className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`?dias=${d}`} aria-current={d === dias ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] transition ${d === dias ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>{d} días</Link>
          ))}
        </nav>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cifra(r.vistas, "Visitas")}
        {cifra(`${r.salaSegundos} s`, "Tiempo promedio en la sala")}
        {cifra(r.formularios, "Pedidos desde el formulario")}
        {cifra(`${r.celular}% · ${r.ingles}%`, "Desde celular · en inglés")}
      </div>
      <div className="mamposteria mt-4">
        {lista("Páginas más vistas", r.paginas)}
        {lista("De dónde vienen", r.origenes)}
        {lista("Agentes más vistos en la sala", r.agentes, (k) => <><Cara id={k} tam={20} titulo={false} />{agentePorId(k)?.nombre ?? k}</>)}
      </div>
      <p className="mt-2 max-w-xl text-[13px] text-suave">Sin cookies ni IP: solo página, evento, idioma, tipo de equipo y el dominio de origen. Respeta «No rastrear».</p>
    </div>
  );
}
