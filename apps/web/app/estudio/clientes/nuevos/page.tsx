// El escritorio de Imán (sistema/66): negocios con buena fama y mala web, listos para escribirles.
import { clavePlaces, GRUPOS_RUBRO, CIUDADES, leerProspectos, TANDA_DIARIA } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { vistaLista, type VistaLista } from "@/lib/clientes";
import { Cara } from "@/components/estudio/piezas";
import { ClientesNuevos } from "@/components/estudio/clientes/ClientesNuevos";
import { PestanasClientes } from "@/components/estudio/clientes/PestanasClientes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes nuevos — Estudio", robots: { index: false } };

export default async function Pagina() {
  await exigirEstudio();
  let inicial: VistaLista = { firma: "", prospectos: [] };
  let falla = "";
  try { inicial = vistaLista(await leerProspectos()); } catch (e) { falla = (e as Error).message; }
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <div className="flex items-center gap-4">
        <Cara id="iman" tam={56} flota />
        <div>
          <p className="text-[13px] text-suave">Imán · Ventas</p>
          <h1 className={`${serif} text-[40px] leading-none`}>Clientes nuevos.</h1>
        </div>
      </div>
      <PestanasClientes actual="nuevos" nuevos={inicial.prospectos.length} />
      <p className="mt-5 max-w-2xl text-[15px] text-medio">
        Imán busca en Google Maps negocios con buenas reseñas y una web que no les hace justicia: sin web, solo con Instagram, rota o que no sirve en celular. Los ordena por oportunidad y te deja el mensaje listo para WhatsApp. Cuando alguien responde, lo conviertes en pedido.
      </p>
      {falla && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la lista: {falla}</p>}
      <ClientesNuevos
        inicial={inicial}
        hayClave={!!clavePlaces()}
        grupos={GRUPOS_RUBRO.map((g) => ({ id: g.id, nombre: g.nombre, busquedas: [...g.busquedas] }))}
        ciudades={Object.keys(CIUDADES)}
        tope={TANDA_DIARIA}
      />
    </div>
  );
}
