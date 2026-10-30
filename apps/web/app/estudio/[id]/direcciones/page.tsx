import {urlBoceto} from "@/lib/sitio";
import Link from "next/link";
import {ControlCalidad} from "@/components/estudio/ControlCalidad";
import { notFound } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { contratoPorId, leerEntrega, existe, leerProyecto, responsable } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { boton, campo, exigirEstudio, serif } from "@/lib/estudio";
import { FichaDireccion, FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";
import { Cara, hace } from "@/components/estudio/piezas";
import { Enviar } from "../../nuevo/Enviar";
import { accionElegirDireccion, accionPedirDirecciones } from "../../acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Direcciones de diseño — Estudio", robots: { index: false } };

// Tres direcciones de diseño, lado a lado (sistema/37): se elige una y recién ahí se diseña y construye la web.
export default async function Direcciones({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ver?: string }> }) {
  const yo = await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const { ver } = await searchParams;
  const d = p.direcciones;
  const tarea = d?.tarea ?? p.plan.tareas.find((t) => contratoPorId(t)?.direcciones);
  const agente = agentePorId(contratoPorId(tarea ?? "4.orla")?.agente ?? "orla")!;
  const esperando = p.estado === "esperando" && !!d?.esperando;
  const mio = tarea ? responsable(p, Number(tarea.split(".")[0])) === yo : true;
  const puedePedir = !!tarea && p.estado !== "en-curso" && p.estado !== "plan";
  const grande = ver !== undefined && d?.opciones[Number(ver)] ? Number(ver) : undefined;
  const dominio = `${p.pedido.cliente.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "")}.com`;
  const comunes = <><input type="hidden" name="id" value={id} /><input type="hidden" name="motor" value="" /></>;

  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      {tarea && leerEntrega(id,tarea,d?.version) && <ControlCalidad p={p} e={leerEntrega(id,tarea,d?.version)!}/>}
      {d && <FuentesDirecciones ds={d.opciones} />}
      <Link href={`/estudio/${id}`} className="inline-flex min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
        <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: espacio(id, p.marca).punto }} /> ← {p.pedido.cliente}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <Cara id={agente.id} tam={56} flota />
          <div>
            <p className="text-[13px] text-suave">{agente.nombre} · {esperando ? (mio ? "te toca elegir" : "esperan que elijan") : d?.elegida !== undefined ? `elegida ${d.fecha ? hace(d.fecha) : ""}` : "antes de diseñar la web"}</p>
            <h1 className={`${serif} mt-1 text-[clamp(34px,4.2vw,54px)] leading-[1]`}>Tres direcciones de diseño</h1>
          </div>
        </div>
        {d && d.opciones.length > 0 && (
          <a href={`/imprimir/${id}/direcciones`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white transition hover:bg-black">Descargar PDF para el cliente ↗</a>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-[15px] text-medio">
        {esperando
          ? "Son maquetas para decidir el rumbo, no el diseño final. Elige una (con una nota si quieres) y el equipo diseña y construye la web con esa dirección."
          : d?.elegida !== undefined
            ? `La dirección «${d.opciones[d.elegida]?.nombre}» es la que sigue todo el equipo.`
            : "Antes de construir, el diseñador propone tres caminos distintos para elegir uno."}
        {d?.cliente && <span className="mt-2 block font-medium text-tinta">El cliente prefiere «{d.opciones[d.cliente.n]?.nombre}»{d.cliente.nota ? `: «${d.cliente.nota}»` : ""}.</span>}
      </p>

      {!d?.opciones.length ? (
        <div className="mt-8 rounded-[20px] border border-dashed border-borde p-8 text-center">
          <p className={`${serif} text-[28px]`}>{d?.esperando ? `${agente.nombre} no entregó las maquetas en el formato.` : "Todavía no hay direcciones."}</p>
          <p className="mt-1 text-[14px] text-medio">{p.estado === "en-curso" ? "El equipo está trabajando: llegan cuando le toque." : "Pídeselas y llegan en unos minutos."}</p>
        </div>
      ) : (
        <>
          {grande !== undefined && (
            <section className="mt-8">
              <div className="flex items-center justify-between gap-3"><p className={`${serif} text-[28px]`}>{d.opciones[grande].nombre}</p><Link href={`/estudio/${id}/direcciones`} scroll={false} className="text-[13px] text-medio underline underline-offset-4">Ver las tres</Link></div>
              <div className="mt-3"><Maqueta recursos={urlBoceto(id,p.direcciones?.version??1)} d={d.opciones[grande]} dominio={dominio} /></div>
            </section>
          )}
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
            {d.opciones.map((x, n) => {
              const elegida = d.elegida === n;
              return (
                <article key={n} className={`grid gap-4 rounded-[20px] p-4 ${elegida ? "bg-[#e7f5ec] shadow-[0_0_0_2px_#2bb673]" : d.cliente?.n === n ? "bg-white shadow-[0_0_0_2px_#ff5a1f]" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06)]"}`}>
                  <Link href={`/estudio/${id}/direcciones?ver=${n}`} scroll={false} className="block transition hover:-translate-y-0.5" aria-label={`Ver «${x.nombre}» en grande`}><Maqueta recursos={urlBoceto(id,p.direcciones?.version??1)} d={x} dominio={dominio} /></Link>
                  <div>
                    <p className="flex items-center gap-2 text-[12px] text-suave">Dirección {n + 1} · {x.estilo}{elegida && <span className="rounded-full bg-vivo px-2 py-0.5 text-white">elegida</span>}{d.cliente?.n === n && <span className="rounded-full bg-urgente px-2 py-0.5 text-white">le gusta al cliente</span>}</p>
                    <p className={`${serif} mt-1 text-[30px] leading-none`}>{x.nombre}</p>
                    <p className="mt-2 text-[14px] leading-snug">{x.idea}</p>
                    {x.tono && <p className="mt-1 text-[13px] text-medio">Tono: {x.tono}</p>}
                  </div>
                  <FichaDireccion d={x} />
                  {esperando && (
                    <form action={accionElegirDireccion} className="grid gap-2 border-t border-borde pt-4">
                      {comunes}
                      <input type="hidden" name="n" value={n} />
                      <label className="sr-only" htmlFor={`nota-${n}`}>Nota para el equipo</label>
                      <input id={`nota-${n}`} name="nota" placeholder="Nota (opcional): «con más blanco», «otra tipografía»…" className={campo} />
                      <div><Enviar className="inline-flex min-h-11 items-center rounded-full bg-tinta px-6 text-[14px] font-medium text-white" texto={`Elegir «${x.nombre}»`} trabajando="Eligiendo…" proyecto={id} /></div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {puedePedir && (
        <details className="group mt-8 max-w-2xl rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]" open={!d?.opciones.length}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-[15px] font-medium">{d?.opciones.length ? "Ninguna convence: pedir otras 3" : `Pedir 3 direcciones a ${agente.nombre}`}<span className="ml-auto text-suave transition group-open:rotate-45">+</span></summary>
          <form action={accionPedirDirecciones} className="mt-3 grid gap-2">
            {comunes}
            <textarea name="nota" rows={2} placeholder="Qué buscar o qué evitar (opcional): «más luminosas», «nada de azul»…" className={campo} />
            <p className="text-[12px] text-suave">{d?.elegida !== undefined || p.tareas[tarea!] === "lista" ? "Al elegir la nueva dirección, el diseño y lo que dependía de él se rehacen con ella." : "Llegan en unos minutos; te avisamos."}</p>
            <div><Enviar className={boton} texto="Pedir direcciones" trabajando="Pidiendo…" proyecto={id} /></div>
          </form>
        </details>
      )}
    </div>
  );
}
