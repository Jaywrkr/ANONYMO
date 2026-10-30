import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {crear,guardarEntrega,leerProyecto} from '../src/almacen.ts';
import {planificar} from '../src/atlas.ts';
import {registrarDecisiones,decisionesDe,detectarMejora,mejorasDe,cambiarMejora,consultarAtlas,conversacionesDe} from '../src/operaciones.ts';
import {prepararEncargo,aplicarEncargo,interpretarEncargo} from '../src/encargos.ts';
import {validarSvg,leerPiezas,guardarPiezas,leerPieza} from '../src/piezas.ts';
import {huellaEntrega} from '../src/calidad.ts';
import {ocultarClaves} from '../src/ia.ts';
import type {Entrega} from '../src/tipos.ts';
const crearCaso=(id:string)=>{const pedido={id,cliente:'Taller de prueba',tipo:'web' as const,descripcion:'Una web clara.',creado:new Date().toISOString()};return crear(pedido,planificar(pedido,{tareas:['1.atlas','4.orla'],preguntas:[]}), 'plan');};
const entrega=(extra:Partial<Entrega>={}):Entrega=>({tarea:'1.atlas',agente:'atlas',titulo:'Plan',contenido:'Plan del taller.',dice:'Listo.',necesita:'—',estado:'lista',modo:'real',version:1,creado:new Date().toISOString(),...extra});

test('consulta sin IA devuelve fuentes reales y no inventa razones históricas',async()=>{
 crearCaso('consulta-registro');const id=randomUUID();const m=await consultarAtlas('consulta-registro','¿Por qué Orla tomó esa decisión?','jay','atlas',id);
 assert.equal(m.modo,'registro');assert.match(m.respuesta,/No hay una justificación registrada/);assert.ok(m.fuentes.every(f=>f.href.startsWith('/estudio/consulta-registro')));
 assert.deepEqual(await consultarAtlas('consulta-registro',m.pregunta,'jay','atlas',id),m);assert.equal(conversacionesDe('consulta-registro').length,1);
 await assert.rejects(consultarAtlas('consulta-registro','Otra consulta','jay','atlas',id),/otro|otra/);
});
test('las respuestas con fuentes inventadas no se presentan como respuestas de IA',async()=>{
 crearCaso('consulta-fuentes');const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:'{"respuesta":"He publicado la web.","fuentes":["otro-proyecto"]}'}]})) as typeof fetch;
 try{const m=await consultarAtlas('consulta-fuentes','¿Qué pasó?','jay');assert.equal(m.modo,'registro');assert.doesNotMatch(m.respuesta,/He publicado/);}finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});
test('una decisión registrada requiere fuentes realmente disponibles para esa tarea',()=>{
 crearCaso('decisiones-fuentes');registrarDecisiones('decisiones-fuentes',entrega({datos:{decisiones:[{decision:'Elegir una idea',motivo:'Por el pedido',fuentes:['pedido-inventado']},{decision:'Leer Orla',motivo:'No existe todavía',fuentes:['4.orla']},{decision:'Plan con responsable',motivo:'El contrato lo exige.',fuentes:['c-0']}]}}));
 const ds=decisionesDe('decisiones-fuentes');assert.equal(ds.length,1);assert.equal(ds[0].decision,'Plan con responsable');
});
test('las incidencias se agrupan sin perder las ocurrencias ni publicar credenciales',()=>{
 crearCaso('mejoras-contar');for(let i=0;i<3;i++)detectarMejora('mejoras-contar',{tipo:'fallo',titulo:'API rechazada',detalle:'Bearer secreto123',tarea:'4.orla'});
 const [m]=mejorasDe('mejoras-contar');assert.equal(m.ocurrencias,3);assert.doesNotMatch(m.detalle,/secreto123/);assert.throws(()=>cambiarMejora('mejoras-contar',m.id,'resuelta',''),/prueba/);
 cambiarMejora('mejoras-contar',m.id,'investigando','Reproducir el rechazo de la API.');assert.equal(mejorasDe('mejoras-contar')[0].estado,'investigando');
 cambiarMejora('mejoras-contar',m.id,'resuelta','Repetida la comprobación original sin error.');assert.equal(mejorasDe('mejoras-contar')[0].estado,'resuelta');
 detectarMejora('mejoras-contar',{tipo:'fallo',titulo:'API rechazada',detalle:'Volvió a fallar',tarea:'4.orla'});assert.equal(mejorasDe('mejoras-contar')[0].estado,'detectada');assert.equal(mejorasDe('mejoras-contar')[0].ocurrencias,4);
});
test('encargos repetidos no vuelven a pausar ni cambian una versión posterior',async()=>{
 crearCaso('encargo-pausa');const e=prepararEncargo('encargo-pausa',{id:randomUUID(),quien:'jay',accion:'pausar',nota:'Pausa de prueba'});await aplicarEncargo('encargo-pausa',e.id);const p=leerProyecto('encargo-pausa');assert.equal(p.estado,'parado');await aplicarEncargo('encargo-pausa',e.id);assert.equal(leerProyecto('encargo-pausa').puertas.length,p.puertas.length);
 guardarEntrega('encargo-pausa',entrega());const r=prepararEncargo('encargo-pausa',{id:randomUUID(),quien:'jay',accion:'verificar',tarea:'1.atlas',nota:''});guardarEntrega('encargo-pausa',entrega({version:2}));const bloqueado=await aplicarEncargo('encargo-pausa',r.id);assert.equal(bloqueado.estado,'bloqueado');assert.match(bloqueado.resultado!,/Cambió la versión/);
});
test('el intérprete no admite publicar, aprobar ni entregas de otro agente',async()=>{
 crearCaso('encargo-limites');const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:'{"accion":"publicar","tarea":"4.orla"}'}]})) as typeof fetch;
 try{await assert.rejects(interpretarEncargo('encargo-limites','Publica la web','orla','jay',randomUUID()),/acción más concreta/);globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:'{"accion":"cambiar","tarea":"1.atlas","nota":"Cambiar"}'}]})) as typeof fetch;await assert.rejects(interpretarEncargo('encargo-limites','Cambia el diseño','orla','jay',randomUUID()),/entrega válida/);}finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});
