import {archivosPiezas,type Entrega,type Proyecto} from '@anonymo/pipeline';
import {urlPieza} from '@/lib/sitio';
export function PiezasMarca({p,e}:{p:Proyecto;e:Entrega}){
 const archivos=archivosPiezas(p.pedido.id,e.tarea,e.version);if(!archivos.length)return null;
 return <section aria-label="Archivos vectoriales" className="my-6"><h2 className="font-serif text-[28px]">Propuestas y archivos editables</h2><p className="mt-2 text-[13px] text-medio">Los archivos conservan la versión. Su verificación y aprobación aparecen en el control de calidad.</p><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{archivos.map(r=><a key={r} href={urlPieza(p.pedido.id,e.tarea,e.version,r)} target="_blank" rel="noreferrer" className="rounded-2xl border border-borde bg-white p-4">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={urlPieza(p.pedido.id,e.tarea,e.version,r)} alt={r.replace('.svg','').replaceAll('-',' ')} className="h-40 w-full object-contain" loading="lazy"/><span className="mt-2 block text-[13px]">{r} ↗</span></a>)}</div></section>;
}
