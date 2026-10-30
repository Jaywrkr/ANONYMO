"use server";
import { redirect, notFound } from 'next/navigation';
import { aprobar, avisar, comentarioPortal, direccionDelCliente, elegirMotor, guardarArchivo, leerProyecto, responder, tokenValido, ocultarClaves } from '@anonymo/pipeline';
import { portalActivo } from '@/lib/estudio';
import { conNube } from '@/lib/nube';
import { archivosDe } from '@/lib/subidas';
import { lanzar } from '@/lib/trabajo';
async function operar(f: FormData, fn: (id: string) => Promise<string>, continuar = false) {
    const id = String(f.get('id') ?? ''), t = String(f.get('t') ?? '');
    if (!portalActivo() || !/^[a-z0-9-]+$/.test(id))
        notFound();
    let mensaje = '', sigue = false, valido = false;
    try {
        await conNube([id], async () => { if (!tokenValido(id, t))
            notFound(); valido = true; mensaje = await fn(id); sigue = leerProyecto(id).estado === 'en-curso'; });
        if (continuar && sigue)
            await lanzar(id);
    }
    catch (e) {
        if (!valido)
            notFound();
        mensaje = ocultarClaves((e as Error).message);
    }
    redirect(`/portal/${id}?t=${encodeURIComponent(t)}&m=${encodeURIComponent(mensaje)}`);
}
export async function portalAprobar(f: FormData) { return operar(f, async (id) => { if (leerProyecto(id).estado !== 'esperando')
    throw new Error('Esta fase ya no espera aprobación.'); await aprobar(id, 'cliente', 'Aprobado por el cliente en su portal', elegirMotor(), () => { }, false, { max: 0 }); return 'Gracias. El equipo sigue con la siguiente fase.'; }, true); }
export async function portalComentar(f: FormData) { return operar(f, async (id) => { await comentarioPortal(id, String(f.get('texto') ?? '')); return 'Recibido. Jay o Luna lo pasan al equipo.'; }); }
export async function portalSubir(f: FormData) { return operar(f, async (id) => { const archivos = await archivosDe(f, 12); if (!archivos.length)
    throw new Error('Elige al menos un archivo.'); for (const a of archivos)
    guardarArchivo(id, a.nombre, a.datos, 'Subido por el cliente'); await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: 'comentario', titulo: `Subió ${archivos.length} archivo(s)`, texto: archivos.map(a => a.nombre).join(', ') }); return `Recibimos ${archivos.length} archivo(s). Gracias.`; }); }
export async function portalResponder(f: FormData) { return operar(f, async (id) => { const r = Object.fromEntries(leerProyecto(id).plan.preguntas.map((q, i) => [q, String(f.get(`r${i}`) ?? '')])); const n = responder(id, r, 'cliente'); await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: 'comentario', titulo: `Respondió ${n.length} pregunta(s)`, texto: n.map(x => `${x.pregunta} → ${x.respuesta}`).join('\n') }); return 'Gracias. El equipo ya tiene tus respuestas.'; }); }
export async function portalElegirDireccion(f: FormData) { return operar(f, async (id) => { const n = Number(f.get('n')), nota = String(f.get('nota') ?? '').trim() || undefined, p = direccionDelCliente(id, n, nota), d = p.direcciones!.opciones[n]; await avisar({ proyecto: id, cliente: p.pedido.cliente, tipo: 'comentario', titulo: `Eligió la dirección «${d.nombre}»`, texto: nota ?? 'Sin comentarios.' }); return p.pedido.idioma === 'en' ? `Thanks: you picked “${d.nombre}”. Jay and Luna will confirm soon.` : `Gracias: elegiste «${d.nombre}». Jay y Luna te confirman pronto.`; }); }
