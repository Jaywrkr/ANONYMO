import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guardadosVersionados, versionadoActivo } from '@anonymo/pipeline';
import { exigirEstudio, serif, boton } from '@/lib/estudio';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Avances guardados — Estudio', robots: { index: false } };
export default async function Guardados({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    await exigirEstudio();
    const { id } = await params;
    if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id) || !versionadoActivo(id))
        notFound();
    const avances = await guardadosVersionados(id);
    return <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10"><Link className={boton} href={`/estudio/${id}`}>Volver al proyecto</Link><h1 className={`${serif} text-4xl`}>Avances guardados</h1><p className="text-medio">Si el pedido cambió o una vuelta perdió su turno, su trabajo queda aquí. Puedes descargarlo para revisarlo. No sustituye la versión del proyecto ni se aprueba automáticamente.</p>{!avances.length && <p>No hay avances en conflicto.</p>}{avances.map(a => <section key={a.id} className="grid gap-3 rounded-2xl bg-white p-5"><h2 className="text-lg">{a.estado === 'conflicto' ? 'El pedido cambió' : 'La vuelta perdió su turno'}</h2><p className="text-sm text-medio">{new Date(a.creado).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} · {Object.keys(a.archivos).length} archivos</p><details><summary className="cursor-pointer py-2">Revisar archivos</summary><ul className="grid gap-2 break-all text-sm">{Object.keys(a.archivos).sort().map(r => <li key={r}><a className="underline" href={`/estudio/${id}/guardados/${a.id}?archivo=${encodeURIComponent(r)}`}>{r}</a></li>)}</ul></details></section>)}<p className="text-xs text-medio">Se muestran los últimos veinte avances en conflicto. Las descargas contienen información privada del proyecto.</p></main>;
}
