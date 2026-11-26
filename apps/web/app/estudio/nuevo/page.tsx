import Link from "next/link";
import { botonLleno, botonSuave, campo, exigirEstudio, serif, titulo } from "@/lib/estudio";
import { accionNuevoProyecto } from "../acciones";
import { Enviar } from "./Enviar";
import { Contar } from "@/components/estudio/Contar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { Cara } from "@/components/estudio/piezas";
import { nubeActiva, saberDe } from "@anonymo/pipeline";
import { ElegirCliente, type OpcionCliente } from "@/components/estudio/ElegirCliente";
import { clientesCaja, proyectoDe } from "@/lib/caja-ejecutar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Nuevo pedido — Estudio", robots: { index: false } };

// Jay o Luna cuentan lo que hablaron con el cliente, en sus palabras. Atlas decide el resto.
export default async function NuevoProyecto({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; cliente?: string; ficha?: string; prospecto?: string }> }) {
  const yo = await exigirEstudio();
  const { error, q, cliente, ficha, prospecto } = await searchParams;
  const enLinea = nubeActiva();
  // Para quién (sistema/109): todas las fichas y los clientes nuevos de Imán, para elegir de la lista.
  const clientes: OpcionCliente[] = (await clientesCaja().catch(() => []))
    .map((f) => ({ id: f.id, nombre: f.nombre, alias: f.guardada?.alias, prospecto: f.prospecto?.id, sabe: Object.keys(saberDe(f)), detalle: f.prospecto && !f.proyectos.length ? "Cliente nuevo de Imán" : proyectoDe(f) ? "Con proyecto" : "Con ficha" }))
    .sort((a, b) => Number(!!a.prospecto) - Number(!!b.prospecto) || a.nombre.localeCompare(b.nombre, "es"));
  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-center gap-4">
          <Cara id="atlas" tam={56} flota />
          <div>
            <p className="text-[13px] text-suave">Nuevo pedido · queda a nombre de {yo === "luna" ? "Luna" : "Jay"}</p>
            <h1 className={`${titulo}`}>Cuéntale a Atlas.</h1>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-[15px] text-medio">Lo que hablaste con el cliente, como se lo contarías a un socio.</p>
        {/* Cómo sigue, en una línea (sistema/111). */}
        <ol aria-label="Cómo sigue" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-medio">
          {["Eliges y cuentas", "Atlas arma el plan", "Tú dices «que empiecen»"].map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-suave">→</span>}
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i === 0 ? "bg-tinta text-white" : "bg-[#ece6dc] text-medio"}`}>{i + 1}</span>
              <span className={i === 0 ? "text-tinta" : ""}>{t}</span>
            </li>
          ))}
        </ol>
        {error && <p role="alert" className="mt-6 rounded-2xl bg-[#fde8e4] p-4 text-[15px] text-[#8a1c0c]">{error}</p>}

        <form action={accionNuevoProyecto} className="mt-8 grid gap-7">
          <ElegirCliente clientes={clientes} inicial={{ ficha, cliente, prospecto }} />
          <Contar inicial={q?.trim() ?? ""} foco={!!(ficha || cliente)} />
          <div className="grid content-start gap-2">
            <span className="text-[13px] font-medium">Imágenes y archivos <span className="font-normal text-suave">· opcional</span></span>
            <ZonaArchivos nube={enLinea} texto="Logo, fotos o capturas de lo que le gusta" />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-6">
            <Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto="Que Atlas arme el plan →" trabajando="Atlas está leyendo el pedido…" largo />
            <Link href="/estudio" className={botonSuave}>Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
