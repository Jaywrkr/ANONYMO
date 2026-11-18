// Estado del sistema (sistema/78): en una pantalla, qué está bien, qué falta y qué falló. Para no enterarse tarde.
import { clavePlaces, diaCuenca, leerCelulares, leerEstado, leerProspectos, nubeActiva } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { CopiaAhora } from "@/components/estudio/CopiaAhora";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado del sistema — Estudio", robots: { index: false } };

/** El cupo diario que Jay puso en Google Cloud (Places API (New) → Cuotas). Si lo cambia allá, que lo cambie aquí con GOOGLE_CUPO_DIA. */
const cupo = () => Number(process.env.GOOGLE_CUPO_DIA) || 200;
const hace = (iso?: string) => {
  if (!iso) return "nunca";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`;
};

type Fila = { titulo: string; ok: boolean; texto: string; arreglo?: string };

export default async function Estado() {
  await exigirEstudio();
  const filas: Fila[] = [];

  const t0 = Date.now();
  let nubeOk = false;
  let nubeTexto = "";
  try { await leerProspectos(); nubeOk = true; nubeTexto = `Responde en ${Date.now() - t0} ms.`; } catch (e) { nubeTexto = (e as Error).message; }
  filas.push({ titulo: "Nube privada", ok: nubeActiva() && nubeOk, texto: nubeActiva() ? nubeTexto : "No está activa: en línea los datos se perderían.", arreglo: nubeOk ? undefined : "Revisa SUPABASE_URL y SUPABASE_SERVICE_KEY en Vercel." });

  const estado = await leerEstado().catch(() => ({ errores: [], google: { dia: "", consultas: 0 }, respaldo: undefined }));
  const usadas = estado.google.dia === diaCuenca() ? estado.google.consultas : 0;
  filas.push({ titulo: "Google Maps", ok: !!clavePlaces() && usadas < cupo(), texto: clavePlaces() ? `${usadas} de ${cupo()} consultas hoy. Una búsqueda de Salud usa unas 6.` : "Falta la clave.", arreglo: !clavePlaces() ? "Pon GOOGLE_PLACES_API_KEY en Vercel." : usadas >= cupo() ? "Se acabó el cupo de hoy: mañana sigue solo." : undefined });

  filas.push({ titulo: "IA (Anthropic)", ok: !!process.env.ANTHROPIC_API_KEY, texto: process.env.ANTHROPIC_API_KEY ? "Clave puesta." : "Sin clave: los agentes trabajan en modo simulado.", arreglo: process.env.ANTHROPIC_API_KEY ? undefined : "Pon ANTHROPIC_API_KEY en Vercel." });

  let celulares = 0;
  try { celulares = (await leerCelulares()).length; } catch { /* se muestra como cero */ }
  const vapid = !!(process.env.VAPID_PUBLICA && process.env.VAPID_PRIVADA);
  filas.push({ titulo: "Avisos al celular", ok: vapid && celulares > 0, texto: vapid ? `${celulares} ${celulares === 1 ? "celular anotado" : "celulares anotados"}.` : "Faltan las claves.", arreglo: !vapid ? "Pon VAPID_PUBLICA y VAPID_PRIVADA en Vercel." : celulares === 0 ? "Clientes → Nuevos → Ajustes → «Avisarme en este celular»." : undefined });

  const r = estado.respaldo;
  const reciente = !!r && Date.now() - Date.parse(r.cuando) < 36 * 3600_000;
  filas.push({ titulo: "Copia diaria", ok: reciente, texto: r ? `Última ${hace(r.cuando)}: ${r.archivos} archivos (ranura ${r.ranura}).` : "Todavía no hay ninguna copia.", arreglo: !process.env.CRON_SECRET ? "Para que se haga sola cada noche, pon CRON_SECRET en Vercel (cualquier texto largo)." : !reciente ? "Haz una copia ahora y revisa los errores de abajo." : undefined });

  const malas = filas.filter((f) => !f.ok).length;
  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px] text-suave">Mejorar el estudio</p>
      <h1 className={`${serif} text-[40px] leading-none`}>{malas ? `${malas} ${malas === 1 ? "cosa necesita" : "cosas necesitan"} atención.` : "Todo en orden."}</h1>

      <ul className="mt-6 grid max-w-3xl gap-2" aria-label="Estado">
        {filas.map((f) => (
          <li key={f.titulo} className="flex gap-4 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
            <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${f.ok ? "bg-[#2bb673]" : "bg-urgente"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{f.titulo} <span className="sr-only">{f.ok ? "bien" : "necesita atención"}</span></span>
              <span className="block text-[13px] text-medio">{f.texto}</span>
              {f.arreglo && <span className="mt-1 block text-[13px] text-[#a33a0b]">{f.arreglo}</span>}
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-8 max-w-3xl" aria-labelledby="t-copia">
        <h2 id="t-copia" className="text-[13px] text-suave">Copia de seguridad</h2>
        <p className="mt-1 text-[14px] text-medio">Cada noche se copian prospectos, fichas, guiones y celulares. Se guardan las últimas dos semanas. Los proyectos ya tienen su propia copia en la nube.</p>
        <div className="mt-3"><CopiaAhora /></div>
      </section>

      <section className="mt-8 max-w-3xl" aria-labelledby="t-errores">
        <h2 id="t-errores" className="text-[13px] text-suave">Lo último que falló</h2>
        {!estado.errores.length ? <p className="mt-2 text-[14px] text-medio">Nada falló.</p> : (
          <ul className="mt-2 grid gap-1" aria-label="Errores">
            {estado.errores.slice(0, 10).map((e, i) => (
              <li key={i} className="rounded-xl bg-white px-4 py-2 text-[13px] shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
                <span className="font-medium">{e.donde}</span> <span className="text-suave">· {hace(e.cuando)}</span>
                <span className="block text-medio">{e.que}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
