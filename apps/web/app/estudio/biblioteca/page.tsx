import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { buscar, esImagen, leerEntrega, listar, listarArchivos, versionesSitio, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";
import { MiniWeb } from "@/components/estudio/MiniWeb";
import { urlSitio } from "@/lib/sitio";
import { Cara, hace } from "@/components/estudio/piezas";
import { traerTodo } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { exigirEstudio, serif } from "@/lib/estudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biblioteca — Estudio", robots: { index: false } };

type Ver = "" | "diseno" | "entregas" | "cliente" | "archivos";
const FILTROS: { id: Ver; nombre: string; ayuda: string }[] = [
  { id: "", nombre: "Todo", ayuda: "Todo lo que hizo el estudio, lo más nuevo primero." },
  { id: "diseno", nombre: "Diseño y web", ayuda: "Las webs funcionando y las direcciones de diseño de cada proyecto." },
  { id: "entregas", nombre: "Entregas", ayuda: "Lo que entregó cada agente. Tócala para leerla completa." },
  { id: "cliente", nombre: "Lo que dijo el cliente", ayuda: "Lo anotado por Jay o Luna y lo que escribió el cliente en su portal." },
  { id: "archivos", nombre: "Archivos", ayuda: "Logos, fotos y documentos que subieron." },
];

const urlArchivo = (id: string, nombre: string) => `/estudio/${id}/archivos/${encodeURIComponent(nombre)}`;
const urlEntrega = (id: string, t: string) => `/estudio/${id}/${t.replace(".", "-")}`;

