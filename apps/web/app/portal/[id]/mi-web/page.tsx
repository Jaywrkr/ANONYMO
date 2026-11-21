// «Mi web» en el portal del cliente (sistema/98): cambia textos, fotos y su asistente; se publica al guardar.
import "@fontsource/instrument-serif/latin-400.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { existe, leerMiWeb, leerProyecto, leerVisitas, mesAnterior, mesDe, nombreDelMes, PLANES, resumenVisitas, revisarMiWeb, tokenValido } from "@anonymo/pipeline";
import { InformeWeb } from "@/components/estudio/InformeWeb";
import { portalActivo, serif } from "@/lib/estudio";
import { traer } from "@/lib/nube";
import { EditorMiWeb } from "@/components/portal/EditorMiWeb";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi web — Anonymo", robots: { index: false, follow: false } };

export default async function MiWeb({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!/^[a-z0-9-]+$/.test(id) || !portalActivo()) notFound();
  await traer(id);
  if (!existe(id) || !tokenValido(id, t)) notFound();
  const e = leerMiWeb(id);
  if (!e?.activa) notFound();
  const p = leerProyecto(id);
  const plan = PLANES[e.plan];
  const paginas = revisarMiWeb(id).map(({ pagina, editables, fotos, cambios }) => ({ pagina, editables, fotos, cambios }));
  const puedeDeshacer = e.historia.some((h) => h.antes);
  const mes = mesDe();
  const [datos, antes] = await Promise.all([leerVisitas(id, mes), leerVisitas(id, mesAnterior(mes))]);
  const informe = resumenVisitas(datos, Object.keys(antes.dias).length ? antes : undefined);
  return (
    <main className="min-h-dvh bg-[#f6f3ee] px-5 pb-24 pt-8 text-tinta md:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href={`/portal/${id}?t=${encodeURIComponent(t!)}`} className="inline-flex min-h-11 items-center text-[13px] text-medio hover:text-tinta">← {p.pedido.cliente}</Link>
        <h1 className={`${serif} mt-2 text-[clamp(38px,6vw,56px)] leading-none`}>Mi web</h1>
        <p className="mt-3 text-[15px] text-medio">Plan {plan.nombre}. {plan.editaCliente ? "Cambia lo que quieras: al guardar, se publica al instante. Si te equivocas, deshaces." : "Tu plan incluye cambios hechos por nosotros: escríbenos qué quieres cambiar y lo hacemos."}</p>
        <p className="mt-3"><a href={`/w/${id}/index.html`} target="_blank" rel="noopener" data-ver-web className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[14px] shadow-[inset_0_0_0_1px_var(--color-borde)]">Ver mi web ↗</a></p>
        <section aria-label="Tu web este mes" data-informe-cliente className="mt-8 rounded-[20px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6">
          <h2 className="text-[17px] font-medium">Tu web en {nombreDelMes(mes)}</h2>
          <p className="mb-4 mt-1 text-[13.5px] text-medio">Cuántas personas la vieron y cuántas te escribieron o llamaron desde ella.</p>
          <InformeWeb mes={mes} datos={datos} r={informe} />
        </section>
        {plan.editaCliente ? (
          <EditorMiWeb id={id} t={t!} paginas={paginas} puedeDeshacer={puedeDeshacer} asistente={plan.asistente ? e.asistente : undefined} conIA={plan.asistente === "ia"} />
        ) : (
          <section className="mt-8 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
            <p className="text-[15px] font-medium">¿Quieres cambiarla tú mismo?</p>
            <p className="mt-1 text-[14px] text-medio">Con el plan {PLANES.autonomo.nombre} (USD {PLANES.autonomo.precio} al mes) cambias textos, fotos, horario y precios cuando quieras, y tu web tiene un asistente que responde las preguntas de tus clientes. Pídeselo a Jay o a Luna.</p>
          </section>
        )}
      </div>
    </main>
  );
}
