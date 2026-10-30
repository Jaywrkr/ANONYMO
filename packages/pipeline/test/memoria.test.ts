import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crear,guardarEntrega,guardarProyecto,leerProyecto,leerEntrega} from '../src/almacen.ts';
import {planificar} from '../src/atlas.ts';
import {controlInicial} from '../src/calidad.ts';
import {registrarDecisiones,decisionesDe,decisionesConEstado,memoriaPara,capturarContextoDecision,contextoTrabajo,fuentesAtlas,consultarAtlas} from '../src/operaciones.ts';
import {avanzar} from '../src/correr.ts';
import type {Entrega,TareaId} from '../src/tipos.ts';
function caso(id:string){const pedido={id,cliente:'Taller ficticio',tipo:'web' as const,descripcion:'Una web del taller.',creado:new Date().toISOString()};return crear(pedido,planificar(pedido,{tareas:['1.atlas','4.orla','5.faro'],preguntas:[]}));}
function entrega(tarea:TareaId='1.atlas',version=1):Entrega{return {tarea,agente:tarea.split('.')[1],titulo:'Entrega ficticia',contenido:'Decisiones documentadas del taller.',dice:'Propuesta.',necesita:'—',estado:'lista',modo:'real',version,creado:new Date().toISOString(),datos:{decisiones:[{decision:'Priorizar al equipo',motivo:'El contrato requiere un responsable.',fuentes:['c-0']}]}};}
function guardar(id:string,e:Entrega,aprobada=false){const p=leerProyecto(id);e.calidad={...controlInicial(p,e),estado:aprobada?'aprobado':'verificado',...(aprobada?{aprobadoPor:'jay' as const}:{})};guardarEntrega(id,e);return e;}

