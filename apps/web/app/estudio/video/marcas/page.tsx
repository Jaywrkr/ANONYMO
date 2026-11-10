// Kits de marca del departamento de video (sistema/65): color, logo y música de cada cliente.
import Link from "next/link";
import { listarKits, type KitMarca } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { kitParaVista } from "@/lib/video";
import { KitsMarca } from "@/components/estudio/video/KitsMarca";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marcas — Video — Estudio", robots: { index: false } };

export default async function Pagina() {
  await exigirEstudio();
  let kits: KitMarca[] = [];
  let falla = "";
  try { kits = await listarKits(); } catch (e) { falla = (e as Error).message; }
  return (
    <div className="px-5 py-7 md:px-10">
      <Link href="/estudio/video" className="inline-flex min-h-11 items-center text-[13px] text-medio hover:text-tinta">← Videos</Link>
      <h1 className={`${serif} text-[40px] leading-none`}>Marcas.</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-medio">El color, el logo y la música de cada cliente. Se eligen en cada video para poner el logo en la esquina, cerrar con el logo y sumar la música, que baja sola cuando alguien habla.</p>
      {falla && <p role="alert" className="mt-3 text-[14px] text-[#a33a0b]">No se pudo leer la lista: {falla}</p>}
      <KitsMarca inicial={kits.map(kitParaVista)} />
    </div>
  );
}
