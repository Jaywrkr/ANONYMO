// Requisitos con fuente: nunca se interpreta la respuesta del productor como prueba de cumplimiento.
import { createHash } from 'node:crypto';
import {listarArchivos} from './archivos.ts';
import { contratoPorId } from './contratos.ts';
import type { Proyecto, Requisito, TareaId } from './tipos.ts';

export function requisitosDe(p: Proyecto): Requisito[] {
  const fuentes = [
    ...p.pedido.descripcion.split(/\n+|(?<=[.!?])\s+/).filter(s => s.trim()).map(texto => ({ texto, fuente: 'Pedido' })),
    ...(p.pedido.contexto?.respuestas ?? []).map(r => ({ texto: `${r.pregunta}: ${r.respuesta}`, fuente: 'Respuesta del cliente' })),
    ...(p.notasCliente ?? []).map(n => ({ texto: n.texto, fuente: 'Comentario del cliente' })),
    ...(p.pedido.contexto?.referencias ?? []).map(texto => ({ texto: `Referencia: ${texto}`, fuente: 'Referencia del cliente' })),
    ...(p.pedido.contexto?.publico ? [{ texto: `Público: ${p.pedido.contexto.publico}`, fuente: 'Pedido' }] : []),
    ...(p.pedido.idioma ? [{ texto: `Idioma de la entrega: ${p.pedido.idioma}`, fuente: 'Pedido' }] : []),
  ];
  return [...fuentes.map(({texto, fuente}) => ({ id: `r-${createHash('sha256').update(fuente + texto.trim()).digest('hex').slice(0, 16)}`, texto: texto.trim(), fuente })), ...(p.requisitos ?? [])];
}
export function condicionesDe(p: Proyecto, tarea: TareaId) {
  return [
    ...requisitosDe(p).filter(r => !r.tarea || r.tarea === tarea),
    ...(contratoPorId(tarea)?.criterios ?? []).map((texto, i) => ({ id: `c-${i}`, texto, fuente: 'Condición de la entrega' })),
  ];
}
export function contextoCalidad(p: Proyecto, tarea: TareaId): string {
  return createHash('sha256').update(JSON.stringify({ requisitos: condicionesDe(p, tarea), materiales:listarArchivos(p.pedido.id), marca: p.marca, direccion: !tarea.startsWith("4.") || tarea === "4.orla" ? undefined : p.direcciones?.elegida === undefined ? undefined : p.direcciones.opciones[p.direcciones.elegida] })).digest('hex');
}
