// Gasto en IA (sistema/91): cuánto va hoy, esta semana y este mes, en qué se fue, cuánto queda y los topes.
// Sale del medidor: cada llamada a la API se anota con el modelo que respondió y los precios vigentes.
import Link from "next/link";
import { agentePorId } from "@anonymo/agentes";
import { listar, precioModelo, resumenGasto, TOPES_INICIALES, type ResumenGasto } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { traerTodo } from "@/lib/nube";
import { AjustesGasto } from "@/components/estudio/AjustesGasto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gasto en IA — Estudio", robots: { index: false } };

const usd = (n: number) => `USD ${n < 1 && n > 0 ? n.toFixed(3) : n.toFixed(2)}`;
const caja = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]";
const ORIGEN: Record<string, string> = { juez: "Juez de calidad", atlas: "Atlas (planes, encargos, consultas)", faro: "Faro (guiones)", corte: "Corte (video)", prueba: "Prueba de conexión", asistente: "Asistentes de las webs (plan Pro)" };
const nombreOrigen = (o: string) => ORIGEN[o] ?? agentePorId(o)?.nombre ?? o;
const hora = (iso: string) => new Date(iso).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

function Medida({ titulo, gastado, tope, detalle }: { titulo: string; gastado: number; tope?: number; detalle: string }) {
  const pct = tope ? Math.min(100, Math.round((gastado / tope) * 100)) : 0;
  const color = pct >= 100 ? "bg-[#c2410c]" : pct >= 80 ? "bg-[#d97706]" : "bg-tinta";
  return (
    <section className={caja} aria-label={titulo}>
      <h2 className="text-[13px] text-medio">{titulo}</h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className={`${serif} whitespace-nowrap text-[36px] leading-none`}>{usd(gastado)}</span>{tope ? <span className="text-[13px] text-medio">de {usd(tope)}</span> : null}</p>
      {tope ? <div role="progressbar" aria-label={`${titulo}: avance contra el tope`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee9e0]"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div> : null}
      <p className="mt-3 text-[12px] text-suave">{detalle}</p>
    </section>
  );
}

function Tabla({ titulo, filas, vacio, total }: { titulo: string; filas: { nombre: string; usd: number; llamadas: number }[]; vacio: string; total: number }) {
  return (
    <section className={caja}>
      <h2 className="text-[13px] text-medio">{titulo}</h2>
      {filas.length === 0 ? <p className="mt-3 text-[14px] text-medio">{vacio}</p> : (
        <ul className="mt-2 grid">
          {filas.slice(0, 12).map((f) => (
            <li key={f.nombre} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-borde/60 py-2.5 last:border-0">
              <span className="min-w-0"><span className="block truncate text-[14px]">{f.nombre}</span>
                <span aria-hidden className="mt-1 block h-1 rounded-full bg-[#eee9e0]"><span className="block h-full rounded-full bg-tinta" style={{ width: `${total ? Math.max(2, Math.round((f.usd / total) * 100)) : 0}%` }} /></span></span>
              <span className="text-right"><span className="block text-[14px] font-medium">{usd(f.usd)}</span><span className="block text-[11.5px] text-suave">{f.llamadas} {f.llamadas === 1 ? "llamada" : "llamadas"}</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Gasto() {
  await exigirEstudio();
  let r: ResumenGasto | undefined;
  let falla = "";
  try { r = await resumenGasto(); } catch (e) { falla = (e as Error).message; }
  // Los nombres de los proyectos, para no mostrar su id.
  let nombres: Record<string, string> = {};
  try { await traerTodo(); nombres = Object.fromEntries(listar().map((p) => [p.pedido.id, p.pedido.cliente])); } catch { /* se muestran los ids */ }
  if (!r) return <div className="px-5 pb-20 pt-7 md:px-10"><h1 className={`${serif} text-[40px] leading-none`}>Gasto en IA.</h1><p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer el medidor: {falla}</p></div>;
  const pasaDia = r.hoy.usd >= r.topes.diario, pasaMes = r.mes.usd >= r.topes.mensual;
  const titular = pasaMes ? "Se llegó al tope del mes." : pasaDia ? "Se llegó al tope de hoy." : r.mes.llamadas ? `Van ${usd(r.mes.usd)} este mes.` : "Todavía no hay gasto medido.";
  const porProyecto = r.porProyecto.map((f) => ({ ...f, nombre: nombres[f.nombre] ?? f.nombre }));
  const promedio = r.mes.llamadas ? r.mes.usd / r.mes.llamadas : 0;
  const iniciales = r.topes.diario === TOPES_INICIALES.diario && r.topes.mensual === TOPES_INICIALES.mensual;
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px] text-suave">Mejorar el estudio</p>
      <h1 className={`${serif} mt-1 text-[40px] leading-[1.02]`} data-titular-gasto>{titular}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-medio">Cada vez que un agente usa la IA queda anotado aquí con lo que costó. Las muestras, la tanda y los recordatorios no usan IA: cuestan cero.</p>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Medida titulo="Hoy" gastado={r.hoy.usd} tope={r.topes.diario + r.extra} detalle={`${r.hoy.llamadas} ${r.hoy.llamadas === 1 ? "llamada" : "llamadas"}${r.extra ? ` · con permiso de USD ${r.extra} más` : ""}`} />
        <Medida titulo="Esta semana" gastado={r.semana.usd} detalle={`${r.semana.llamadas} ${r.semana.llamadas === 1 ? "llamada" : "llamadas"} desde el lunes`} />
        <Medida titulo="Este mes" gastado={r.mes.usd} tope={r.topes.mensual} detalle={`${r.mes.llamadas} ${r.mes.llamadas === 1 ? "llamada" : "llamadas"} · promedio ${usd(promedio)} cada una`} />
        <section className={caja} aria-label="Saldo">
          <h2 className="text-[13px] text-medio">Saldo que queda</h2>
          {r.saldo ? (<>
            <p className={`${serif} mt-2 whitespace-nowrap text-[36px] leading-none`}>{usd(r.saldo.queda)}</p>
            <p className="mt-3 text-[12px] text-suave">De {usd(r.saldo.usd)} anotados el {hora(r.saldo.desde)}. Solo descuenta lo que gasta el estudio: si usas la misma clave en otro lado, vuelve a anotarlo.</p>
          </>) : <p className="mt-3 text-[14px] text-medio">Anota abajo el saldo que ves en la consola de Anthropic y aquí se va descontando.</p>}
        </section>
      </div>

      <section className={`${caja} mt-3`} aria-labelledby="t-topes">
        <h2 id="t-topes" className="text-[13px] text-medio">Topes y saldo</h2>
        <p className="mb-4 mt-1 max-w-2xl text-[13px] text-suave">Al llegar al tope, la IA se detiene sola y te avisa al celular (también al 50 y al 80 %). {iniciales ? "Estos son los topes de arranque. Para el uso normal se propone USD 1.5 por día y USD 40 por mes." : ""}</p>
        <AjustesGasto diario={r.topes.diario} mensual={r.topes.mensual} saldo={r.topes.saldo?.usd} pasaDia={pasaDia} extra={r.extra} permisoSugerido={Math.max(1, Math.round(r.topes.diario / 2))} />
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Tabla titulo="Por agente, este mes" filas={r.porOrigen.map((f) => ({ ...f, nombre: nombreOrigen(f.nombre) }))} vacio="Nadie ha usado la IA este mes." total={r.mes.usd} />
        <Tabla titulo="Por proyecto, este mes" filas={porProyecto} vacio="Ningún proyecto ha usado la IA este mes." total={r.mes.usd} />
        <Tabla titulo="Por modelo, este mes" filas={r.porModelo} vacio="Sin llamadas todavía." total={r.mes.usd} />
      </div>
      {r.desconocidos.length > 0 && <p role="alert" className="mt-3 rounded-2xl bg-[#fff6ec] p-4 text-[13px] text-[#8a5a00]">Hay un modelo sin precio conocido ({r.desconocidos.join(", ")}): se cobró como Sonnet 5.5. Avisa para agregar su precio.</p>}
      <p className="mt-3 text-[12px] text-suave">Trabajo automático este mes: {usd(r.automatico)}. Entrada servida desde el caché: {r.deCache} %.</p>

      <section className={`${caja} mt-3`} aria-labelledby="t-ultimas">
        <h2 id="t-ultimas" className="text-[13px] text-medio">Últimas llamadas</h2>
        {r.ultimas.length === 0 ? <p className="mt-3 text-[14px] text-medio">Cuando un agente trabaje con IA, aparece aquí.</p> : (
          <ul className="mt-2 grid">
            {r.ultimas.map((l, i) => (
              <li key={l.t + i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-borde/60 py-2.5 text-[13px] last:border-0">
                <span className="min-w-0"><span className="block truncate"><span className="font-medium">{nombreOrigen(l.origen)}</span>{l.proyecto ? <> · <Link href={`/estudio/${l.proyecto}`} className="underline underline-offset-4">{nombres[l.proyecto] ?? l.proyecto}</Link></> : null}</span>
                  <span className="block truncate text-[11.5px] text-suave">{hora(l.t)} · {precioModelo(l.modelo).nombre} · {l.entrada.toLocaleString("es-EC")} de entrada, {l.salida.toLocaleString("es-EC")} de salida{l.cacheL ? `, ${l.cacheL.toLocaleString("es-EC")} del caché` : ""}{l.busquedas ? `, ${l.busquedas} búsquedas` : ""}{l.auto ? " · automático" : ""}</span></span>
                <span className="font-medium">{usd(l.usd)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
