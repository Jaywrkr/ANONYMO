// El tablero de ventas (sistema/89): todos los negocios por etapa, de «por escribir» a «cliente».
// Las tarjetas se mueven solas: cuando el negocio abre su muestra, toca «Quiero esta web» o acepta la propuesta, cambia de columna.
import Link from "next/link";
import { ETAPAS, leerProspectos, type Etapa } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { listaVacia, vistaLista, type VistaLista, type VistaProspecto } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";
import { Cara } from "@/components/estudio/piezas";
import { PestanasClientes } from "@/components/estudio/clientes/PestanasClientes";
import { Marcador } from "@/components/estudio/clientes/Ventas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tablero de ventas — Estudio", robots: { index: false } };

const A_LA_VISTA = 6;

const hace = (iso?: string) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

/** Lo que más importa saber de un negocio según su etapa, en una línea. */
function senal(p: VistaProspecto, e: Etapa) {
  if (e === "nuevo") return `${p.puntaje}/100${p.buenaFama ? " · muy buena fama" : ""}`;
  if (e === "escrito") return p.tocaSeguimiento ? "Le toca el recordatorio" : `Le escribiste ${hace(p.contactado)}${p.seguimiento ? " · recordatorio enviado" : ""}`;
  if (e === "abrio") return `Vio su muestra ${p.vistas === 1 ? "1 vez" : `${p.vistas} veces`} · ${hace(p.ultimaVista)}${p.proboAsistente ? " · probó el asistente" : ""}`;
  if (e === "respondio") return p.estado === "reunion" ? "Tienen reunión" : p.vistasPropuesta ? `Abrió la propuesta ${p.vistasPropuesta === 1 ? "1 vez" : `${p.vistasPropuesta} veces`}` : "Respondió: mándale la propuesta";
  if (e === "quiere") return p.acepto ? `Aceptó la propuesta · USD ${p.precio}` : "Tocó «Quiero esta web»";
  return p.proyecto ? "Con proyecto en marcha" : "Cliente";
}

const orden: Record<Etapa, (a: VistaProspecto, b: VistaProspecto) => number> = {
  nuevo: (a, b) => b.puntaje - a.puntaje,
  escrito: (a, b) => Number(b.tocaSeguimiento) - Number(a.tocaSeguimiento) || (b.contactado ?? "").localeCompare(a.contactado ?? ""),
  abrio: (a, b) => (b.ultimaVista ?? "").localeCompare(a.ultimaVista ?? ""),
  respondio: (a, b) => b.actualizado.localeCompare(a.actualizado),
  quiere: (a, b) => Number(!!b.acepto) - Number(!!a.acepto) || b.actualizado.localeCompare(a.actualizado),
  cliente: (a, b) => b.actualizado.localeCompare(a.actualizado),
};

const VACIA: Record<Etapa, string> = {
  nuevo: "Dile a Imán que busque más negocios.",
  escrito: "Aquí caen los que ya tienen tu mensaje.",
  abrio: "Cuando alguien abra su muestra, aparece aquí solo.",
  respondio: "Cuando alguien te conteste, márcalo «Respondió».",
  quiere: "Aquí llegan los que tocan «Quiero esta web» o aceptan la propuesta.",
  cliente: "El primero está cerca.",
};

