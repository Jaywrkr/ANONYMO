import Link from "next/link";
import { botonLleno, botonSuave, campo, exigirEstudio, serif } from "@/lib/estudio";
import { accionNuevoProyecto } from "../acciones";
import { Enviar } from "./Enviar";
import { Contar } from "@/components/estudio/Contar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { Cara } from "@/components/estudio/piezas";
import { nubeActiva } from "@anonymo/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Nuevo pedido — Estudio", robots: { index: false } };

// Jay o Luna cuentan lo que hablaron con el cliente, en sus palabras. Atlas decide el resto.
export default async function NuevoProyecto({ searchParams }: { searchParams: Promise<{ error?: string; q?: string }> }) {
  const yo = await exigirEstudio();
  const { error, q } = await searchParams;
  const enLinea = nubeActiva();
  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-center gap-4">
          <Cara id="atlas" tam={56} flota />
          <div>
            <p className="text-[13px] text-suave">Nuevo pedido · queda a nombre de {yo === "luna" ? "Luna" : "Jay"}</p>
            <h1 className={`${serif} text-[clamp(36px,4.4vw,56px)] leading-[1]`}>Cuéntale a Atlas.</h1>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-medio">
          Lo que hablaste con el cliente, como se lo contarías a un socio. Atlas decide qué hace falta y quién trabaja. Nadie empieza hasta que tú lo digas.
        </p>
        <ol aria-label="Cómo sigue" className="mt-6 grid gap-2 sm:grid-cols-3">
          {[["1", "Lo cuentas", "Aquí, en tus palabras."], ["2", "Atlas arma el plan", "Quién trabaja, qué entrega y cuánto cuesta."], ["3", "Tú dices «que empiecen»", "Nadie trabaja antes."]].map(([n, t, d], i) => (
            <li key={n} className={`rounded-2xl p-4 ${i === 0 ? "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06)]" : "bg-[#f4f1eb]"}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${i === 0 ? "bg-tinta text-white" : "bg-white text-medio"}`}>{n}</span>
              <p className="mt-2 text-[14px] font-medium">{t}</p>
              <p className="text-[13px] text-medio">{d}</p>
            </li>
          ))}
        </ol>
        {error && <p role="alert" className="mt-6 rounded-2xl bg-[#fde8e4] p-4 text-[15px] text-[#8a1c0c]">{error}</p>}

        <form action={accionNuevoProyecto} className="mt-8 grid gap-7">
          <Contar inicial={q?.trim() ?? ""} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid content-start gap-2">
              <span className="text-[13px] font-medium">Cliente <span className="font-normal text-suave">· opcional</span></span>
              <input name="cliente" maxLength={80} placeholder="Si no lo pones, Atlas lo saca del texto" className={campo} />
            </label>
            <div className="grid content-start gap-2">
              <span className="text-[13px] font-medium">Imágenes y archivos <span className="font-normal text-suave">· opcional</span></span>
              <ZonaArchivos nube={enLinea} texto="Logo, fotos o capturas de lo que le gusta" />
            </div>
          </div>
          <p className="-mt-3 text-[12px] text-suave">Mira, Orla y los visuales ven las imágenes. Los enlaces del texto los abren Sonda, Nova, Orla y Vector.</p>

          <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-6">
            <Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto="Que Atlas arme el plan →" trabajando="Atlas está leyendo el pedido…" largo />
            <Link href="/estudio" className={botonSuave}>Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
