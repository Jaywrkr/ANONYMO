import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crear,guardarEntrega,guardarProyecto,leerEntrega,leerProyecto} from '../src/almacen.ts';
import {planificar} from '../src/atlas.ts';
import {avanzar,aprobar,elegirDireccion,fusionar,pedirControl} from '../src/correr.ts';
import {controlInicial,controlar,estadoEntrega,leerRevision,puedeAprobar} from '../src/calidad.ts';
import {condicionesDe,requisitosDe} from '../src/requisitos.ts';
import {guardarSitio,leerArchivoSitio} from '../src/sitio.ts';
import type {Entrega,Proyecto} from '../src/tipos.ts';
import type {Motor} from '../src/motor.ts';

function proyecto(id:string):Proyecto {
 const pedido={id,cliente:'Taller',tipo:'web' as const,descripcion:'Debe mostrar el equipo. Debe ofrecer contacto.',creado:new Date().toISOString()};
 const p=crear(pedido,planificar(pedido,{tareas:['1.atlas'],preguntas:[]}));p.modo='paso';guardarProyecto(p);return p;
}
const entrega=(version=1):Entrega=>({tarea:'1.atlas',agente:'atlas',titulo:'Plan',contenido:'Un plan completo para el taller.',dice:'Plan generado.',necesita:'—',estado:'lista',modo:'real',version,creado:new Date().toISOString()});

test('los requisitos mantienen sus fuentes y condiciones específicas por tarea',()=>{
 const p=proyecto('calidad-requisitos');
 p.requisitos=[{id:'extra',texto:'Mostrar horarios.',fuente:'Jay',tarea:'4.vector'}];
 assert.equal(requisitosDe(p).filter(r=>r.fuente==='Pedido').length,2);
 assert.ok(!condicionesDe(p,'1.atlas').some(r=>r.id==='extra'));
 assert.ok(condicionesDe(p,'4.vector').some(r=>r.id==='extra'));
});
test('una nota alta no aprueba condiciones omitidas, duplicadas o sin evidencia',()=>{
 for(const comprobaciones of [[],[{id:'a',estado:'cumple',evidencia:''}],[{id:'a',estado:'cumple',evidencia:'Sí'},{id:'a',estado:'cumple',evidencia:'Sí'}]]){
  const r=leerRevision({nota:10,comprobaciones},[{id:'a',texto:'Debe cumplir'}]);assert.equal(r.comprobaciones[0].estado,'pendiente');
 }
 assert.equal(leerRevision({nota:Infinity},[]).nota,undefined);
});
test('generar no es verificar; cambiar archivos, requisitos o versión invalida la aprobación',()=>{
 const p=proyecto('calidad-estados'),e=entrega();
 assert.equal(estadoEntrega(p,e),'generado');assert.equal(puedeAprobar(p,e),false);
 e.calidad={...controlInicial(p,e),estado:'aprobado',aprobadoPor:'jay'};
 assert.equal(estadoEntrega(p,e),'aprobado');
 guardarEntrega(p.pedido.id,e);assert.equal(estadoEntrega(p,leerEntrega(p.pedido.id,e.tarea)!), 'aprobado');
 e.contenido+=' Cambió.';assert.equal(estadoEntrega(p,e),'pendiente');e.contenido='Un plan completo para el taller.';
 p.requisitos=[{id:'nuevo',texto:'Debe cambiar.',fuente:'Jay'}];assert.equal(estadoEntrega(p,e),'pendiente');
});
test('las fotos usadas se conservan en la versión y el archivo genera una huella distinta al cambiar',async()=>{
 const p=proyecto('calidad-archivos'),e={...entrega(),tarea:'4.vector' as const};
 guardarSitio(p.pedido.id,1,{'index.html':'<main>Versión uno</main>'});
 e.calidad={...controlInicial(p,e),estado:'verificado'};
 guardarSitio(p.pedido.id,1,{'index.html':'<main>Otra versión</main>'});
 assert.equal(estadoEntrega(p,e),'pendiente');assert.match(leerArchivoSitio(p.pedido.id,1,'index.html')!.toString(),/Otra/);
});
test('no permite aprobar una entrega sin revisión, incluso al forzar la decisión',async()=>{
 const p=proyecto('calidad-bloqueo'),e=entrega();guardarEntrega(p.pedido.id,e);
 p.tareas[e.tarea]='lista';p.estado='esperando';p.revision={tarea:e.tarea,fecha:e.creado};guardarProyecto(p);
 await assert.rejects(aprobar(p.pedido.id,'jay',undefined,undefined,()=>{},true,{max:0}),/no está verificada/);
});
test('faltar conexión de revisión deja pendiente la pieza y conserva su versión',async()=>{
 const p=proyecto('calidad-sin-conexion'),e=entrega();
 const r=await controlar(p,e,false);assert.equal(r.estado,'pendiente');assert.match(r.resumen,/conexión/);assert.equal(r.version,1);
});
test('flujo real: genera, verifica por separado y solo la persona aprueba',async()=>{
 const p=proyecto('calidad-flujo');
 const motor:Motor={nombre:'real',trabajar:async()=>({contenido:'Un plan completo para el taller.',dice:'Plan generado.',necesita:'—',modo:'real'})};
 await avanzar(p.pedido.id,motor,()=>{},{max:1});
 let q=leerProyecto(p.pedido.id);assert.ok(q.controlPendiente);assert.equal(q.revision,undefined);assert.equal(leerEntrega(p.pedido.id,'1.atlas')!.calidad!.estado,'generado');
 const anterior=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async(_url,op)=>{
  const cuerpo=JSON.parse(String(op?.body));assert.match(JSON.stringify(cuerpo),/Revisión de calidad/);
  return Response.json({content:[{type:'text',text:JSON.stringify({nota:9,resumen:'Cumple los requisitos del plan.',comprobaciones:condicionesDe(q,'1.atlas').map(c=>({id:c.id,estado:'cumple',evidencia:'El plan incluye la condición: '+c.texto}))})}],usage:{input_tokens:10,output_tokens:50}});
 }) as typeof fetch;
 try{
  await avanzar(p.pedido.id,motor,()=>{},{max:1});q=leerProyecto(p.pedido.id);
  assert.equal(q.estado,'esperando');assert.equal(q.controlPendiente,undefined);
  assert.equal(leerEntrega(p.pedido.id,'1.atlas')!.calidad!.estado,'verificado');
  await aprobar(p.pedido.id,'jay',undefined,motor,()=>{},false,{max:0});
  assert.equal(leerEntrega(p.pedido.id,'1.atlas')!.calidad!.estado,'aprobado');
 }finally{globalThis.fetch=anterior;delete process.env.ANTHROPIC_API_KEY;}
});
test('sin archivos reproducibles una descripción de logo no queda verificada',async()=>{
 const p=proyecto('calidad-logo'),e={...entrega(),tarea:'3.mira' as const};
 const r=await controlar(p,e,false);assert.equal(r.estado,'cambios');assert.match(r.resumen,/archivo vectorial/);
});
test('la fusión conserva los controles y respeta la pausa y las condiciones nuevas',()=>{
 const p=proyecto('calidad-fusion');
 const vuelta={...p,controlPendiente:{tarea:'1.atlas' as const,version:1,proponer:false}};
 const nube={...p,estado:'parado' as const,requisitos:[{id:'a',texto:'Nuevo requisito',fuente:'Jay'}]};
 const r=fusionar(vuelta,nube);assert.equal(r.estado,'parado');assert.deepEqual(r.requisitos,nube.requisitos);assert.ok(r.controlPendiente);
});