test('el vector es editable, autocontenido y conserva sus bytes por versión',()=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop stop-color="#123456"/></linearGradient></defs><path fill="url(#g)" d="M10 10H90V90H10Z"/></svg>';
 assert.equal(validarSvg(svg),undefined);for(const malo of [svg.replace('<path','<script>alert(1)</script><path'),svg.replace('url(#g)','url(https://fuera.test/img)'),svg.replace('<path','<image href="data:image/png;base64,AAAA"/><path')])assert.ok(validarSvg(malo));
 crearCaso('pieza-real');const archivos=leerPiezas('```svg archivo:logo-principal.svg\n'+svg+'\n```');guardarPiezas('pieza-real','3.mira',1,archivos);assert.equal(leerPieza('pieza-real','3.mira',1,'logo-principal.svg')!.toString(),svg);assert.equal(leerPieza('pieza-real','3.mira',1,'../../estado.json'),undefined);
});
test('las claves de distintos proveedores se tapan antes de guardarse',()=>{
 const texto='ghp_'+'a'.repeat(36)+' github_pat_'+'b'.repeat(40)+' sk-ant-'+'c'.repeat(30);const r=ocultarClaves(texto);assert.doesNotMatch(r,/aaaa|bbbb|cccc/);
});

test('un encargo interpretado conserva la petición original y rechaza reutilizar su identificador',async()=>{
 crearCaso('encargo-identidad');const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';
 globalThis.fetch=(async()=>Response.json({content:[{type:'text',text:'{"accion":"pausar","nota":"Pausa solicitada"}'}]})) as typeof fetch;
 try{const id=randomUUID(),e=await interpretarEncargo('encargo-identidad','Pausa el proyecto','atlas','jay',id);assert.deepEqual(await interpretarEncargo('encargo-identidad','Pausa el proyecto','atlas','jay',id),JSON.parse(JSON.stringify(e)));await assert.rejects(interpretarEncargo('encargo-identidad','Reanuda el proyecto','atlas','jay',id),/otro encargo/);}finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});
test('la huella de una identidad cambia si se alteran los bytes del SVG aunque no haya lista en datos',()=>{
 crearCaso('pieza-huella');const p=leerProyecto('pieza-huella'),e=entrega({tarea:'3.mira'});const svg='<svg viewBox="0 0 100 100"><path d="M0 0L100 100"/></svg>';
 guardarPiezas('pieza-huella','3.mira',1,{'simbolo.svg':svg});const h=huellaEntrega(p,e);guardarPiezas('pieza-huella','3.mira',1,{'simbolo.svg':svg.replace('L100','L80')});assert.notEqual(huellaEntrega(p,e),h);
});
