import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound } from "next/navigation";
import { FASES, agentePorId } from "@anonymo/agentes";
import { contratoPorId, esInterna, existe, leerEntrega, leerProyecto, nubeActiva, tokenValido, versionCliente, type TareaId, calendario } from "@anonymo/pipeline";
import { FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";
import { botonLleno, campo, portalActivo, serif } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { espacio } from "@/lib/espacio";
import { Calendario } from "@/components/estudio/Calendario";
import { Avance, Cara } from "@/components/estudio/piezas";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { traer } from "@/lib/nube";
import { TEXTOS_PORTAL } from "@/lib/textos-portal";
import { portalAprobar, portalComentar, portalElegirDireccion, portalResponder, portalSubir } from "./acciones";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Tu proyecto — Anonymo", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; m?: string; ver?: string }> };

// Lo que ve el cliente (sistema/32, mismo marco que el estudio): su proyecto, lo que dice cada agente y dónde aprobar o comentar. Nada interno.
export default async function Portal({ params, searchParams }: Props) {
  const { id } = await params;
  const { t, m, ver } = await searchParams;
  if (!/^[a-z0-9-]+$/.test(id)) notFound();
  if (portalActivo()) await traer(id);
  if (!portalActivo() || !existe(id) || !tokenValido(id, t)) notFound();
  const p = leerProyecto(id);
  const e = espacio(id, p.marca);
  const visibles = p.plan.tareas.filter((x) => !contratoPorId(x)?.interna) as TareaId[];
  const listas = visibles.filter((x) => p.tareas[x] === "lista").length;
  const abierta = ver ? (ver.replace("-", ".") as TareaId) : undefined;
  const entregaAbierta = abierta && visibles.includes(abierta) ? leerEntrega(id, abierta) : undefined;
  // Lo que el cliente puede aprobar: nunca una entrega interna ni mientras hay direcciones por elegir.
  const esperaCliente = p.estado === "esperando" && !p.esperaJurado && !p.direcciones?.esperando && !(p.revision && esInterna(p.revision.tarea));
  const dirs = p.estado === "esperando" && p.direcciones?.esperando ? p.direcciones : undefined;
  const fase = FASES.find((f) => f.n === p.faseActual);
  const tx = TEXTOS_PORTAL[p.pedido.idioma ?? "es"];
  const ocultos = <><input type="hidden" name="id" value={id} /><input type="hidden" name="t" value={t} /></>;
  const tramos = calendario(p);

  return (
    <div className="estudio-marco p-2" style={{ background: e.marco }} lang={p.pedido.idioma ?? "es"}>
      <main className="min-h-[calc(100dvh-16px)] rounded-[18px] bg-carta px-5 pb-16 pt-7 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_24px_60px_-24px_rgba(60,40,20,.25)] md:px-10 md:pt-9">
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-[22px] uppercase leading-none">Anonymo*</span>
          <span className="text-[13px] text-suave">{tx.tuProyecto}</span>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="min-w-0 flex-1">
            <h1 className={`${serif} text-[clamp(42px,6vw,84px)] leading-[0.95]`}>{p.pedido.cliente}</h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-medio">{p.pedido.descripcion}</p>
          </div>
          <div className="w-full max-w-[260px]">
            <p className="text-[13px] text-medio">{tx.listas(listas, visibles.length, fase?.nombre)}</p>
            <div className="mt-2"><Avance valor={listas / Math.max(1, visibles.length)} color={e.punto} vivo={p.estado === "en-curso"} /></div>
          </div>
        </div>

        {m && <p role="status" className="mt-6 max-w-xl rounded-2xl bg-tinta p-4 text-[15px] text-white">{m}</p>}

        {dirs && dirs.opciones.length > 0 && (
          <section aria-label={tx.dirTitulo} className="mt-8 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-8">
            <FuentesDirecciones ds={dirs.opciones} />
            <p className={`${serif} text-[clamp(30px,3.4vw,44px)] leading-[1.02]`}>{tx.dirTitulo}</p>
            <p className="mt-2 max-w-2xl text-[15px] text-medio">{dirs.cliente ? tx.dirElegiste(dirs.opciones[dirs.cliente.n]?.nombre ?? "") : tx.dirAyuda}</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {dirs.opciones.map((d, n) => (
                <form key={n} action={portalElegirDireccion} className={`grid content-start gap-3 rounded-[16px] p-3 ${dirs.cliente?.n === n ? "bg-[#e7f5ec] shadow-[0_0_0_2px_#2bb673]" : "bg-[#faf8f4]"}`}>
                  {ocultos}
                  <input type="hidden" name="n" value={n} />
                  <Maqueta d={d} dominio={`${id.split("-")[0]}.com`} />
                  <p className={`${serif} text-[26px] leading-none`}>{d.nombre}</p>
                  <p className="text-[14px] text-medio">{d.idea}</p>
                  {d.justificacion && <p className="text-[14px] text-medio">{d.justificacion}</p>}
                  <label className="sr-only" htmlFor={`nota-${n}`}>{tx.dirNota}</label>
                  <input id={`nota-${n}`} name="nota" maxLength={600} placeholder={tx.dirNota} className={campo} />
                  <div><button className={botonLleno}>{tx.dirBoton}</button></div>
                </form>
              ))}
            </div>
          </section>
        )}

        {esperaCliente && (
          <form action={portalAprobar} className="mt-8 max-w-2xl rounded-[20px] bg-tinta p-6 text-white md:p-8">
            {ocultos}
            <p className={`${serif} text-[clamp(30px,3.4vw,44px)] leading-[1.02]`}>{tx.terminamos(fase?.nombre)}</p>
            <p className="mt-2 text-[15px] text-white/75">{tx.revisa}</p>
            <div className="mt-5"><Enviar className="inline-flex min-h-12 items-center rounded-full bg-white px-7 text-[14px] font-medium text-tinta transition hover:bg-[#f1ede6] disabled:opacity-60" texto={tx.aprobar(fase?.nombre)} trabajando="…" /></div>
          </form>
        )}

        {p.plan.preguntas.length > 0 && (
          <form action={portalResponder} className="mt-8 grid max-w-2xl gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-8">
            {ocultos}
            <p className={`${serif} text-[clamp(28px,3vw,38px)] leading-[1.02]`}>{tx.antes}</p>
            <p className="text-[14px] text-medio">{tx.antesDetalle}</p>
            {p.plan.preguntas.map((q, i) => (
              <label key={q} className="grid gap-1.5">
                <span className="text-[15px]">{q}</span>
                <textarea name={`r${i}`} rows={2} maxLength={2000} className={campo} />
              </label>
            ))}
            <div><button className={botonLleno}>{tx.enviarResp}</button></div>
          </form>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
          <section aria-label="Entregas" className="grid content-start gap-6">
            {p.plan.fases.map((f) => {
              const tareas = visibles.filter((x) => x.startsWith(`${f}.`));
              if (!tareas.length) return null;
              return (
                <div key={f}>
                  <p className="text-[12px] text-suave">{FASES.find((x) => x.n === f)?.nombre}</p>
                  <ul className="mt-2 grid gap-1">
                    {tareas.map((x) => {
                      const en = leerEntrega(id, x);
                      const a = agentePorId(x.split(".")[1])!;
                      const lista = p.tareas[x] === "lista";
                      return (
                        <li key={x}>
                          {lista ? (
                            <a href={`/portal/${id}?t=${t}&ver=${x.replace(".", "-")}`} aria-current={abierta === x ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition ${abierta === x ? "bg-white shadow-[0_0_0_1px_var(--color-borde)]" : "hover:bg-white/70"}`}>
                              <Cara id={a.id} tam={28} titulo={false} />
                              <span className="min-w-0 leading-tight"><span className="block text-[14px] font-medium">{en?.titulo}</span><span className="block text-[12px] text-suave">{a.nombre}</span></span>
                            </a>
                          ) : (
                            <span className="flex min-h-12 items-center gap-3 px-2 py-1.5 text-suave">
                              <Cara id={a.id} tam={28} apagado titulo={false} />
                              <span className="text-[14px]">{contratoPorId(x)?.entrega} · {tx.enCamino}</span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {tramos.length > 0 && (
              <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
                <p className="mb-3 text-[12px] text-suave">{tx.fechas}</p>
                <Calendario tramos={tramos} />
              </div>
            )}

            <form action={portalComentar} className="grid gap-2 rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              {ocultos}
              <label className="grid gap-2">
                <span className={`${serif} text-[24px] leading-tight`}>{tx.comentario}</span>
                <textarea name="texto" rows={4} required maxLength={2000} placeholder={tx.comentarioEj} className={campo} />
              </label>
              <div><button className={botonLleno}>{tx.enviarCom}</button></div>
            </form>
            <form action={portalSubir} className="grid gap-3 rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              {ocultos}
              <span className={`${serif} text-[24px] leading-tight`}>{tx.archivos}</span>
              <ZonaArchivos nube={nubeActiva()} proyecto={id} t={t} texto={tx.archivos} en={p.pedido.idioma === "en"} />
              <div><button className={botonLleno}>{tx.enviarArch}</button></div>
            </form>
          </section>

          <article aria-live="polite" className="min-w-0">
            {entregaAbierta ? (
              <div className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.05)] md:p-9">
                <div className="flex items-center gap-4">
                  <Cara id={entregaAbierta.agente} tam={64} flota />
                  <div>
                    <p className="text-[13px] text-suave">{agentePorId(entregaAbierta.agente)?.nombre} · {agentePorId(entregaAbierta.agente)?.rol}</p>
                    <h2 className={`${serif} text-[clamp(30px,3.4vw,46px)] leading-[1]`}>{entregaAbierta.titulo}</h2>
                  </div>
                </div>
                {entregaAbierta.dice && <p className={`${serif} mt-5 text-[22px] leading-[1.2] text-medio`}>“{entregaAbierta.dice}”</p>}
                <div className="entrega mt-6" dangerouslySetInnerHTML={{ __html: html(versionCliente(entregaAbierta.contenido)) }} />
              </div>
            ) : (
              <div className="grid min-h-[280px] place-items-center rounded-[20px] border border-dashed border-borde p-8 text-center">
                <div>
                  <Cara id="atlas" tam={60} flota className="mx-auto" />
                  <p className={`${serif} mt-4 text-[26px] text-medio`}>{tx.elige}</p>
                </div>
              </div>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
