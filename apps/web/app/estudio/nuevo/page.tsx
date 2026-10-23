import Link from "next/link";
import { boton, botonLleno, campo, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { accionNuevoProyecto } from "../acciones";
import { Enviar } from "./Enviar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Nuevo proyecto — Estudio", robots: { index: false } };

// Jay o Luna cuentan lo que hablaron con el cliente, en sus palabras. Atlas decide el resto.
export default async function NuevoProyecto({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const yo = await exigirEstudio();
  const { error } = await searchParams;
  return (
    <main className={`${lateral} pb-20`}>
      <p className="pt-4"><Link href="/estudio" className={etiqueta}>← Estudio</Link></p>
      <h1 className="display mt-2 text-[clamp(56px,9vw,140px)]">Nuevo proyecto</h1>
      <p className="max-w-xl text-[17px] text-gris">
        Cuéntale a Atlas lo que hablaste con el cliente, como se lo contarías a un socio. Él decide qué hace falta y quién trabaja. Nadie empieza hasta que tú lo digas.
      </p>
      {error && <p role="alert" className="mt-6 max-w-2xl rounded-2xl bg-[#fde8e4] p-4 text-[#8a1c0c]">{error}</p>}

      <form action={accionNuevoProyecto} className="mt-10 grid max-w-2xl gap-6">
        <label className="grid gap-2">
          <span className={etiqueta}>Lo que hablaron</span>
          <textarea
            name="texto"
            required
            minLength={20}
            rows={12}
            autoFocus
            className={`${campo} text-[17px] leading-relaxed`}
            placeholder={
              "Ej.: Gabriela es odontóloga estética en Cuenca. Quiere una web para su consultorio, mucho más elegante que la de su competencia, nada de azul clínico. Ya tiene logo. Pacientes de 30 a 50. Agenda por WhatsApp. Le gusta https://… Lo necesita antes de diciembre, presupuesto unos 2.000."
            }
          />
          <span className="text-[13px] text-gris">Pega aquí los enlaces que te pasó (su web, su Instagram, lo que le gusta): los agentes que investigan y diseñan los abren.</span>
        </label>

        <label className="grid gap-2">
          <span className={etiqueta}>Cliente (opcional)</span>
          <input name="cliente" maxLength={80} placeholder="Si no lo pones, Atlas lo saca del texto" className={campo} />
        </label>

        <label className="grid gap-2">
          <span className={etiqueta}>Imágenes y archivos (opcional)</span>
          <input type="file" name="archivos" multiple accept="image/*,.pdf,.svg,.txt,.md,.docx" className="text-[15px]" />
          <span className="text-[13px] text-gris">Logo, fotos, capturas de lo que le gusta. Mira, Orla y los visuales las ven. En línea: hasta 4 MB en total.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Enviar className={botonLleno} />
          <Link href="/estudio" className={boton}>Cancelar</Link>
          <span className="text-[13px] text-gris">Queda a nombre de {yo === "luna" ? "Luna" : "Jay"}.</span>
        </div>
      </form>
    </main>
  );
}
