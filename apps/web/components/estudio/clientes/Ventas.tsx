// Ventas de un vistazo (sistema/89): el marcador de la semana, lo que toca hoy y cuántos negocios hay en cada etapa.
// Se ve en el inicio y arriba del tablero. Sale de la lista de Imán: no guarda nada aparte.
import Link from "next/link";
import { ETAPAS, TANDA_DIARIA, type Etapa } from "@anonymo/pipeline";
import type { VistaLista } from "@/lib/clientes";
import { armarTanda } from "@/lib/tanda";
import { serif } from "@/lib/estudio";

const dolares = (n: number) => `USD ${n.toLocaleString("es-EC")}`;

/** El marcador de la semana: lo que se mandó contra la meta, y lo que volvió. */
export function Marcador({ lista, tira }: { lista: VistaLista; tira?: boolean }) {
  const { semana: s, meta } = lista;
  const avance = Math.min(100, Math.round((s.enviados / meta) * 100));
  const dato = (n: string, t: string) => <div><dd className={`${serif} text-[30px] leading-none`}>{n}</dd><dt className="mt-1 text-[12px] text-medio">{t}</dt></div>;
  const racha = s.racha > 1 ? `${s.racha} días seguidos` : s.racha === 1 ? "Racha: 1 día" : "Sin racha todavía";
  // En el tablero (sistema/109): todo en una franja a lo ancho, para que el tablero quede arriba.
  if (tira) return (
    <section aria-label="Marcador de la semana" data-marcador className="grid items-center gap-x-8 gap-y-4 rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)] md:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(0,.6fr))]">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] text-medio">Esta semana</h2>
          <span className="text-[12px] text-suave">{racha}</span>
        </div>
        <p className="mt-1 flex items-baseline gap-2"><span className={`${serif} text-[40px] leading-none`}>{s.enviados}</span><span className="text-[14px] text-medio">de {meta} mensajes</span></p>
        <div role="progressbar" aria-label="Avance de la meta de mensajes" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(s.enviados, meta)} className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee9e0]">
          <div className={`h-full rounded-full ${avance >= 100 ? "bg-[#17714a]" : "bg-tinta"}`} style={{ width: `${avance}%` }} />
        </div>
      </div>
      <dl className="contents">
        {dato(String(s.abrieron), s.abrieron === 1 ? "abrió su muestra" : "abrieron su muestra")}
        {dato(String(s.respondieron), s.respondieron === 1 ? "respondió" : "respondieron")}
        {dato(s.clientes ? dolares(s.dolares) : "0", s.clientes ? (s.clientes === 1 ? "cerrado, 1 cliente" : `cerrados, ${s.clientes} clientes`) : "clientes nuevos")}
      </dl>
    </section>
  );
  return (
    <section aria-label="Marcador de la semana" data-marcador className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[13px] text-medio">Esta semana</h2>
        <p className="text-[12px] text-suave">{s.racha > 1 ? `${s.racha} días seguidos escribiendo` : s.racha === 1 ? "Racha: 1 día. Mañana son 2." : "Sin racha todavía: empieza hoy."}</p>
      </div>
      <p className="mt-2 flex items-baseline gap-2"><span className={`${serif} text-[44px] leading-none`}>{s.enviados}</span><span className="text-[14px] text-medio">de {meta} mensajes</span></p>
      <div role="progressbar" aria-label="Avance de la meta de mensajes" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(s.enviados, meta)} className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee9e0]">
        <div className={`h-full rounded-full ${avance >= 100 ? "bg-[#17714a]" : "bg-tinta"}`} style={{ width: `${avance}%` }} />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {dato(String(s.abrieron), s.abrieron === 1 ? "abrió su muestra" : "abrieron su muestra")}
        {dato(String(s.respondieron), s.respondieron === 1 ? "respondió" : "respondieron")}
        {dato(s.clientes ? dolares(s.dolares) : "0", s.clientes ? (s.clientes === 1 ? "cerrado, 1 cliente" : `cerrados, ${s.clientes} clientes`) : "clientes nuevos")}
      </dl>
    </section>
  );
}

/** Cuántos negocios hay en cada etapa. Cada número lleva a su columna del tablero. */
export function Embudo({ lista }: { lista: VistaLista }) {
  const cuenta = (e: Etapa) => lista.prospectos.filter((p) => p.etapa === e).length;
  return (
    <nav aria-label="Negocios por etapa" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {ETAPAS.map(([e, nombre]) => (
        <Link key={e} href={`/estudio/clientes/tablero#etapa-${e}`} className="flex min-h-14 min-w-[104px] flex-1 flex-col justify-center rounded-2xl bg-[#f6f3ee] px-3 py-2 transition hover:bg-white hover:shadow-[0_0_0_1px_rgba(26,24,22,.1)]">
          <span className={`${serif} text-[24px] leading-none`}>{cuenta(e)}</span>
          <span className="mt-0.5 whitespace-nowrap text-[11.5px] text-medio">{nombre}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Lo de ventas en el inicio: lo que toca hoy, el marcador y el embudo. Sin negocios en la lista, invita a buscar. */
export function VentasHoy({ lista }: { lista: VistaLista }) {
  if (!lista.prospectos.length) return null;
  const t = armarTanda(lista.prospectos, TANDA_DIARIA);
  const porEscribir = t.propuestos.length, recordatorios = t.seguimientos.length;
  const hay = porEscribir + recordatorios > 0;
  return (
    <section aria-label="Ventas de hoy" data-ventas-hoy className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-between gap-4 rounded-[18px] bg-tinta p-5 text-white">
        <div>
          <h2 className="text-[13px] text-white/70">Hoy en ventas</h2>
          <p className={`${serif} mt-2 text-[30px] leading-[1.05]`}>
            {hay ? <>{porEscribir > 0 && `${porEscribir} ${porEscribir === 1 ? "negocio" : "negocios"} por escribir`}{porEscribir > 0 && recordatorios > 0 && " y "}{recordatorios > 0 && `${recordatorios} ${recordatorios === 1 ? "recordatorio" : "recordatorios"}`}.</>
              : t.enviadosHoy ? "La tanda de hoy está hecha." : "No hay a quién escribir hoy."}
          </p>
          <p className="mt-2 text-[13px] text-white/70">{t.enviadosHoy} de {TANDA_DIARIA} enviados hoy. Los mejores horarios: de 9 a 11 y de 15 a 17.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hay
            ? <Link href="/estudio/clientes/tanda" className="inline-flex min-h-11 items-center rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black">Escribir ahora →</Link>
            : <Link href="/estudio/clientes/nuevos" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[14px] font-medium text-tinta">Que Imán busque más →</Link>}
          <Link href="/estudio/clientes/tablero" className="inline-flex min-h-11 items-center rounded-full px-4 text-[14px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)]">Ver el tablero</Link>
        </div>
      </div>
      <Marcador lista={lista} />
      <div className="min-w-0 lg:col-span-2"><Embudo lista={lista} /></div>
    </section>
  );
}