test('una auditoría ausente no se sustituye por la descripción de Prisma',async()=>{
 const p=proyecto('calidad-prisma'),e={...entrega(),tarea:'6.prisma' as const};
 const r=await controlar(p,e,false);assert.equal(r.estado,'pendiente');assert.match(r.resumen,/auditoría vigente/);
});
test('corrige automáticamente como máximo dos veces y conserva las versiones',async()=>{
 const p=proyecto('calidad-rondas');
 const motor:Motor={nombre:'real',trabajar:async()=>({contenido:'Un plan incompleto para el taller.',dice:'Borrador.',necesita:'—',modo:'real'})};
 const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:JSON.stringify({nota:6,resumen:'Falta concretar las entregas.',comprobaciones:condicionesDe(p,'1.atlas').map(c=>({id:c.id,estado:'falla',evidencia:'Falta resolver: '+c.texto}))})}]})) as typeof fetch;
 try{
  for(let i=0;i<3;i++){await avanzar(p.pedido.id,motor,()=>{},{max:1});await avanzar(p.pedido.id,motor,()=>{},{max:1});}
  const q=leerProyecto(p.pedido.id),e=leerEntrega(p.pedido.id,'1.atlas')!;
  assert.equal(q.estado,'esperando');assert.equal(q.controlPendiente,undefined);assert.equal(q.controlRondas?.['1.atlas:entrega'],2);
  assert.equal(e.version,3);assert.equal(e.calidad?.estado,'cambios');assert.equal(puedeAprobar(q,e),false);
  assert.ok(leerEntrega(p.pedido.id,'1.atlas',1));
 }finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});

test('la versión conserva la foto original aunque cambie el archivo del proyecto',async()=>{
 const {guardarArchivo,rutaArchivo}=await import('../src/archivos.ts');
 const {writeFileSync,readFileSync}=await import('node:fs');
 const {guardarImagenesDirecciones,leerImagenDireccion}=await import('../src/sitio.ts');
 const p=proyecto('calidad-fotos');
 guardarArchivo(p.pedido.id,'foto.png',Buffer.from('foto original'));
 guardarSitio(p.pedido.id,1,{'index.html':'<img src="img/foto.png">'});
 guardarImagenesDirecciones(p.pedido.id,1,'<img src="img/foto.png">');
 writeFileSync(rutaArchivo(p.pedido.id,'foto.png')!,Buffer.from('foto nueva'));
 assert.equal(readFileSync(rutaArchivo(p.pedido.id,'foto.png')!).toString(),'foto nueva');
 assert.equal(leerArchivoSitio(p.pedido.id,1,'img/foto.png')!.toString(),'foto original');
 assert.equal(leerImagenDireccion(p.pedido.id,1,'img/foto.png')!.toString(),'foto original');
 assert.equal(leerImagenDireccion(p.pedido.id,1,'img/../../estado.json'),undefined);
});

test('en automático la última revisión llega a la decisión humana sin necesitar otra vuelta pendiente',async()=>{
 const p=proyecto('calidad-auto');p.modo='auto';p.plan.pausas=[];guardarProyecto(p);
 const motor:Motor={nombre:'real',trabajar:async()=>({contenido:'Un plan completo.',dice:'Generado.',necesita:'—',modo:'real'})};
 const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:JSON.stringify({nota:9,resumen:'Cumple.',comprobaciones:condicionesDe(p,'1.atlas').map(c=>({id:c.id,estado:'cumple',evidencia:'Cumple: '+c.texto}))})}]})) as typeof fetch;
 try{
  await avanzar(p.pedido.id,motor,()=>{},{max:1});
  const q=await avanzar(p.pedido.id,motor,()=>{},{max:1});
  assert.equal(q.estado,'esperando');assert.equal(q.revision?.tarea,'1.atlas');assert.equal(q.controlPendiente,undefined);
 }finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});
