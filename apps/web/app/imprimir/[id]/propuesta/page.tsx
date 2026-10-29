import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound } from "next/navigation";
import { existe, leerProyecto } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio, luz } from "@/lib/espacio";
import { exigirEstudio } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { dinero, propuestaDe } from "@/lib/propuesta";
import { BotonImprimir } from "@/components/estudio/BotonImprimir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuesta", robots: { index: false } };

const serif = "font-['Instrument_Serif',serif] font-normal";

// La propuesta en papel (sistema/35): portada, brief, inversión y condiciones. Se guarda como PDF desde el navegador.
export default async function PropuestaImprimir({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const { propuesta: x } = propuestaDe(p);
  const acento = espacio(id, p.marca).punto;
  const tintaAcento = luz(acento) > 0.6 ? "#1a1816" : "#ffffff";
  const total = x.items.reduce((s, i) => s + i.precio, 0);
  const hoy = new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  const bloque = (n: string, titulo: string, md: string) =>
    md.trim() ? (
      <section className="no-cortar grid gap-6 border-t border-[#e6e0d6] py-9 md:grid-cols-[180px_1fr]">
        <p className="text-[12px] tracking-[0.08em] text-[#8a8378] uppercase"><span className="mr-2 tabular-nums" style={{ color: acento }}>{n}</span>{titulo}</p>
        <div className="md" dangerouslySetInnerHTML={{ __html: html(md) }} />
      </section>
    ) : null;

  return (
    <div className="hoja-fondo" style={{ ["--acento" as string]: acento }}>
      <BotonImprimir volver={`/estudio/${id}/propuesta`} nombre={`Propuesta Anonymo — ${p.pedido.cliente}`} />
      <article className="hoja">
        {/* Portada */}
        <header className="portada relative flex flex-col justify-between overflow-hidden p-12 md:p-16" style={{ background: acento, color: tintaAcento }}>
          <div className="flex items-start justify-between">
            <p className={`${serif} text-[30px] uppercase leading-none tracking-[0.01em]`}>Anonymo*</p>
            <p className="text-right text-[12px] opacity-70">Propuesta<br />{hoy}</p>
          </div>
          <div>
            <p className="text-[13px] tracking-[0.08em] uppercase opacity-70">Para {p.pedido.cliente}</p>
            <h1 className={`${serif} mt-4 max-w-[14ch] text-[clamp(56px,9vw,104px)] leading-[0.92]`}>{x.titulo}</h1>
            {x.intro && <p className="mt-8 max-w-[46ch] text-[17px] leading-relaxed opacity-85">{x.intro}</p>}
          </div>
          <div className="flex items-end justify-between text-[12px] opacity-70">
            <p>Jay y Luna · Cuenca</p>
            <p>Inversión total <span className={`${serif} ml-2 text-[28px] opacity-100`}>{dinero(total)}</span></p>
          </div>
        </header>

        <div className="salto px-12 pb-14 pt-10 md:px-16">
          {bloque("01", "Quiénes somos", x.quienes)}
          {bloque("02", "Lo que entendimos", x.entendimos)}
          {bloque("03", "Lo que haremos", x.haremos)}
          {bloque("04", "Lo que recibes", x.entregables)}
          {bloque("05", "Tiempos", x.tiempos.split("\n").map((l) => (l.trim() && !l.trim().startsWith("-") ? `- ${l.trim()}` : l)).join("\n"))}

          {/* Inversión */}
          <section className="no-cortar border-t border-[#e6e0d6] py-9">
            <p className="text-[12px] tracking-[0.08em] text-[#8a8378] uppercase"><span className="mr-2" style={{ color: acento }}>06</span>Inversión</p>
            <table className="mt-6 w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b-[1.5px] border-[#1a1816] text-left text-[12px] text-[#5f5a52]"><th className="py-2 font-medium">Concepto</th><th className="py-2 font-medium">Incluye</th><th className="py-2 text-right font-medium">Valor</th></tr>
              </thead>
              <tbody>
                {x.items.map((i, n) => (
                  <tr key={n} className="border-b border-[#e6e0d6] align-top">
                    <td className="py-3 pr-4 font-medium">{i.concepto}</td>
                    <td className="py-3 pr-4 text-[#5f5a52]">{i.detalle}</td>
                    <td className="py-3 text-right tabular-nums">{dinero(i.precio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2} className="pt-5 text-[13px] text-[#5f5a52]">Total (no incluye impuestos)</td><td className={`${serif} pt-4 text-right text-[40px] leading-none tabular-nums`}>{dinero(total)}</td></tr>
              </tfoot>
            </table>
          </section>

          {bloque("07", "Condiciones", x.condiciones.split("\n").map((l) => (l.trim() && !l.trim().startsWith("-") ? `- ${l.trim()}` : l)).join("\n"))}

          <section className="no-cortar mt-4 grid gap-10 border-t border-[#e6e0d6] pt-10 sm:grid-cols-2">
            <div><p className="text-[13px] text-[#5f5a52]">{x.validez}</p><p className="mt-4 text-[13px]">¿Seguimos? Responde a este documento y empezamos.</p><p className={`${serif} mt-6 text-[22px]`} style={{ color: acento === "#1a1816" ? "#8a8378" : acento }}>Trabajamos mientras duermes.</p></div>
            <div className="grid grid-cols-2 gap-6 text-[12px] text-[#5f5a52]">
              <p className="border-t border-[#1a1816] pt-2">Anonymo*</p>
              <p className="border-t border-[#1a1816] pt-2">{p.pedido.cliente}</p>
            </div>
          </section>

        </div>
      </article>
    </div>
  );
}