test('solo las decisiones de una entrega aprobada y vigente se reutilizan como memoria',()=>{
 caso('memoria-confirmar');const e=guardar('memoria-confirmar',entrega());registrarDecisiones('memoria-confirmar',e);
 assert.equal(decisionesConEstado('memoria-confirmar')[0].vigencia,'propuesta');assert.equal(memoriaPara('memoria-confirmar','4.orla').length,0);
 guardar('memoria-confirmar',e,true);assert.equal(decisionesConEstado('memoria-confirmar')[0].vigencia,'confirmada');assert.equal(memoriaPara('memoria-confirmar','4.orla').length,1);
 const futuro=guardar('memoria-confirmar',entrega('5.faro'),true);registrarDecisiones('memoria-confirmar',futuro);assert.equal(memoriaPara('memoria-confirmar','4.orla').length,1);
});
test('una versión nueva conserva el motivo histórico y retira su vigencia',()=>{
 caso('memoria-version');const e=guardar('memoria-version',entrega(),true);registrarDecisiones('memoria-version',e);guardar('memoria-version',entrega('1.atlas',2),true);
 assert.equal(decisionesConEstado('memoria-version')[0].vigencia,'sustituida');assert.equal(memoriaPara('memoria-version','4.orla').length,0);assert.equal(decisionesDe('memoria-version').length,1);
});
test('el cambio de requisitos o de bytes de la entrega invalida el contexto registrado',()=>{
 const id='memoria-contexto';caso(id);const e=guardar(id,entrega(),true);registrarDecisiones(id,e);
 const p=leerProyecto(id);p.requisitos=[{id:'nuevo',texto:'Otro criterio',fuente:'Jay'}];guardarProyecto(p);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada');
 p.requisitos=[];guardarProyecto(p);guardar(id,{...e,contenido:'Contenido cambiado en la misma versión.'},true);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada');
 registrarDecisiones(id,e);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada','volver a registrar no debe reescribir la evidencia inicial');
});
test('las fuentes se fijan antes de producir, no al terminar con requisitos nuevos',()=>{
 const id='memoria-inicio';caso(id);const previo=capturarContextoDecision(id,'1.atlas');const p=leerProyecto(id);p.requisitos=[{id:'posterior',texto:'Requisito posterior',fuente:'Jay'}];guardarProyecto(p);
 const e=guardar(id,entrega(),true);registrarDecisiones(id,e,previo);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada');
});
test('cambiar una fuente directa retira la vigencia de la decisión derivada',()=>{
 const id='memoria-fuente';caso(id);guardar(id,entrega(),true);const e=guardar(id,entrega('4.orla'),true);registrarDecisiones(id,e);assert.equal(decisionesConEstado(id)[0].vigencia,'confirmada');
 guardar(id,entrega('1.atlas',2),true);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada');
});
test('continuar conserva el contexto original y detecta la mezcla de contextos',()=>{
 const id='memoria-continuar';caso(id);const antes=capturarContextoDecision(id,'1.atlas');contextoTrabajo(id,'1.atlas',1,antes,false);
 assert.ok(!contextoTrabajo(id,'1.atlas',1,antes,true).incompleto);
 const p=leerProyecto(id);p.requisitos=[{id:'cambio',texto:'Otra idea',fuente:'Jay'}];guardarProyecto(p);const mezclado=contextoTrabajo(id,'1.atlas',1,capturarContextoDecision(id,'1.atlas'),true);assert.ok(mezclado.incompleto);assert.equal(mezclado.contexto,antes.contexto);
 assert.ok(contextoTrabajo(id,'1.atlas',1,antes,true).incompleto,'no se borra la mezcla aunque vuelvan los requisitos originales');
 assert.ok(contextoTrabajo(id,'1.atlas',2,antes,true).incompleto,'una continuación antigua sin contexto no adquiere evidencia inventada');
});
test('el productor recibe solo memoria confirmada y puede citarla con su identificador',async()=>{
 const id='memoria-productor';caso(id);const e=guardar(id,entrega(),true);registrarDecisiones(id,e);const d=decisionesDe(id)[0];const p=leerProyecto(id);p.estado='en-curso';p.modo='auto';p.plan.pausas=[];p.tareas['1.atlas']='lista';guardarProyecto(p);
 await avanzar(id,{nombre:'real',trabajar:async ctx=>{assert.deepEqual(ctx.memoria?.map(d=>d.id),[d.id]);return {contenido:'Diseño ficticio.',dice:'Generado.',necesita:'—',modo:'real',datos:{decisiones:[{decision:'Continuar con el equipo',motivo:'Mantener la prioridad aprobada.',fuentes:[d.id]}]}};}},()=>{},{max:1});
 const nueva=decisionesDe(id).find(d=>d.tarea==='4.orla');assert.ok(nueva);assert.ok(nueva.contexto?.memoria?.includes(d.id));assert.ok(Array.isArray(leerEntrega(id,'4.orla')?.datos?.decisiones));
});
test('Atlas distingue fuentes históricas de actuales y el resumen sin IA también lo indica',async()=>{
 const id='memoria-atlas';caso(id);const e=guardar(id,entrega(),true);registrarDecisiones(id,e);guardar(id,entrega('1.atlas',2),true);
 assert.ok(fuentesAtlas(id).some(f=>f.titulo.includes('Versión anterior')));const m=await consultarAtlas(id,'¿Qué decisiones siguen vigentes?','jay');assert.match(m.respuesta,/Confirmadas y vigentes: 0/);assert.ok(m.fuentes.some(f=>f.id==='memoria'));
});

test('los registros antiguos sin contexto y las simulaciones no se reutilizan como decisiones confirmadas',async()=>{
 const id='memoria-legado';caso(id);const e=guardar(id,entrega(),true);registrarDecisiones(id,e);const d=decisionesDe(id)[0];delete d.contexto;
 const {carpeta}=await import('../src/almacen.ts');const {writeFileSync}=await import('node:fs');const {join}=await import('node:path');writeFileSync(join(carpeta(),id,'memoria','decisiones',d.id+'.json'),JSON.stringify(d));
 assert.equal(decisionesConEstado(id)[0].vigencia,'sin-contexto');assert.equal(memoriaPara(id,'4.orla').length,0);
 guardar(id,{...e,modo:'simulado'},true);assert.equal(decisionesConEstado(id)[0].vigencia,'simulada');assert.equal(memoriaPara(id,'4.orla').length,0);
});

test('una fuente nueva en el plan también deja pendiente el contexto de la decisión anterior',()=>{
 const id='memoria-nueva-fuente';caso(id);guardar(id,entrega(),true);const e=guardar(id,entrega('4.orla'),true);registrarDecisiones(id,e);
 const p=leerProyecto(id);p.plan.tareas.splice(1,0,'1.nova');p.tareas['1.nova']='lista';guardarProyecto(p);guardar(id,entrega('1.nova'),true);assert.equal(decisionesConEstado(id)[0].vigencia,'desactualizada');
});