// La biblioteca (sistema/33): como mymind, todo lo hecho en tarjetas, con buscador. El trabajo del día vive en el inicio.
export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string; buscar?: string }> }) {
  await exigirEstudio();
  let errorNube = "";
  try { await traerTodo(); } catch (e) { errorNube = (e as Error).message; }
  const { q: qCruda, ver: verCrudo, buscar: enfocar } = await searchParams;
  const q = qCruda?.trim() ?? "";
  const ver = (FILTROS.some((f) => f.id === verCrudo) ? verCrudo : "") as Ver;
  const muestra = (f: Ver) => ver === "" || ver === f;
  const proyectos = listar();
  const hallazgos = q ? buscar(q) : [];
  const limite = ver === "" ? 12 : 60;

  const entregas = proyectos
    .flatMap((p) => Object.entries(p.tareas).filter(([, e]) => e === "lista").map(([t]) => ({ p, e: leerEntrega(p.pedido.id, t as TareaId) })))
    .filter((x): x is { p: Proyecto; e: NonNullable<ReturnType<typeof leerEntrega>> } => !!x.e)
    .sort((a, b) => b.e.creado.localeCompare(a.e.creado))
    .slice(0, limite);
  const delCliente = proyectos
    .flatMap((p) => [
      ...(p.notasCliente ?? []).map((n) => ({ p, fecha: n.fecha, texto: n.texto, quien: n.quien, pendiente: false })),
      ...(p.pendientesCliente ?? []).map((n) => ({ p, fecha: n.fecha, texto: n.texto, quien: "cliente" as const, pendiente: true })),
    ])
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, limite);
  const archivos = proyectos
    .flatMap((p) => listarArchivos(p.pedido.id).map((a) => ({ p, a })))
    .sort((x, y) => y.a.fecha.localeCompare(x.a.fecha))
    .slice(0, limite);
  // Diseño y web (sistema/42): la última versión de cada web y las direcciones (la elegida o las tres).
  const webs = proyectos.map((p) => ({ p, v: versionesSitio(p.pedido.id)[0] })).filter((x) => x.v).sort((a, b) => b.p.actualizado.localeCompare(a.p.actualizado));
  const disenos = proyectos.flatMap((p) => {
    const d = p.direcciones;
    if (!d?.opciones.length) return [];
    const lista = d.elegida !== undefined ? [{ d: d.opciones[d.elegida], n: d.elegida, elegida: true }] : d.opciones.map((x, n) => ({ d: x, n, elegida: false }));
    return lista.map((x) => ({ p, ...x }));
  });
  const vacio = !entregas.length && !delCliente.length && !archivos.length && !webs.length && !disenos.length;

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <p className="text-[13px] text-suave">Biblioteca</p>
      <h1 className={`${serif} mt-1 text-[clamp(34px,4.2vw,52px)] leading-[1.02]`}>Todo lo que hizo el estudio.</h1>

      <form role="search" action="/estudio/biblioteca" className="mt-6 flex max-w-2xl items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-[0_0_0_1px_var(--color-borde)] focus-within:shadow-[0_0_0_1.5px_var(--color-tinta)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-suave" aria-hidden><path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5" /></svg>
        <label className="min-w-0 flex-1"><span className="sr-only">Buscar en las entregas</span>
          <input id="buscar" name="q" defaultValue={q} autoFocus={!!enfocar} autoComplete="off" placeholder="Buscar en todas las entregas: paleta, WhatsApp, precios…" className="sin-anillo w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-[#b3ab9f]" />
        </label>
        {q && <Link href="/estudio/biblioteca" className="px-2 text-[13px] text-suave hover:text-tinta">Limpiar</Link>}
        <button className="inline-flex min-h-10 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Buscar</button>
      </form>

      {!q && (
        <>
          <nav aria-label="Filtrar" className="mt-5 flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <Link key={f.id} href={f.id ? `/estudio/biblioteca?ver=${f.id}` : "/estudio/biblioteca"} aria-current={ver === f.id ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] transition ${ver === f.id ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>
                {f.nombre}
              </Link>
            ))}
          </nav>
          <p className="mt-2 text-[13px] text-suave">{FILTROS.find((f) => f.id === ver)?.ayuda}</p>
        </>
      )}

      {errorNube && <p role="alert" className="mt-6 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la nube: {errorNube}. Recarga en un momento.</p>}

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
              <span className="text-[12px] text-white/60">¿Era un pedido nuevo?</span>
              <span className={`${serif} mt-2 block text-[24px] leading-[1.08]`}>Contarle a Atlas «{q.length > 60 ? `${q.slice(0, 60)}…` : q}» →</span>
            </Link>
          </div>
        </section>
      ) : vacio ? (
        <div className="mt-10 grid place-items-center rounded-[20px] border border-dashed border-borde px-6 py-14 text-center">
          <Cara id="sonda" tam={72} flota />
          <p className={`${serif} mt-4 text-[28px]`}>La biblioteca se llena sola.</p>
          <p className="mt-1 max-w-md text-[14px] text-medio">Cada entrega del equipo, cada cosa que dijo el cliente y cada archivo aparecen aquí.</p>
        </div>
      ) : (
        <div className="mamposteria mt-6">
          {disenos.length > 0 && muestra("diseno") && <FuentesDirecciones ds={disenos.map((x) => x.d)} />}
          {muestra("diseno") && webs.map(({ p, v }) => (
            <Link key={`web-${p.pedido.id}`} href={`/estudio/${p.pedido.id}/web`} className="tarjeta block p-3">
              <MiniWeb src={urlSitio(p.pedido.id, v!)} titulo={`Web de ${p.pedido.cliente}`} />
              <span className="flex items-center gap-2 px-1 pb-1 pt-3 text-[12px] text-suave">
                <i className="h-2 w-2 rounded-[2px]" style={{ background: espacio(p.pedido.id, p.marca).punto }} />
                <span className="font-medium text-tinta">La web · v{v}</span>
                <span className="ml-auto">{p.pedido.cliente}</span>
              </span>
            </Link>
          ))}
          {muestra("diseno") && disenos.map(({ p, d, n, elegida }) => (
            <Link key={`dir-${p.pedido.id}-${n}`} href={`/estudio/${p.pedido.id}/direcciones`} className="tarjeta block p-3">
              <Maqueta d={d} />
              <span className="flex items-center gap-2 px-1 pb-1 pt-3 text-[12px] text-suave">
                <span className="font-medium text-tinta">{d.nombre}</span>{elegida ? " · elegida" : ` · dirección ${n + 1}`}
                <span className="ml-auto">{p.pedido.cliente}</span>
              </span>
            </Link>
          ))}
          {muestra("entregas") && entregas.map(({ p, e }) => (
            <Link key={p.pedido.id + e.tarea} href={urlEntrega(p.pedido.id, e.tarea)} className="tarjeta block">
              <span className="block p-5">
                <span className="text-[12px] text-suave">{e.titulo}{e.version > 1 ? ` · versión ${e.version}` : ""}</span>
                {e.dice && <span className={`${serif} mt-2 block text-[22px] leading-[1.12]`}>“{e.dice}”</span>}
              </span>
              <span className="flex items-center gap-2 border-t border-[#f2eee8] px-4 py-2.5 text-[12px] text-suave">
                <Cara id={e.agente} tam={20} /> {agentePorId(e.agente)?.nombre} · {p.pedido.cliente}
                <span className="ml-auto">{hace(e.creado)}</span>
              </span>
            </Link>
          ))}
          {muestra("cliente") && delCliente.map((n) => (
            <Link key={n.p.pedido.id + n.fecha} href={`/estudio/${n.p.pedido.id}?ver=cliente`} className={`tarjeta block p-5 ${n.pendiente ? "bg-[#fff4e8]" : "bg-[#fffaf1]"}`}>
              <span className={`${serif} block text-[24px] leading-[1.12]`}>“{n.texto}”</span>
              <span className="mt-3 block text-[12px] text-suave">
                {n.quien === "cliente" ? n.p.pedido.cliente : `${n.p.pedido.cliente} · lo anotó ${n.quien === "luna" ? "Luna" : "Jay"}`} · {hace(n.fecha)}
                {n.pendiente && <span className="ml-1 text-urgente">· falta pasárselo al equipo</span>}
              </span>
            </Link>
          ))}
          {muestra("archivos") && archivos.map(({ p, a }) => (
            <a key={p.pedido.id + a.nombre} href={urlArchivo(p.pedido.id, a.nombre)} target="_blank" rel="noreferrer" className="tarjeta block">
              {esImagen(a.nombre) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlArchivo(p.pedido.id, a.nombre)} alt={a.nota ?? a.nombre} loading="lazy" className="block w-full bg-[#f4f1eb] object-cover" />
              ) : (
                <span className="flex aspect-[4/3] items-center justify-center bg-[#f4f1eb] p-4 text-center font-mono text-[12px] text-medio break-all">{a.nombre}</span>
              )}
              <span className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-suave">
                <i className="h-2 w-2 rounded-[2px]" style={{ background: espacio(p.pedido.id, p.marca).punto }} />
                <span className="truncate">{a.nota ?? a.nombre}</span>
                <span className="ml-auto shrink-0">{p.pedido.cliente}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
