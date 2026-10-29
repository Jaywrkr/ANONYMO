import Link from "next/link";
import { agentePorId, PEDIDOS as TIPOS } from "@anonymo/agentes";
import { buscar, contratoPorId, esImagen, leerEntrega, listar, listarArchivos, listarSolicitudes, PLANTILLAS, responsable, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { Avance, Cara, Caras, Fases, estadosDeFases, fechaLarga, hace, saludo } from "@/components/estudio/piezas";
import { CajaAtlas } from "@/components/estudio/CajaAtlas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { Enviar } from "./nuevo/Enviar";
import { accionConvertirSolicitud, accionDescartarSolicitud } from "./acciones";
import { traerTodo } from "@/lib/nube";
import { nombreFase, puestos } from "@/lib/oficina";
import { espacio } from "@/lib/espacio";
import { botonLleno, ESTADO_PROYECTO, exigirEstudio, serif } from "@/lib/estudio";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Estudio — Anonymo", robots: { index: false } };

type Ver = "" | "te-toca" | "proyectos" | "entregas" | "cliente" | "archivos";
const FILTROS: { id: Ver; nombre: string }[] = [
  { id: "", nombre: "Todo" },
  { id: "te-toca", nombre: "Te toca" },
  { id: "proyectos", nombre: "Proyectos" },
  { id: "entregas", nombre: "Entregas" },
  { id: "cliente", nombre: "Del cliente" },
  { id: "archivos", nombre: "Archivos" },
];

const urlArchivo = (id: string, nombre: string) => `/estudio/${id}/archivos/${encodeURIComponent(nombre)}`;
const urlEntrega = (id: string, t: string) => `/estudio/${id}/${t.replace(".", "-")}`;

// La mente del estudio: todo lo que pasa, como tarjetas. Primero lo que espera una decisión.
export default async function Estudio({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string; buscar?: string }> }) {
  const yo = await exigirEstudio();
  let errorNube = "";
  try {
    await traerTodo();
  } catch (e) {
    errorNube = (e as Error).message;
  }
  const { q: qCruda, ver: verCrudo, buscar: enfocar } = await searchParams;
  const q = qCruda?.trim() ?? "";
  const ver = (FILTROS.some((f) => f.id === verCrudo) ? verCrudo : "") as Ver;
  const nombreYo = yo === "luna" ? "Luna" : "Jay";

  const orden: Record<string, number> = { plan: 0, esperando: 0, "en-curso": 1, parado: 2, listo: 3 };
  const proyectos = listar().sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  const activos = proyectos.filter((p) => p.estado !== "listo");
  const solicitudes = listarSolicitudes();
  const hallazgos = q ? buscar(q) : [];

  // Lo que espera una decisión: primero lo que le toca a quien entró.
  const pendientes = proyectos
    .filter((p) => p.estado === "plan" || p.estado === "esperando")
    .map((p) => {
      const quien = p.estado === "plan" ? yo : responsable(p, p.faseActual);
      const titulo = p.estado === "plan"
        ? "Atlas armó el plan. ¿Empiezan?"
        : p.esperaJurado ? "El jurado no llegó a 7. Decide qué hacer." : `${nombreFase(p.faseActual)} está listo para revisar.`;
      const caras = p.estado === "plan" ? ["atlas"] : Object.keys(p.tareas).filter((t) => t.startsWith(`${p.faseActual}.`)).map((t) => t.split(".")[1]);
      return { p, quien, titulo, caras };
    })
    .sort((a, b) => Number(b.quien === yo) - Number(a.quien === yo));
  const mios = pendientes.filter((x) => x.quien === yo).length;

  // Quién trabaja ahora mismo.
  const trabajando = activos.flatMap((p) =>
    Object.entries(p.tareas).filter(([, e]) => e === "en-curso").map(([t]) => ({ p, t: t as TareaId })),
  );
  const aMedias = activos.filter((p) => p.estado === "en-curso" && !trabajando.some((x) => x.p === p));
  const oficina = puestos(activos.map((p) => ({ id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas })));
  const enMovimiento = Object.values(oficina).filter((x) => x.estado !== "libre").length;

  // Entregas recientes, lo dicho por el cliente y los archivos.
  const entregas = proyectos
    .flatMap((p) => Object.entries(p.tareas).filter(([, e]) => e === "lista").map(([t]) => ({ p, e: leerEntrega(p.pedido.id, t as TareaId) })))
    .filter((x): x is { p: Proyecto; e: NonNullable<ReturnType<typeof leerEntrega>> } => !!x.e)
    .sort((a, b) => b.e.creado.localeCompare(a.e.creado))
    .slice(0, ver === "entregas" ? 40 : 9);
  const delCliente = proyectos
    .flatMap((p) => [
      ...(p.notasCliente ?? []).map((n) => ({ p, fecha: n.fecha, texto: n.texto, quien: n.quien, pendiente: false })),
      ...(p.pendientesCliente ?? []).map((n) => ({ p, fecha: n.fecha, texto: n.texto, quien: "cliente" as const, pendiente: true })),
    ])
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, ver === "cliente" ? 40 : 6);
  const archivos = proyectos
    .flatMap((p) => listarArchivos(p.pedido.id).map((a) => ({ p, a })))
    .sort((x, y) => y.a.fecha.localeCompare(x.a.fecha))
    .slice(0, ver === "archivos" ? 60 : 6);

  const mes = new Date().toISOString().slice(0, 7);
  const gastoMes = proyectos.reduce((s, p) => s + Object.values(p.costos ?? {}).flat().filter((u) => !u.estimado && u.fecha.startsWith(mes)).reduce((a, u) => a + u.usd, 0), 0);
  const semana = Date.now() - 7 * 86400_000;
  const entregasSemana = proyectos.reduce((s, p) => s + Object.values(p.costos ?? {}).filter((l) => l.some((u) => Date.parse(u.fecha) >= semana)).length, 0);

  const muestra = (f: Ver) => ver === "" || ver === f;
  const cuenta: Partial<Record<Ver, number>> = { "te-toca": pendientes.length + solicitudes.length, proyectos: proyectos.length };
  const vacio = proyectos.length === 0 && solicitudes.length === 0;

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <p className="text-[13px] text-suave">{fechaLarga()}</p>
      <h1 className={`${serif} mt-1 text-[clamp(34px,4.2vw,54px)] leading-[1.02]`}>
        {saludo(nombreYo)}{" "}
        <span className="text-[#b3ab9f]">
          {mios > 0 ? `Tienes ${mios === 1 ? "una cosa" : `${mios} cosas`} por decidir.` : trabajando.length ? `El equipo está en ${trabajando.length === 1 ? "una tarea" : `${trabajando.length} tareas`}.` : "El estudio está al día."}
        </span>
      </h1>

      <div className="mt-7"><CajaAtlas q={q} enfocar={!!enfocar} /></div>

      <nav aria-label="Filtrar" className="mt-4 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/estudio?ver=${f.id}` : "/estudio"}
            aria-current={ver === f.id && !q ? "page" : undefined}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition ${ver === f.id && !q ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}
          >
            {f.nombre}
            {cuenta[f.id] ? <span className={ver === f.id && !q ? "text-white/60" : "text-suave"}>{cuenta[f.id]}</span> : null}
          </Link>
        ))}
      </nav>

      {errorNube && (
        <p role="alert" className="mt-6 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la nube: {errorNube}. Lo que ves puede no estar al día; recarga en un momento.</p>
      )}

      {/* Búsqueda: reemplaza el tablero mientras haya una consulta. */}
      {q ? (
        <section aria-label="Resultados" className="mt-8">
          <p className="text-[13px] text-suave">{hallazgos.length ? `${hallazgos.length} resultado${hallazgos.length === 1 ? "" : "s"} para «${q}»` : `Nada para «${q}» en las entregas.`}</p>
          <div className="mamposteria mt-4">
            {hallazgos.map((h) => (
              <Link key={h.proyecto + h.tarea} href={urlEntrega(h.proyecto, h.tarea)} className="tarjeta block p-5">
                <span className="flex items-center gap-2 text-[12px] text-suave"><Cara id={h.agente} tam={20} /> {agentePorId(h.agente)?.nombre} · {h.cliente}</span>
                <span className={`${serif} mt-2 block text-[24px] leading-[1.08]`}>{h.titulo}</span>
                <span className="mt-2 block text-[14px] leading-snug text-medio">{h.fragmento}</span>
              </Link>
            ))}
            <Link href={`/estudio/nuevo?q=${encodeURIComponent(q)}`} className="tarjeta block bg-tinta p-5 text-white">
              <span className="text-[12px] text-white/60">¿No era una búsqueda?</span>
              <span className={`${serif} mt-2 block text-[24px] leading-[1.08]`}>Contarle a Atlas «{q.length > 60 ? `${q.slice(0, 60)}…` : q}» como un pedido nuevo →</span>
            </Link>
          </div>
        </section>
      ) : vacio ? (
        <section className="mt-10 grid place-items-center rounded-[20px] border border-dashed border-borde px-6 py-16 text-center">
          <Cara id="atlas" tam={88} flota />
          <p className={`${serif} mt-5 text-[34px] leading-tight`}>El estudio está listo para el primer proyecto.</p>
          <p className="mt-2 max-w-md text-[15px] text-medio">Después de hablar con un cliente, cuéntale a Atlas lo que hablaron. Él decide quién trabaja y nadie empieza hasta que digas.</p>
          <Link href="/estudio/nuevo" className={`${botonLleno} mt-6`}>Nuevo proyecto</Link>
        </section>
      ) : (
        <>
          {/* Te toca: lo único en negro. */}
          {muestra("te-toca") && (pendientes.length > 0 || solicitudes.length > 0) && (
            <section aria-label="Te toca" className="mt-8">
              <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pendientes.map(({ p, quien, titulo, caras }) => (
                  <Link key={p.pedido.id} href={`/estudio/${p.pedido.id}`} className={`tarjeta tarjeta-viva !mb-0 flex flex-col p-5 ${quien === yo ? "bg-tinta text-white" : "bg-white"}`}>
                    <span className={`flex items-center gap-2 text-[12px] ${quien === yo ? "text-[#ffb08f]" : "text-suave"}`}>
                      <i className={`h-1.5 w-1.5 rounded-full ${quien === yo ? "late bg-urgente" : "bg-suave"}`} />
                      {quien === yo ? "Te toca" : `Le toca a ${quien === "luna" ? "Luna" : "Jay"}`} · {hace(p.actualizado)}
                    </span>
                    <span className="mt-3 flex items-center gap-2 text-[13px] opacity-70"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: espacio(p.pedido.id).punto }} />{p.pedido.cliente}</span>
                    <span className={`${serif} mt-1 block text-[26px] leading-[1.05]`}>{titulo}</span>
                    <span className="mt-auto flex items-center pt-5">
                      <Caras ids={caras} tam={24} />
                      <span className={`ml-auto inline-flex min-h-9 items-center rounded-full px-4 text-[12px] font-medium ${quien === yo ? "bg-white text-tinta" : "bg-tinta text-white"}`}>{p.estado === "plan" ? "Ver el plan" : "Revisar"}</span>
                    </span>
                  </Link>
                ))}
                {solicitudes.map((s) => (
                  <article key={s.id} className="tarjeta !mb-0 flex flex-col p-5">
                    <span className="flex items-center gap-2 text-[12px] text-suave"><i className="h-1.5 w-1.5 rounded-full bg-urgente" /> Pedido desde la web · {TIPOS[s.tipo].nombre} · {hace(s.fecha)}</span>
                    <span className={`${serif} mt-2 block text-[26px] leading-[1.05]`}>{s.nombre}</span>
                    <a href={`mailto:${s.correo}`} className="text-[13px] text-medio underline underline-offset-4">{s.correo}</a>
                    <p className="mt-3 line-clamp-5 whitespace-pre-line text-[14px] leading-snug text-medio">{s.mensaje}</p>
                    <form action={accionConvertirSolicitud} className="mt-4 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="solicitud" value={s.id} />
                      <select name="plantilla" aria-label="Plantilla" defaultValue="" className="min-h-11 rounded-full bg-[#f1ede6] px-3 text-[13px] outline-none">
                        <option value="">Sin plantilla</option>
                        {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <Enviar className={botonLleno} texto="Que Atlas arme el plan" trabajando="Atlas está leyendo…" />
                    </form>
                    <div className="mt-1">
                      <Confirmar accion={accionDescartarSolicitud} campos={{ solicitud: s.id }} disparador="Descartar" titulo="¿Descartar este pedido?" texto={`El pedido de ${s.nombre} sale de la lista. No se crea ningún proyecto.`} confirmar="Descartar" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {ver === "te-toca" && pendientes.length === 0 && solicitudes.length === 0 && (
            <p className={`${serif} mt-10 text-[30px] text-suave`}>Nada espera tu decisión. El equipo está al día.</p>
          )}

          {ver !== "te-toca" && (
            <div className="mamposteria mt-8">
              {/* El equipo trabajando ahora. */}
              {ver === "" && trabajando.map(({ p, t }) => {
                const a = agentePorId(t.split(".")[1])!;
                const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
                return (
                  <Link key={p.pedido.id + t} href={`/estudio/${p.pedido.id}`} className="tarjeta block p-5 text-center" style={{ background: `radial-gradient(90% 70% at 50% 30%, ${(a.tono ?? { luz: "#f4f1ec" }).luz}, #fff 75%)` }}>
                    <Cara id={a.id} tam={92} flota className="mx-auto" />
                    <span className="mt-3 block text-[14px]"><strong className="font-medium">{a.nombre}</strong> está haciendo {contratoPorId(t)?.entrega.toLowerCase()}</span>
                    <span className="mt-3 block"><Avance valor={hechas / Math.max(1, p.plan.tareas.length)} color={espacio(p.pedido.id).punto} vivo /></span>
                    <span className="mt-2 block text-[12px] text-suave">{p.pedido.cliente} · {hechas} de {p.plan.tareas.length} entregas</span>
                  </Link>
                );
              })}
              {ver === "" && aMedias.map((p) => (
                <Link key={p.pedido.id} href={`/estudio/${p.pedido.id}`} className="tarjeta block p-5">
                  <span className="text-[12px] text-suave">{p.pedido.cliente}</span>
                  <span className={`${serif} mt-1 block text-[24px] leading-[1.08]`}>El equipo quedó a medias.</span>
                  <span className="mt-2 block text-[14px] text-medio">Se cortó por tiempo. Lo terminado está guardado: entra y dale a «Seguir».</span>
                </Link>
              ))}

              {/* La oficina, en pequeño. */}
              {ver === "" && (
                <Link href="/estudio/oficina" className="tarjeta block bg-[#f6f3ee] p-5">
                  <span className="flex items-center gap-2 text-[12px] text-suave"><i className={`h-1.5 w-1.5 rounded-full ${trabajando.length ? "late bg-vivo" : "bg-suave"}`} /> El estudio ahora</span>
                  <span className="mt-4 flex flex-wrap gap-1">
                    {Object.entries(oficina).map(([id, x]) => <Cara key={id} id={id} tam={30} apagado={x.estado === "libre"} className={x.estado === "trabajando" ? "flota scale-110" : ""} />)}
                  </span>
                  <span className="mt-3 block text-[13px] text-medio">
                    {trabajando.length} trabajando · {Object.values(oficina).filter((x) => x.estado === "revisar").length} esperan tu revisión · {22 - enMovimiento} libres
                  </span>
                </Link>
              )}

              {/* Proyectos. */}
              {muestra("proyectos") && proyectos.map((p) => {
                const e = espacio(p.pedido.id);
                const hechas = Object.values(p.tareas).filter((x) => x === "lista").length;
                const enAlgo = Object.entries(p.tareas).filter(([, x]) => x === "en-curso").map(([t]) => t.split(".")[1]);
                return (
                  <Link key={p.pedido.id} href={`/estudio/${p.pedido.id}`} className="tarjeta block">
                    <span className="block h-1.5" style={{ background: e.punto }} />
                    <span className="block p-5">
                      <span className="flex items-center justify-between gap-2 text-[12px] text-suave"><span>{TIPOS[p.pedido.tipo].nombre}</span><span>{ESTADO_PROYECTO[p.estado]}</span></span>
                      <span className={`${serif} mt-1 block text-[28px] leading-[1.02]`}>{p.pedido.cliente}</span>
                      <span className="mt-3 block"><Fases fases={estadosDeFases(p)} estado={p.estado} compacta /></span>
                      <span className="mt-4 flex items-center gap-3">
                        <span className="flex-1"><Avance valor={hechas / Math.max(1, p.plan.tareas.length)} color={e.punto} /></span>
                        <span className="text-[12px] text-suave">{hechas}/{p.plan.tareas.length}</span>
                        {enAlgo.length > 0 && <Caras ids={enAlgo} tam={20} max={3} />}
                      </span>
                    </span>
                  </Link>
                );
              })}

              {/* Entregas recientes, firmadas por quien las hizo. */}
              {muestra("entregas") && entregas.map(({ p, e }) => {
                const a = agentePorId(e.agente);
                return (
                  <Link key={p.pedido.id + e.tarea} href={urlEntrega(p.pedido.id, e.tarea)} className="tarjeta block">
                    <span className="block p-5">
                      <span className="text-[12px] text-suave">{e.titulo}{e.version > 1 ? ` · v${e.version}` : ""}</span>
                      {e.dice && <span className={`${serif} mt-2 block text-[22px] leading-[1.12]`}>“{e.dice}”</span>}
                      {e.necesita && e.necesita !== "—" && <span className="mt-2 block text-[13px] text-medio">Necesita: {e.necesita}</span>}
                    </span>
                    <span className="flex items-center gap-2 border-t border-[#f2eee8] px-4 py-2.5 text-[12px] text-suave">
                      <Cara id={e.agente} tam={20} /> {a?.nombre} · {p.pedido.cliente}
                      <span className="ml-auto font-mono text-[10px]">{hace(e.creado)}</span>
                    </span>
                  </Link>
                );
              })}

              {/* Lo que dijo el cliente. */}
              {muestra("cliente") && delCliente.map((n) => (
                <Link key={n.p.pedido.id + n.fecha} href={`/estudio/${n.p.pedido.id}?ver=cliente`} className={`tarjeta block p-5 ${n.pendiente ? "bg-[#fff4e8]" : "bg-[#fffaf1]"}`}>
                  <span className={`${serif} block text-[24px] leading-[1.12]`}>“{n.texto}”</span>
                  <span className="mt-3 block text-[12px] text-suave">
                    {n.quien === "cliente" ? n.p.pedido.cliente : `${n.p.pedido.cliente} · lo anotó ${n.quien === "luna" ? "Luna" : "Jay"}`} · {hace(n.fecha)}
                    {n.pendiente && <span className="ml-1 text-urgente">· sin mandar al equipo</span>}
                  </span>
                </Link>
              ))}

              {/* Archivos del cliente. */}
              {muestra("archivos") && archivos.map(({ p, a }) => (
                <a key={p.pedido.id + a.nombre} href={urlArchivo(p.pedido.id, a.nombre)} target="_blank" rel="noreferrer" className="tarjeta block">
                  {esImagen(a.nombre) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlArchivo(p.pedido.id, a.nombre)} alt={a.nota ?? a.nombre} loading="lazy" className="block w-full bg-[#f4f1eb] object-cover" />
                  ) : (
                    <span className="flex aspect-[4/3] items-center justify-center bg-[#f4f1eb] p-4 text-center font-mono text-[12px] text-medio break-all">{a.nombre}</span>
                  )}
                  <span className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-suave">
                    <i className="h-2 w-2 rounded-[2px]" style={{ background: espacio(p.pedido.id).punto }} />
                    <span className="truncate">{a.nota ?? a.nombre}</span>
                    <span className="ml-auto shrink-0">{p.pedido.cliente}</span>
                  </span>
                </a>
              ))}

              {/* Los números del mes. */}
              {ver === "" && (
                <div className="tarjeta p-5">
                  <span className="text-[12px] text-suave">Este mes</span>
                  <span className={`${serif} mt-1 block text-[52px] leading-none`}>${gastoMes.toFixed(2)}</span>
                  <span className="mt-1 block text-[13px] text-medio">gastado en IA</span>
                  <span className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f2eee8] pt-3 text-[13px]">
                    <span><strong className="block text-[20px] font-normal">{entregasSemana}</strong><span className="text-suave">entregas en 7 días</span></span>
                    <span><strong className="block text-[20px] font-normal">{activos.length}</strong><span className="text-suave">proyectos activos</span></span>
                  </span>
                </div>
              )}

              {ver !== "" && ver !== "proyectos" && ((ver === "entregas" && !entregas.length) || (ver === "cliente" && !delCliente.length) || (ver === "archivos" && !archivos.length)) && (
                <p className={`${serif} text-[28px] text-suave`}>
                  {ver === "entregas" ? "Todavía no hay entregas." : ver === "cliente" ? "Todavía no hay nada anotado del cliente." : "Todavía no hay archivos."}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
