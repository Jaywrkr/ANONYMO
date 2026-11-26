// El informe mensual de la web en vivo (sistema/99): lo que se le manda al cliente cada mes, listo para copiar.
import Link from "next/link";
import { notFound } from "next/navigation";
import { existe, leerMiWeb, leerProyecto, leerVisitas, mesAnterior, mesDe, nombreDelMes, resumenVisitas, textoInforme } from "@anonymo/pipeline";
import { exigirEstudio, serif, titulo } from "@/lib/estudio";
import { traer } from "@/lib/nube";
import { InformeWeb } from "@/components/estudio/InformeWeb";
import { CopiarTexto } from "@/components/estudio/CopiarTexto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Informe de la web — Estudio", robots: { index: false } };

export default async function Informe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const vivo = leerMiWeb(id);
  if (!vivo) notFound();
  const p = leerProyecto(id);
  const actual = mesDe();
  const { mes: m } = await searchParams;
  const mes = m && /^\d{4}-\d{2}$/.test(m) && m <= actual ? m : actual;
  const [datos, antes] = await Promise.all([leerVisitas(id, mes), leerVisitas(id, mesAnterior(mes))]);
  const r = resumenVisitas(datos, Object.keys(antes.dias).length ? antes : undefined);
  const texto = textoInforme(p.pedido.cliente, mes, r);
  const siguiente = (() => { const [a, n] = mes.split("-").map(Number) as [number, number]; return n === 12 ? `${a + 1}-01` : `${a}-${String(n + 1).padStart(2, "0")}`; })();
  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <Link href={`/estudio/${id}/web#en-vivo`} className="inline-flex min-h-11 items-center text-[13px] text-medio hover:text-tinta">← La web de {p.pedido.cliente}</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className={`${titulo}`}>Informe de {nombreDelMes(mes)}</h1>
        <nav aria-label="Meses" className="flex gap-2">
          <Link href={`?mes=${mesAnterior(mes)}`} className="inline-flex min-h-11 items-center rounded-full bg-[#f1ede6] px-4 text-[13px]">← {nombreDelMes(mesAnterior(mes))}</Link>
          {mes < actual && <Link href={`?mes=${siguiente}`} className="inline-flex min-h-11 items-center rounded-full bg-[#f1ede6] px-4 text-[13px]">{nombreDelMes(siguiente)} →</Link>}
        </nav>
      </div>
      <div className="mt-6 max-w-4xl"><InformeWeb mes={mes} datos={datos} r={r} /></div>
      <section aria-label="Para mandar al cliente" className="mt-6 max-w-4xl rounded-[20px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-medium">Para mandarle al cliente</p>
          <CopiarTexto texto={texto} etiqueta="Copiar el informe" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] text-white" />
        </div>
        <pre data-texto-informe className="mt-3 whitespace-pre-wrap font-sans text-[14px] text-[#3d3a35]">{texto}</pre>
        <p className="mt-2 text-[12px] text-suave">Lo mandas tú por WhatsApp o correo. El cliente también lo ve en su «Mi web».</p>
      </section>
    </div>
  );
}
