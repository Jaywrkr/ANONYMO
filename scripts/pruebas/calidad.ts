import {readFileSync} from 'node:fs';
// Evidencia real de navegador y Lighthouse, con revisión de IA falsa. Solo nube de prueba.
import assert from 'node:assert/strict';
import {leerEstandar,guardarArchivo,agregarReferencia,crear,existe,planificar,guardarProyecto,guardarEntrega,leerEntrega,leerProyecto,guardarSitio,controlInicial,avanzar,pedirControl,subirProyecto,real} from '../../packages/pipeline/src/index.ts';
if(process.env.SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.ANTHROPIC_BASE_URL!=='http://127.0.0.1:45888')throw new Error('Solo se permite la nube y la IA falsas.');
const pedido={id:'control-prueba',cliente:'Taller Control',tipo:'web' as const,descripcion:'Debe mostrar el equipo.',creado:new Date().toISOString()};
if(!existe(pedido.id))crear(pedido,planificar(pedido,{tareas:['4.vector'],preguntas:[]}));
if(!leerEstandar(pedido.id).referencias.length){guardarArchivo(pedido.id,'referencia-prueba.png',readFileSync(new URL('./imagen.png',import.meta.url)));agregarReferencia(pedido.id,{titulo:'Claridad de prueba',ambito:'web',archivo:'referencia-prueba.png',aprender:'Conservar una jerarquía clara para el equipo.',evitar:'Copiar la imagen como recurso de la web.',origen:'Imagen ficticia de prueba',quien:'jay',revision:leerEstandar(pedido.id).revision});}
const p=leerProyecto(pedido.id);p.requisitos=[];p.controlRondas={};delete p.controlPendiente;p.estado='esperando';p.modo='paso';p.tareas['4.vector']='lista';p.revision={tarea:'4.vector',fecha:new Date().toISOString()};guardarProyecto(p);
guardarSitio(pedido.id,1,{'index.html':'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Conoce el equipo del taller."><title>Equipo — Taller Control</title><style>body{margin:0;background:#f5f1e8;color:#172d25;font-family:system-ui}header,main,footer{padding:24px}h1{font-size:clamp(36px,7vw,88px)}p{max-width:55ch;line-height:1.6}a{color:inherit}img{max-width:100%}</style></head><body><header>Taller Control</header><main><h1>El equipo del taller</h1><p>Un equipo que cuida los detalles de cada proyecto.</p><a href="#contacto">Conocer al equipo</a><button type="button" id="ampliar" onclick="document.getElementById(this.getAttribute(&quot;aria-controls&quot;)).hidden=false" aria-controls="detalles">Ver detalles</button><p id="detalles" hidden>Detalles del equipo.</p><section id="contacto"><h2>Trabajamos contigo</h2><p>Desde la primera idea hasta la entrega.</p></section></main><footer>Una pieza ficticia para comprobar el estudio.</footer></body></html>','pruebas.json':JSON.stringify({version:1,pruebas:[390,1440].map(ancho=>({nombre:'Ver detalles '+ancho,pagina:'index.html',ancho,pasos:[{accion:'clic',selector:'#ampliar'}],resultado:{selector:'#detalles',visible:true}}))})});
const e={tarea:'4.vector' as const,agente:'vector',titulo:'Web del taller',contenido:'Una web con la presentación del equipo.',dice:'La web está generada.',necesita:'—',estado:'lista' as const,modo:'real' as const,version:1,creado:new Date().toISOString(),datos:{sitio:['index.html']}};
guardarEntrega(pedido.id,{...e,calidad:controlInicial(p,e)});
pedirControl(pedido.id,'4.vector');
await avanzar(pedido.id,real,()=>{},{max:1});
const final=leerEntrega(pedido.id,'4.vector')!;
assert.equal(final.calidad?.estado,'verificado',JSON.stringify(final.calidad));
assert.equal(final.calidad.capturas.length,2);
assert.equal(final.calidad.referencias?.length,1);
assert.equal(final.calidad.comprobaciones.filter(c=>c.id.startsWith('interaccion-')&&c.estado==='cumple').length,2);
assert.ok(final.calidad.auditoria?.celular.rendimiento!>=85);
assert.match(final.calidad.auditoria!.url,/sitio\/v1/);
assert.ok(!final.calidad.auditoria!.url.includes('127.0.0.1'));
console.log('✓ Versión 1 capturada en escritorio y celular, auditada con Lighthouse y revisada por la API falsa.');
await subirProyecto(pedido.id);
