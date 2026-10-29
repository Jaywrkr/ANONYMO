import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound } from "next/navigation";
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId, existe, leerEntrega, leerProyecto, versionCliente, type TareaId } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio, luz } from "@/lib/espacio";
import { exigirEstudio } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { BotonImprimir } from "@/components/estudio/BotonImprimir";
import { FichaDireccion, FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dossier", robots: { index: false } };

const serif = "font-['Instrument_Serif',serif] font-normal";

// El dossier del proyecto (sistema/37): todo lo que puede ver el cliente, en un solo PDF con su marca.
// Nada interno: ni horas, ni investigación, ni jurado, ni código, ni secciones «para el equipo».
export default async function Dossier({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const tareas = p.plan.tareas.filter((t) => p.tareas[t] === "lista" && !contratoPorId(t)?.interna) as TareaId[];
  const entregas = tareas.map((t) => ({ t, e: leerEntrega(id, t)! })).filter((x) => x.e);
  const acento = espacio(id, p.marca).punto;
  const tinta = luz(acento) > 0.6 ? "#1a1816" : "#ffffff";
  const dir = p.direcciones?.elegida !== undefined ? p.direcciones.opciones[p.direcciones.elegida] : undefined;
  const hoy = new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  const dominio = `${p.pedido.cliente.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "")}.com`;

  return (
    <div className="hoja-fondo" style={{ ["--acento" as string]: acento }}>
      {dir && <FuentesDirecciones ds={[dir]} />}
      <BotonImprimir volver={`/estudio/${id}?ver=entregas`} nombre={`Dossier — ${p.pedido.cliente}`} />
      <article className="hoja">
        <header className="portada relative flex flex-col justify-between p-12 md:p-16" style={{ background: acento, color: tinta }}>
          <div className="flex items-start justify-between">
            <p className={`${serif} text-[30px] uppercase leading-none`}>Anonymo*</p>
            <p className="text-right text-[12px] opacity-70">Dossier del proyecto<br />{hoy}</p>
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-[0.08em] opacity-70">Para {p.pedido.cliente}</p>
            <h1 className={`${serif} mt-4 text-[clamp(56px,9vw,104px)] leading-[0.92]`}>Todo lo que hicimos</h1>
            <ol className="mt-10 grid gap-1.5 text-[15px] opacity-90">
              {dir && <li>— Dirección de diseño: {dir.nombre}</li>}
              {entregas.map(({ t, e }) => <li key={t}>— {e.titulo} <span className="opacity-60">· {agentePorId(e.agente)?.nombre}</span></li>)}
            </ol>
          </div>
          <p className="text-[12px] opacity-70">Jay y Luna · Cuenca</p>
        </header>

        {dir && (
          <section className="salto px-12 pb-12 pt-10 md:px-16">
            <p className="text-[12px] uppercase tracking-[0.08em] text-[#8a8378]">Dirección de diseño</p>
            <h2 className={`${serif} mt-2 text-[48px] leading-[0.95]`}>{dir.nombre}</h2>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed">{dir.idea}</p>
            <div className="mt-6"><Maqueta d={dir} dominio={dominio} /></div>
            <div className="mt-5"><FichaDireccion d={dir} /></div>
          </section>
        )}

        {entregas.map(({ t, e }) => {
          const fase = FASES.find((f) => f.n === Number(t.split(".")[0]));
          return (
            <section key={t} className="salto px-12 pb-12 pt-10 md:px-16">
              <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: acento === "#1a1816" ? "#8a8378" : acento }}>Fase {fase?.n} · {fase?.nombre}</p>
              <h2 className={`${serif} mt-2 text-[48px] leading-[0.95]`}>{e.titulo}</h2>
              <p className="mt-2 text-[12px] text-[#8a8378]">Preparado por {agentePorId(e.agente)?.nombre}, {agentePorId(e.agente)?.rol?.toLowerCase()}.</p>
              <div className="md mt-6" dangerouslySetInnerHTML={{ __html: html(versionCliente(e.contenido)) }} />
            </section>
          );
        })}
        {!entregas.length && <p className="p-16 text-[15px] text-[#5f5a52]">Todavía no hay entregas listas para el cliente.</p>}
      </article>
    </div>
  );
}