function Tarjeta({ p, e }: { p: VistaProspecto; e: Etapa }) {
  const chat = p.whatsapp?.split("?")[0];
  const wa = e === "nuevo" ? p.whatsapp : e === "escrito" && p.tocaSeguimiento ? p.whatsappSeguimiento : p.acepto ? p.whatsappCobro : chat;
  const texto = e === "nuevo" ? "Escribirle" : e === "escrito" && p.tocaSeguimiento ? "Recordatorio" : p.acepto ? "Cobrar el 50 %" : "WhatsApp";
  return (
    <li className="rounded-2xl bg-white p-3.5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
      <p className="text-[14.5px] font-medium leading-snug">{p.nombreMuestra}</p>
      <p className="mt-0.5 text-[12px] text-suave">{p.rubro} · {p.ciudad}</p>
      <p className="mt-2 text-[13px] leading-snug text-medio">{senal(p, e)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {wa && (e === "nuevo"
          // Escribir por primera vez se hace desde la tanda: ahí se anota como «Contactado» y cuenta para el tope del día.
          ? <Link href="/estudio/clientes/tanda" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-3.5 text-[13px] font-medium text-white md:min-h-9">En la tanda →</Link>
          : <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-[#25d366] px-3.5 text-[13px] font-medium text-black md:min-h-9">{texto}</a>)}
        {p.acepto && !p.proyecto && <a href={p.pedido} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-3.5 text-[13px] font-medium text-white md:min-h-9">Crear el pedido</a>}
        <a href={p.muestra} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] text-medio shadow-[inset_0_0_0_1px_var(--color-borde)] md:min-h-9">Muestra ↗</a>
      </div>
    </li>
  );
}

export default async function Pagina() {
  await exigirEstudio();
  let lista: VistaLista = listaVacia();
  let falla = "";
  try { lista = vistaLista(await leerProspectos(), await baseUrl()); } catch (e) { falla = (e as Error).message; }
  const descartados = lista.prospectos.filter((p) => !p.etapa).length;
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <div className="flex items-center gap-4">
        <Cara id="iman" tam={56} flota />
        <div>
          <p className="text-[13px] text-suave">Ventas · Imán</p>
          <h1 className={`${serif} text-[40px] leading-none`}>Tablero.</h1>
        </div>
      </div>
      <PestanasClientes actual="tablero" nuevos={lista.prospectos.length} />
      {falla && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la lista: {falla}</p>}
      <div className="mt-6"><Marcador lista={lista} tira /></div>
      <p className="mt-4 text-[13px] text-suave">Avanzan solos al abrir su muestra o aceptar. «Respondió», «Reunión» y «Cliente» los marcas tú.</p>

      <div data-tablero className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 md:-mx-10 md:px-10 xl:snap-none">
        {ETAPAS.map(([e, nombre]) => {
          const todos = lista.prospectos.filter((p) => p.etapa === e).sort(orden[e]);
          const vista = todos.slice(0, A_LA_VISTA), resto = todos.slice(A_LA_VISTA);
          return (
            <section key={e} id={`etapa-${e}`} aria-labelledby={`t-etapa-${e}`} data-etapa={e} className="flex w-[82vw] max-w-[320px] shrink-0 snap-center scroll-mt-6 flex-col rounded-[20px] bg-[#f1ede6] p-2.5 sm:w-[280px] xl:w-auto xl:min-w-[164px] xl:max-w-none xl:flex-1">
              <h2 id={`t-etapa-${e}`} className="flex items-baseline justify-between gap-2 px-2 pb-2.5 pt-1.5">
                <span className="text-[13.5px] font-medium">{nombre}</span>
                <span className={`${serif} text-[22px] leading-none`}>{todos.length}</span>
              </h2>
              {todos.length === 0 ? <p className="rounded-2xl border border-dashed border-borde px-3.5 py-5 text-[13px] leading-snug text-medio">{VACIA[e]}</p> : (
                <>
                  <ul className="grid gap-2">{vista.map((p) => <Tarjeta key={p.id} p={p} e={e} />)}</ul>
                  {resto.length > 0 && (
                    <details className="mt-2">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-2xl text-[13px] text-medio hover:bg-white/60">Ver {resto.length} más</summary>
                      <ul className="mt-2 grid gap-2">{resto.map((p) => <Tarjeta key={p.id} p={p} e={e} />)}</ul>
                    </details>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-suave">{descartados ? `${descartados} descartados no aparecen aquí. ` : ""}<Link href="/estudio/clientes/nuevos" className="underline underline-offset-4">Ver la lista completa</Link></p>
    </div>
  );
}
