import { notFound } from "next/navigation";
import { FASES, agentePorId } from "@anonymo/agentes";
import { contratoPorId, existe, leerEntrega, leerProyecto, tokenValido, type TareaId } from "@anonymo/pipeline";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { botonLleno, campo, etiqueta, lateral, portalActivo } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { portalAprobar, portalComentar, portalResponder, portalSubir } from "./acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu proyecto — Anonymo", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; m?: string; ver?: string }> };

// Lo que ve el cliente: su proyecto, lo que dice cada agente y dónde aprobar o comentar. Nada interno.
export default async function Portal({ params, searchParams }: Props) {
  const { id } = await params;
  const { t, m, ver } = await searchParams;
  if (!portalActivo() || !existe(id) || !tokenValido(id, t)) notFound();
  const p = leerProyecto(id);
  const visibles = p.plan.tareas.filter((x) => !contratoPorId(x)?.interna) as TareaId[];
  const listas = visibles.filter((x) => p.tareas[x] === "lista").length;
  const abierta = ver ? (ver.replace("-", ".") as TareaId) : undefined;
  const entregaAbierta = abierta && visibles.includes(abierta) ? leerEntrega(id, abierta) : undefined;
  const esperaCliente = p.estado === "esperando" && !p.esperaJurado;
  const fase = FASES.find((f) => f.n === p.faseActual);
  const ocultos = <><input type="hidden" name="id" value={id} /><input type="hidden" name="t" value={t} /></>;

  return (
    <main className={`${lateral} pb-16`}>
      <p className={`${etiqueta} pt-4`}>Tu proyecto con Jay y Luna</p>
      <h1 className="display mt-2 text-[clamp(56px,9vw,144px)]">{p.pedido.cliente}</h1>
      <p className="mt-2 max-w-2xl text-xl font-light">{p.pedido.descripcion}</p>
      <div className="mt-6 h-1 w-full max-w-xl overflow-hidden rounded-full bg-linea">
        <div className="h-full bg-tinta" style={{ width: `${(listas / Math.max(1, visibles.length)) * 100}%` }} />
      </div>
      <p className={`${etiqueta} mt-2`}>{listas} de {visibles.length} entregas listas · fase {fase?.nombre}</p>

      {m && <p role="status" className="mt-6 max-w-xl rounded-2xl bg-papel p-4">{m}</p>}

      {esperaCliente && (
        <form action={portalAprobar} className="mt-8 max-w-xl rounded-3xl bg-papel p-6">
          {ocultos}
          <p className="display text-5xl">Terminamos {fase?.nombre}</p>
          <p className="mt-2 text-[17px]">Revisa lo que entregó el equipo. Si está bien, apruébala y seguimos. Si algo no te convence, déjanos un comentario abajo.</p>
          <button className={`${botonLleno} mt-4`}>Aprobar {fase?.nombre}</button>
        </form>
      )}

      {p.plan.preguntas.length > 0 && (
        <form action={portalResponder} className="mt-8 grid max-w-2xl gap-4 rounded-3xl border border-tinta p-6">
          {ocultos}
          <p className="display text-5xl">Antes de seguir, cuéntanos</p>
          <p className="text-[15px] text-gris">Responde lo que sepas. Lo que dejes en blanco te lo preguntamos después.</p>
          {p.plan.preguntas.map((q, i) => (
            <label key={q} className="grid gap-1">
              <span className="text-[17px]">{q}</span>
              <textarea name={`r${i}`} rows={2} maxLength={2000} className={campo} />
            </label>
          ))}
          <button className={botonLleno}>Enviar respuestas</button>
        </form>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section aria-label="Entregas">
          {p.plan.fases.map((f) => {
            const tareas = visibles.filter((x) => x.startsWith(`${f}.`));
            if (!tareas.length) return null;
            return (
              <div key={f} className="border-t border-tinta py-4">
                <p className={etiqueta}>{String(f).padStart(2, "0")} · {FASES.find((x) => x.n === f)?.nombre}</p>
                <ul className="mt-2 grid gap-1">
                  {tareas.map((x) => {
                    const e = leerEntrega(id, x);
                    const a = agentePorId(x.split(".")[1])!;
                    const lista = p.tareas[x] === "lista";
                    return (
                      <li key={x}>
                        {lista ? (
                          <a href={`/portal/${id}?t=${t}&ver=${x.replace(".", "-")}`} aria-current={abierta === x ? "page" : undefined} className={`block rounded-2xl px-3 py-2 ${abierta === x ? "bg-papel" : "hover:bg-papel"}`}>
                            <span className="font-medium">{a.nombre}</span> · {e?.titulo}
                          </a>
                        ) : (
                          <span className="block px-3 py-2 text-gris">{a.nombre} · {contratoPorId(x)?.entrega} (en camino)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <form action={portalComentar} className="mt-6 grid gap-2 border-t border-tinta pt-4">
            {ocultos}
            <label className="grid gap-1">
              <span className={etiqueta}>Tu comentario</span>
              <textarea name="texto" rows={4} required maxLength={2000} placeholder="Ej.: me gusta, pero la quiero más elegante" className={campo} />
            </label>
            <button className={botonLleno}>Enviar comentario</button>
          </form>
          <form action={portalSubir} className="mt-6 grid gap-2 border-t border-linea pt-4">
            {ocultos}
            <label className="grid gap-1">
              <span className={etiqueta}>Fotos, logos o documentos</span>
              <input type="file" name="archivos" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" className="text-[14px]" />
            </label>
            <button className={botonLleno}>Enviar archivos</button>
          </form>
        </section>

        <article aria-live="polite">
          {entregaAbierta ? (
            <>
              <div className="flex items-center gap-4">
                <AgenteVista agente={agentePorId(entregaAbierta.agente)!} className="aspect-square w-24" distancia={5.6} />
                <div>
                  <p className={etiqueta}>{agentePorId(entregaAbierta.agente)?.nombre} · {agentePorId(entregaAbierta.agente)?.rol}</p>
                  <h2 className="display text-5xl">{entregaAbierta.titulo}</h2>
                </div>
              </div>
              <p className="mt-4 text-xl font-light">“{entregaAbierta.dice}”</p>
              <div className="entrega mt-6" dangerouslySetInnerHTML={{ __html: html(entregaAbierta.contenido) }} />
            </>
          ) : (
            <p className="text-xl font-light text-gris">Elige una entrega para leerla completa.</p>
          )}
        </article>
      </div>
    </main>
  );
}
