// La cartera de clientes (sistema/70): cada cliente con todo lo suyo, lo más movido arriba.
import Link from "next/link";
import { leerProspectos, resumenFicha } from "@anonymo/pipeline";
import { exigirEstudio, serif, campo, botonLleno } from "@/lib/estudio";
import { cartera } from "@/lib/cartera";
import { Cara } from "@/components/estudio/piezas";
import { PestanasClientes } from "@/components/estudio/clientes/PestanasClientes";
import { accionNuevaFicha } from "@/app/estudio/cliente/acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes — Estudio", robots: { index: false } };

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", timeZone: "America/Guayaquil" }) : "");

export default async function Pagina() {
  await exigirEstudio();
  const [{ fichas, fallas }, nuevos] = await Promise.all([cartera(), leerProspectos().then((l) => Object.keys(l.prospectos).length).catch(() => undefined)]);
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <div className="flex items-center gap-4">
        <Cara id="atlas" tam={56} flota />
        <div>
          <p className="text-[13px] text-suave">Cada cliente en un solo lugar · Atlas</p>
          <h1 className={`${serif} text-[40px] leading-none`}>Clientes.</h1>
        </div>
      </div>
      <PestanasClientes actual="cartera" cartera={fichas.length} nuevos={nuevos} />
      <p className="mt-5 hidden max-w-2xl text-[15px] text-medio md:block">
        Cada ficha junta lo que hay de un cliente: de dónde vino, sus pedidos y proyectos, sus videos, su marca, su contacto y tus notas. Se arma sola con el nombre del cliente; los prospectos de Imán entran cuando responden.
      </p>
      {fallas.length > 0 && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">Una parte no respondió y puede faltar algo: {fallas.join(" · ")}</p>}

      <ul className="mt-6 grid gap-2" aria-label="Clientes">
        {!fichas.length && <li className="py-8 text-[14px] text-medio">Todavía no hay clientes. Aparecen solos al crear un pedido, subir un video para alguien o cuando un prospecto responde.</li>}
        {fichas.map((f) => (
          <li key={f.id}>
            <Link href={`/estudio/cliente/${f.id}`} className="flex min-h-16 items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(26,24,22,.06)] transition hover:shadow-[0_0_0_1px_rgba(26,24,22,.2)]">
              {/* Las iniciales (sistema/75): el cuadro vacío no decía nada. Con kit de marca, toma su color. */}
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-medium" style={{ background: f.kits[0]?.color ?? "#e9e4dc", color: f.kits[0]?.color ? "#fff" : "#5d5a55" }}>{f.nombre.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || f.nombre.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{f.nombre}</span>
                <span className="block truncate text-[13px] text-suave">{resumenFicha(f)}</span>
              </span>
              <span className="hidden shrink-0 gap-3 text-[12px] text-medio sm:flex">
                {f.proyectos.length > 0 && <span>{f.proyectos.length} {f.proyectos.length === 1 ? "proyecto" : "proyectos"}</span>}
                {f.videos.length > 0 && <span>{f.videos.length} {f.videos.length === 1 ? "video" : "videos"}</span>}
                {f.prospecto && <span>vino de Imán</span>}
              </span>
              <span className="shrink-0 text-[12px] text-suave">{fecha(f.actualizado)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <details className="mt-8 max-w-lg">
        <summary className="min-h-11 cursor-pointer text-[14px] text-medio">Agregar un cliente a mano</summary>
        <form action={accionNuevaFicha} className="mt-2 flex flex-wrap gap-2">
          <input name="nombre" required maxLength={80} placeholder="Nombre del cliente" className={`${campo} min-w-0 flex-1`} />
          <button className={botonLleno} data-trabajando="Creando la ficha…">Crear ficha</button>
        </form>
      </details>
    </div>
  );
}
