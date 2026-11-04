import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {enCarpeta,crear,planificar,guardarProyecto,guardarEntrega,leerProyecto,controlInicial,avanzar,simulado,type Entrega} from '../src/index.ts';
for(const primeraAprobada of [false,true])test(primeraAprobada?'una aprobación nueva permite revisar la siguiente entrega recuperada':'reanudar una copia completa no cierra el proyecto con entregas sin revisar',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'anonymo-revision-recuperada-'));
 try{await enCarpeta(dir,async()=>{
  const pedido={id:'restauracion-unitaria',cliente:'Taller ficticio',tipo:'web' as const,descripcion:'Solo un ensayo.',creado:new Date().toISOString()},p=crear(pedido,planificar(pedido,{tareas:['1.atlas','2.verba']}));
  p.revisionRecuperada='copia-ficticia';p.modo='paso';p.tareas['1.atlas']='lista';p.tareas['2.verba']='lista';guardarProyecto(p);
  for(const tarea of p.plan.tareas){const e:Entrega={tarea,agente:tarea.split('.')[1],titulo:'Entrega ficticia',contenido:'Contenido que requiere revisión.',dice:'Prueba',necesita:'—',estado:'lista',modo:'real',version:1,creado:new Date().toISOString()};e.calidad={...controlInicial(p,e),estado:primeraAprobada&&tarea==='1.atlas'?'aprobado':'pendiente'};guardarEntrega(pedido.id,e);}
  await avanzar(pedido.id,simulado,()=>{},{max:0});const actual=leerProyecto(pedido.id);assert.equal(actual.estado,'en-curso');assert.equal(actual.faseActual,primeraAprobada?2:1);assert.equal(actual.controlPendiente?.tarea,primeraAprobada?'2.verba':'1.atlas');assert.equal(actual.revisionRecuperada,'copia-ficticia');
 });}finally{rmSync(dir,{recursive:true,force:true});}
});
