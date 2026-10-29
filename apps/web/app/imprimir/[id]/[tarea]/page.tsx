import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound } from "next/navigation";
import { agentePorId, FASES } from "@anonymo/agentes";
import { existe, leerEntrega, leerProyecto, type TareaId } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { exigirEstudio } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { BotonImprimir } from "@/components/estudio/BotonImprimir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrega", robots: { index: false } };

const serif = "font-['Instrument_Serif',serif] font-normal";

// Una entrega en papel (sistema/35): para mandarla al cliente o guardarla, con la marca de Anonymo y el color del cliente.
export default async function EntregaImprimir({ params, searchParams }: { params: Promise<{ id: string; tarea: string }>; searchParams: Promise<{ v?: string }> }) {
  await exigirEstudio();
  const { id, tarea } = await params;
  const { v } = await searchParams;
  if (!/^[a-z0-9_-]+$/.test(id) || !/^\d-[a-z]+$/.test(tarea)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const t = tarea.replace("-", ".") as TareaId;
  const p = leerProyecto(id);
  const e = (v ? leerEntrega(id, t, Number(v)) : undefined) ?? leerEntrega(id, t);
  if (!e) notFound();
  const a = agentePorId(e.agente);
  const fase = FASES.find((f) => f.n === Number(t.split(".")[0]));
  const acento = espacio(id, p.marca).punto;
  // Sin la línea de cierre que el agente usa para hablar con el equipo.
  const contenido = e.contenido.replace(/\n+> ⚠️[\s\S]*$/, "");
  const fecha = new Date(e.creado).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="hoja-fondo" style={{ ["--acento" as string]: acento }}>
      <BotonImprimir volver={`/estudio/${id}/${tarea}`} md={`# ${e.titulo}\n\n${contenido}`} nombre={`${p.pedido.cliente} — ${e.titulo}`} />
      <article className="hoja px-12 py-12 md:px-16 md:py-14">
        <header className="border-b-[1.5px] border-[#1a1816] pb-6">
          <div className="flex items-start justify-between gap-6 text-[12px] text-[#5f5a52]">
            <p className={`${serif} text-[22px] uppercase leading-none tracking-[0.01em] text-[#1a1816]`}>Anonymo*</p>
            <p className="text-right">{p.pedido.cliente}<br />{fecha}</p>
          </div>
          <p className="mt-10 text-[12px] tracking-[0.08em] uppercase" style={{ color: acento === "#1a1816" ? "#8a8378" : acento }}>
            Fase {fase?.n} · {fase?.nombre}{e.version > 1 ? ` · versión ${e.version}` : ""}
          </p>
          <h1 className={`${serif} mt-2 text-[clamp(40px,6vw,64px)] leading-[0.95]`}>{e.titulo}</h1>
          {e.dice && <p className={`${serif} mt-4 max-w-[48ch] text-[21px] leading-snug text-[#5f5a52]`}>“{e.dice}”</p>}
          <p className="mt-4 text-[12px] text-[#8a8378]">Preparado por {a?.nombre}, {a?.rol?.toLowerCase()}, con la dirección de Jay y Luna.</p>
        </header>
        <div className="md mt-8" dangerouslySetInnerHTML={{ __html: html(contenido) }} />
        {e.datos?.cortada ? <p className="no-imprimir mt-8 rounded-xl bg-[#fff4e8] p-4 text-[13px] text-[#8a3a0c]">Esta entrega quedó cortada. Pide que la complete desde el proyecto antes de mandarla.</p> : null}
        <footer className="mt-12 flex items-end justify-between border-t border-[#e6e0d6] pt-4 text-[11px] text-[#8a8378]">
          <span>anonymo · estudio creativo · Quito</span>
          <span>{p.pedido.cliente} · {e.titulo}</span>
        </footer>
      </article>
    </div>
  );
}
