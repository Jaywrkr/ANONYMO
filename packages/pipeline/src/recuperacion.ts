// Recuperar una copia nunca reanuda agentes ni recupera aprobaciones antiguas.
import {existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {carpeta,enCarpeta,leerProyecto,guardarProyecto,leerEntrega,guardarEntrega,bitacora} from './almacen.ts';
import {bajarProyecto,huellaProyecto,subirDistintos} from './nube.ts';
import {controlInicial} from './calidad.ts';
import {versionadoActivo,enPublicacion,conRestauracion,indiceActual,guardadoVersionado,bytesVersionados,hayPublicacionSinConfirmar} from './versionado.ts';
export async function restaurarProyecto(id:string,origen:string,revision:number,quien:'jay'|'luna',f:typeof fetch=fetch){
 if(!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id)||!versionadoActivo(id)||!Number.isSafeInteger(revision)||revision<1)throw new Error('La restauración requiere un proyecto del piloto y una revisión válida.');
 const temporal=mkdtempSync(join(tmpdir(),'anonymo-restaurar-'));let conservar=false;
 try{return await enPublicacion(()=>enCarpeta(temporal,async()=>{
  await bajarProyecto(id,f,true);const actual=leerProyecto(id),indice=await indiceActual(id,f);
  if(indice?.revision===revision+1&&existsSync(join(carpeta(),id,'recuperacion.json'))){const recibo=JSON.parse(readFileSync(join(carpeta(),id,'recuperacion.json'),'utf8'));if(recibo.origen===origen&&recibo.base===revision&&recibo.quien===quien)return {subidos:0,borrados:0};}
  if(!indice||indice.revision!==revision)throw new Error('El proyecto cambió. Revisa de nuevo la comparación antes de restaurar.');
  if(actual.estado!=='parado'||actual.papelera)throw new Error('Pausa el proyecto antes de restaurar una copia.');
  const copia=await guardadoVersionado(id,origen,f);if(!copia)throw new Error('Esta copia no pertenece al proyecto o ya no está disponible.');
  const pendientes=new Map<string,Buffer>();for(const ruta of Object.keys(indice.archivos).filter(r=>r.startsWith('avisos-cola/')))pendientes.set(ruta,readFileSync(join(carpeta(),id,ruta)));
  const antes=huellaProyecto(id),base=join(carpeta(),id),auditoria=existsSync(join(base,'bitacora.md'))?readFileSync(join(base,'bitacora.md'),'utf8'):'';
  // Solo se reemplaza esta carpeta temporal propia; la revisión remota sigue intacta hasta el commit.
  rmSync(base,{recursive:true,force:true});mkdirSync(base,{recursive:true});
  for(const [ruta,entrada] of Object.entries(copia.archivos)){if(ruta.startsWith('avisos-cola/'))continue;const destino=join(base,ruta);mkdirSync(dirname(destino),{recursive:true});writeFileSync(destino,await bytesVersionados(id,entrada,f));}
  for(const [ruta,b] of pendientes){const destino=join(base,ruta);mkdirSync(dirname(destino),{recursive:true});writeFileSync(destino,b);}
  const p=leerProyecto(id);if(p.pedido.id!==id||!Array.isArray(p.plan.tareas))throw new Error('La copia no contiene un proyecto válido.');
  p.estado='parado';p.modo='paso';p.revisionRecuperada=origen;p.puertas=[];
  for(const t of Object.keys(p.tareas) as (keyof typeof p.tareas)[])if(p.tareas[t]==='en-curso')p.tareas[t]='por-empezar';
  delete p.controlPendiente;delete p.revision;delete p.vueltas;delete p.inicios;delete p.parciales;delete p.error;delete p.reintentos;delete p.juradoAceptado;delete p.esperaJurado;delete p.caso;delete p.papelera;
  p.controlRondas={};p.controlIntentos={};
  // No se hacen retroceder comentarios, gastos ni el enlace privado vigente del cliente.
  p.notasCliente=actual.notasCliente;p.pendientesCliente=actual.pendientesCliente;p.costos=actual.costos;p.presupuesto=actual.presupuesto;p.portal=actual.portal;
  guardarProyecto(p);
  for(const tarea of p.plan.tareas){const e=leerEntrega(id,tarea);if(!e)continue;e.calidad={...controlInicial(p,e),estado:'pendiente'};guardarEntrega(id,e);}
  writeFileSync(join(base,'bitacora.md'),auditoria);bitacora(id,`${quien} recuperó la copia ${origen} sobre la revisión ${revision}. En pausa y sin aprobaciones vigentes.`);
  writeFileSync(join(base,'recuperacion.json'),JSON.stringify({origen,base:revision,quien,fecha:new Date().toISOString()}));
  try{return await conRestauracion(origen,()=>subirDistintos(id,antes,true,f));}catch(e){conservar=hayPublicacionSinConfirmar();throw e;}
 }));}finally{if(!conservar)rmSync(temporal,{recursive:true,force:true});}
}
