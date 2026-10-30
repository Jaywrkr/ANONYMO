import {urlBoceto} from "@/lib/sitio";
import "@fontsource/instrument-serif/latin-400.css";
import { notFound } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { contratoPorId, existe, leerProyecto } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { exigirEstudio } from "@/lib/estudio";
import { BotonImprimir } from "@/components/estudio/BotonImprimir";
import { FichaDireccion, FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Direcciones de diseño", robots: { index: false } };

const serif = "font-['Instrument_Serif',serif] font-normal";

// Las tres direcciones en papel apaisado (sistema/37): una por hoja, para mandarlas al cliente.
export default async function DireccionesImprimir({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const d = p.direcciones;
  if (!d?.opciones.length) notFound();
  const a = agentePorId(contratoPorId(d.tarea)?.agente ?? "orla");
  const hoy = new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  const dominio = `${p.pedido.cliente.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "")}.com`;
  return (
    <div className="hoja-fondo">
      <FuentesDirecciones ds={d.opciones} />
      <BotonImprimir volver={`/estudio/${id}/direcciones`} nombre={`Direcciones de diseño — ${p.pedido.cliente}`} />
      <div className="grid gap-8 print:block">
        <article className="hoja apaisada flex flex-col justify-between p-12">
          <div className="flex items-start justify-between text-[12px] text-[#5f5a52]">
            <p className={`${serif} text-[26px] uppercase leading-none text-[#1a1816]`}>Anonymo*</p>
            <p className="text-right">{p.pedido.cliente}<br />{hoy}</p>
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-[0.08em] text-[#8a8378]">Para {p.pedido.cliente}</p>
            <h1 className={`${serif} mt-3 text-[72px] leading-[0.95]`}>Tres caminos para tu web</h1>
            <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-[#5f5a52]">Son maquetas para elegir el rumbo, no el diseño final. Cada una propone una forma distinta de contar lo que haces. Elige la que más se parezca a lo que quieres; con esa diseñamos y construimos todo.</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {d.opciones.map((x, n) => (
              <div key={n}><p className="text-[12px] text-[#8a8378]">0{n + 1}</p><p className={`${serif} text-[28px] leading-none`}>{x.nombre}</p><p className="mt-1 text-[13px] text-[#5f5a52]">{x.idea}</p></div>
            ))}
          </div>
        </article>
        {d.opciones.map((x, n) => (
          <article key={n} className="hoja apaisada grid grid-cols-[1fr_2.1fr] gap-10 p-12">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.08em] text-[#8a8378]">Dirección 0{n + 1}</p>
                <h2 className={`${serif} mt-2 text-[54px] leading-[0.95]`}>{x.nombre}</h2>
                <p className="mt-4 text-[15px] leading-relaxed">{x.idea}</p>
                {x.tono && <p className="mt-3 text-[13px] text-[#5f5a52]">Tono: {x.tono}</p>}
              </div>
              <FichaDireccion d={x} />
            </div>
            <div className="self-center"><Maqueta recursos={urlBoceto(id,p.direcciones?.version??1)} d={x} dominio={dominio} /></div>
          </article>
        ))}
      </div>
      <p className="no-imprimir mt-6 text-center text-[12px] text-[#8a8378]">Propuestas por {a?.nombre} · Anonymo*</p>
    </div>
  );
}
