// Galería de plantillas de Unmake (sistema/115): todas las plantillas nuevas con ejemplos, para aprobarlas
// antes de que Faro las use. Las imágenes son capturas reales del trabajo del estudio (public/trabajo).
import Link from "next/link";
import { exigirEstudio, serif } from "@/lib/estudio";
import { ejemplosUnmake, laminasUnmake, PLANTILLAS_UNMAKE } from "@anonymo/pipeline/src/video/plantillas-unmake.ts";
import { Vista } from "@/components/estudio/contenido/PlannerMes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plantillas de Unmake — Estudio", robots: { index: false } };

export default async function Pagina() {
  await exigirEstudio();
  const piezas = ejemplosUnmake();
  // Un ejemplo a propósito con un texto demasiado largo, para ver cómo avisa la revisión.
  const largo = laminasUnmake({ id: "aviso", plantilla: "frase", serie: "Postura", nSerie: 5, lamina: { titulo: "una frase que es demasiado larga para una sola lámina porque quiere decir todo a la vez y al final no dice nada, y además sigue y sigue sin parar nunca" } })[0]!;
  return (
    <div className="px-5 py-7 md:px-10">
      <p><Link href="/estudio/contenido" className="text-[13px] text-medio underline-offset-4 hover:underline">← Contenido</Link></p>
      <h1 className={`${serif} mt-3 text-[40px] leading-none`}>Plantillas de Unmake.</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-medio">El arte muestra el trabajo: la primera lámina es una imagen real y el texto acompaña. Los textos son de ejemplo. Dile a Claude cuáles apruebas y qué cambiar; Faro las usa cuando estén aprobadas.</p>
      <div className="mt-8 flex flex-col gap-10">
        {piezas.map((p) => {
          const laminas = laminasUnmake(p);
          const info = PLANTILLAS_UNMAKE[p.plantilla];
          const avisos = [...new Set(laminas.flatMap((l) => l.avisos))];
          return (
            <section key={p.id} data-plantilla={p.plantilla}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-[18px]">{info.nombre}</h2>
                <span className="text-[13px] text-suave">{info.formato === "carrusel" ? `carrusel de ${laminas.length}` : info.formato === "reel" ? "portada de reel" : "post"}</span>
                <span className={`text-[13px] ${avisos.length ? "text-[#c4321f]" : "text-[#1f8a5b]"}`} data-revision>{avisos.length ? avisos.join(" ") : "Revisión: todo entra"}</span>
              </div>
              <p className="mt-1 max-w-2xl text-[14px] text-medio">{info.para}</p>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {laminas.map((l, i) => <Vista key={l.nombre} a={l} ancho={l.alto > 1400 ? 180 : 240} titulo={`${info.nombre}, lámina ${i + 1}`} perezosa />)}
              </div>
            </section>
          );
        })}
        <section data-plantilla="aviso">
          <div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-[18px]">Así avisa la revisión</h2><span className="text-[13px] text-[#c4321f]" data-revision>{largo.avisos.join(" ")}</span></div>
          <p className="mt-1 max-w-2xl text-[14px] text-medio">Si un texto no entra ni con la letra más chica permitida, no se corta: queda marcado en rojo y la pieza muestra el aviso para acortarlo.</p>
          <div className="mt-3"><Vista a={largo} ancho={240} titulo="Ejemplo de aviso" /></div>
        </section>
      </div>
    </div>
  );
}
