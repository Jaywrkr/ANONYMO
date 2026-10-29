import Link from "next/link";
import { boton, botonLleno, campo, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { accionNuevoProyecto } from "../acciones";
import { Enviar } from "./Enviar";
import { Contar } from "@/components/estudio/Contar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { nubeActiva } from "@anonymo/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Nuevo proyecto — Estudio", robots: { index: false } };

// Jay o Luna cuentan lo que hablaron con el cliente, en sus palabras. Atlas decide el resto.
export default async function NuevoProyecto({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const yo = await exigirEstudio();
  const { error } = await searchParams;
  const enLinea = nubeActiva();
  return (
    <main className={`${lateral} pb-20`}>
      <p className="pt-4"><Link href="/estudio" className={etiqueta}>← Estudio</Link></p>
      <h1 className="display mt-2 text-[clamp(56px,9vw,140px)]">Nuevo proyecto</h1>
      <p className="max-w-xl text-[17px] text-gris">
        Cuéntale a Atlas lo que hablaste con el cliente, como se lo contarías a un socio. Él decide qué hace falta y quién trabaja. Nadie empieza hasta que tú lo digas.
      </p>
      {error && <p role="alert" className="mt-6 max-w-2xl rounded-2xl bg-[#fde8e4] p-4 text-[#8a1c0c]">{error}</p>}

      <form action={accionNuevoProyecto} className="mt-10 grid max-w-2xl gap-6">
        <Contar />

        <label className="grid gap-2">
          <span className={etiqueta}>Cliente (opcional)</span>
          <input name="cliente" maxLength={80} placeholder="Si no lo pones, Atlas lo saca del texto" className={campo} />
        </label>

        <div className="grid gap-2">
          <span className={etiqueta}>Imágenes y archivos (opcional)</span>
          <ZonaArchivos limiteMB={enLinea ? 4 : undefined} texto="Arrastra aquí el logo, fotos o capturas de lo que le gusta" />
          <span className="text-[13px] text-gris">Mira, Orla y los visuales ven las imágenes. Los enlaces del texto los abren Sonda, Nova, Orla y Vector.</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Enviar className={botonLleno} />
          <Link href="/estudio" className={boton}>Cancelar</Link>
          <span className="text-[13px] text-gris">Queda a nombre de {yo === "luna" ? "Luna" : "Jay"}.</span>
        </div>
      </form>
    </main>
  );
}
