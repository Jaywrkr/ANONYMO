// La tanda de celular (sistema/72): Imán propone a quién escribir hoy, de uno en uno, sin pasar del tope.
import Link from "next/link";
import { leerProspectos, TANDA_DIARIA } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { vistaLista, type VistaLista } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";
import { clavePublicaAvisos } from "@/lib/avisos-celular";
import { Cara } from "@/components/estudio/piezas";
import { Tanda } from "@/components/estudio/clientes/Tanda";

export const dynamic = "force-dynamic";
export const metadata = { title: "La tanda de hoy — Estudio", robots: { index: false } };

export default async function Pagina() {
  await exigirEstudio();
  let inicial: VistaLista = { firma: "", numero: "", prospectos: [] };
  let falla = "";
  try { inicial = vistaLista(await leerProspectos(), await baseUrl()); } catch (e) { falla = (e as Error).message; }
  return (
    <div className="px-4 pb-20 pt-6 md:px-10">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <Cara id="iman" tam={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-suave">Imán · Ventas</p>
          <h1 className={`${serif} text-[34px] leading-none`}>La tanda de hoy.</h1>
        </div>
        <Link href="/estudio/clientes/nuevos" className="text-[13px] text-medio underline underline-offset-4">Ver la lista</Link>
      </div>
      {falla && <p role="alert" className="mx-auto mt-4 max-w-xl rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la lista: {falla}</p>}
      <div className="mt-6"><Tanda inicial={inicial.prospectos} tope={TANDA_DIARIA} clavePublica={clavePublicaAvisos()} /></div>
    </div>
  );
}
