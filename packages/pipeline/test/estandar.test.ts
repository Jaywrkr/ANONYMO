import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {crear,leerProyecto} from '../src/almacen.ts';
import {planificar} from '../src/atlas.ts';
import {guardarArchivo,rutaArchivo} from '../src/archivos.ts';
import {agregarReferencia,retirarReferencia,leerEstandar,referenciasDe,adjuntosReferencias} from '../src/estandar.ts';
import {contextoCalidad,condicionesDe} from '../src/requisitos.ts';
import {real} from '../src/motor.ts';
const png=readFileSync(new URL('../../../scripts/pruebas/imagen.png',import.meta.url));
function caso(id:string){const pedido={id,cliente:'Taller ficticio',tipo:'web' as const,descripcion:'Identidad y web propias.',creado:new Date().toISOString()};crear(pedido,planificar(pedido,{tareas:['3.mira','4.orla','4.vector'],preguntas:[]}));guardarArchivo(id,'ejemplo.png',png);}
const entrada={titulo:'Ritmo editorial',ambito:'web' as const,archivo:'ejemplo.png',aprender:'Resolver jerarquía con contraste tipográfico.',evitar:'Copiar la composición de la referencia.',origen:'Ejemplo ficticio de prueba',quien:'jay' as const,revision:0};
test('la selección cambia solo el contexto aplicable y conserva una copia íntegra del archivo',()=>{
 const id='estandar-copia';caso(id);const p=leerProyecto(id),web=contextoCalidad(p,'4.vector'),marca=contextoCalidad(p,'3.mira');agregarReferencia(id,entrada);
 assert.notEqual(contextoCalidad(p,'4.vector'),web);assert.equal(contextoCalidad(p,'3.mira'),marca);assert.equal(referenciasDe(id,'1.atlas').length,0);
 writeFileSync(rutaArchivo(id,'ejemplo.png')!,Buffer.from('archivo modificado'));assert.ok(adjuntosReferencias(id,'4.vector')[0].bytes.equals(png));assert.equal(condicionesDe(p,'4.vector').filter(c=>c.id.startsWith('ref-')).length,1);
});
test('retirar conserva la revisión y la imagen histórica sin mantenerla activa',()=>{
 const id='estandar-historia';caso(id);const r=agregarReferencia(id,entrada);retirarReferencia(id,r.id,1,'jay');assert.equal(leerEstandar(id).referencias.length,0);assert.equal(leerEstandar(id,1).referencias[0].imagen,r.imagen);assert.equal(adjuntosReferencias(id,'4.vector').length,0);
 assert.throws(()=>agregarReferencia(id,{...entrada,revision:0}),/Cambió/);assert.equal(leerEstandar(id).revision,2);
});
test('no admite rutas, archivos falsos, criterios vacíos ni duplicados',()=>{
 const id='estandar-limites';caso(id);assert.throws(()=>agregarReferencia(id,{...entrada,archivo:'../../otro.png'}),/Elige una imagen/);assert.throws(()=>agregarReferencia(id,{...entrada,aprender:'bonito'}),/criterio/);
 agregarReferencia(id,entrada);assert.throws(()=>agregarReferencia(id,{...entrada,revision:1}),/ya está seleccionada/);const a=guardarArchivo(id,'falsa.png',Buffer.from('esto no es una imagen válida'));assert.throws(()=>agregarReferencia(id,{...entrada,revision:1,archivo:a.nombre}),/no corresponde/);
});
test('el productor recibe los bytes de la referencia incluso al continuar sin otros adjuntos',async()=>{
 const id='estandar-productor';caso(id);agregarReferencia(id,{...entrada,ambito:'identidad'});const antes=globalThis.fetch;process.env.ANTHROPIC_API_KEY='sk-ant-prueba-falsa';let cuerpo:any;
 globalThis.fetch=(async(_u,op)=>{cuerpo=JSON.parse(String(op?.body));const eventos=[{type:'message_start',message:{usage:{input_tokens:10,output_tokens:0}}},{type:'content_block_start',index:0,content_block:{type:'text',text:''}},{type:'content_block_delta',index:0,delta:{type:'text_delta',text:' Hecho.\nDICE: Propuesta.\nNECESITA: —'}},{type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:20}},{type:'message_stop'}];return new Response(eventos.map(e=>`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''),{headers:{'content-type':'text/event-stream'}});}) as typeof fetch;
 try{const p=leerProyecto(id);await real.trabajar({pedido:p.pedido,tarea:'3.mira',lecturas:[],version:1,preguntas:[],herramientas:[],cliente:[],parcial:'Inicio anterior.',directo:true,referencias:adjuntosReferencias(id,'3.mira')});const contenido=cuerpo.messages[0].content;assert.ok(Array.isArray(contenido));assert.equal(contenido.filter((c:any)=>c.type==='image').length,1);assert.equal(contenido.find((c:any)=>c.type==='image').source.data,png.toString('base64'));assert.match(JSON.stringify(contenido),/Material efectivamente adjunto/);assert.match(JSON.stringify(contenido),/Ritmo editorial/);}finally{globalThis.fetch=antes;delete process.env.ANTHROPIC_API_KEY;}
});
test('no oculta una copia alterada y limita la selección para completar la revisión visual',()=>{
 const id='estandar-integridad';caso(id);const p=leerProyecto(id);agregarReferencia(id,entrada);const antes=contextoCalidad(p,'4.vector'),ref=adjuntosReferencias(id,'4.vector')[0];writeFileSync(ref.ruta,Buffer.from('copia incompleta'));assert.notEqual(contextoCalidad(p,'4.vector'),antes);assert.throws(()=>adjuntosReferencias(id,'4.vector'),/copia íntegra/);retirarReferencia(id,ref.id,1,'jay');agregarReferencia(id,{...entrada,revision:2});assert.ok(adjuntosReferencias(id,'4.vector')[0].bytes.equals(png),'la reselección repara una copia dañada con el original sin alterar revisiones válidas');
 const otro='estandar-cupo';caso(otro);for(let i=0;i<4;i++){const a=guardarArchivo(otro,`ruta-${i}.png`,Buffer.concat([png,Buffer.from(String(i))]));agregarReferencia(otro,{...entrada,archivo:a.nombre,revision:i});}assert.throws(()=>agregarReferencia(otro,{...entrada,revision:4}),/hasta cuatro/);assert.equal(leerEstandar(otro).referencias.length,4);
});
