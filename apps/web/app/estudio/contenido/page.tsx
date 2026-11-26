// Contenido (sistema/96): los meses que armó Faro y el formulario para pedir uno nuevo.
import Link from "next/link";
import { listarMeses, mesPorDefecto, nombreMes, resumenMes, type MesContenido } from "@anonymo/pipeline";
import { exigirEstudio, serif, titulo } from "@/lib/estudio";
import { cartera } from "@/lib/cartera";
import { faltaParaMes } from "@/lib/contenido";
import { ArmarMes } from "@/components/estudio/contenido/ArmarMes";
import { Cara } from "@/components/estudio/piezas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contenido — Estudio", robots: { index: false } };

/** El mes que viene y los dos siguientes. */
function mesesParaElegir() {
  const [a, m] = mesPorDefecto().split("-").map(Number) as [number, number];
  return [0, 1, 2].map((i) => { const d = new Date(Date.UTC(a, m - 1 + i, 1)); const v = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; return { valor: v, nombre: nombreMes(v) }; });
}

export default async function Pagina({ searchParams }: { searchParams: Promise<{ cliente?: string; pedido?: string }> }) {
  await exigirEstudio();
  const { cliente, pedido } = await searchParams;
  let meses: MesContenido[] = [];
  let falla = "";
  try { meses = await listarMeses(); } catch (e) { falla = (e as Error).message; }
  const { fichas } = await cartera();
  const clientes = fichas.filter((f) => f.guardada).map((f): { id: string; nombre: string; falta: string; enlace?: string } => ({ id: f.id, nombre: f.nombre, falta: faltaParaMes(f) })).concat(fichas.some((f) => (f.id === "anonymo" || f.id === "unmake") && f.guardada) ? [] : [{ id: "unmake", nombre: "Unmake", falta: "Unmake todavía no tiene ficha. Créala en Clientes con el nombre Unmake y toca «Buscar datos»: ya trae lo que sabe el estudio.", enlace: "/estudio/clientes" }])
    .sort((a, b) => Number(!!a.falta) - Number(!!b.falta) || a.nombre.localeCompare(b.nombre, "es"));
  return (
    <div className="px-5 py-7 md:px-10">
      <div className="flex items-center gap-4">
        <Cara id="faro" tam={56} flota />
        <div>
          <p className="text-[13px] text-suave">Calendario del mes · Faro</p>
          <h1 className={`${titulo}`}>Contenido.</h1>
        </div>
      </div>
      <p className="mt-3 hidden max-w-2xl text-[14px] text-medio md:block">Faro arma el mes de un cliente; tú apruebas o pides cambios.</p>
      <h2 className="mt-8 text-[13px] text-suave">Armar un mes</h2>
      <div className="mt-2 max-w-3xl"><ArmarMes clientes={clientes} meses={mesesParaElegir()} inicial={cliente} pedidoInicial={pedido} /></div>
      <h2 className="mt-10 text-[13px] text-suave">Meses</h2>
      {falla && <p role="alert" className="mt-2 text-[14px] text-[#a33a0b]">No se pudo leer la lista: {falla}</p>}
      {!meses.length && !falla && <p className="mt-2 text-[14px] text-medio">Todavía no hay meses armados.</p>}
      <ul className="mt-2 grid max-w-3xl gap-2">
        {meses.map((m) => {
          const r = resumenMes(m);
          return (
            <li key={m.id}>
              <Link href={`/estudio/contenido/${m.id}`} data-mes={m.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(26,24,22,.06)] transition hover:shadow-[0_0_0_1px_rgba(26,24,22,.2)]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{m.nombre}</span>
                  <span className="block text-[12px] capitalize text-suave">{nombreMes(m.mes)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${r.aprobadas === r.total ? "bg-[#e6f6ee] text-[#17714a]" : "bg-hueso text-medio"}`}>{r.aprobadas} de {r.total} aprobadas</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
