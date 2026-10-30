// Navegador real y sitios ficticios. No requiere claves ni servicios externos.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {comprobarEnlaces,comprobarInteracciones,leerPruebasWeb} from '../../packages/pipeline/src/funciones-web.ts';
import {navegadorCalidad} from '../../packages/pipeline/src/inspeccionar.ts';
import {enCarpeta,crear,planificar,guardarSitio,controlar,leerProyecto,controlInicial,estadoEntrega} from '../../packages/pipeline/src/index.ts';
process.env.ANONYMO_PROYECTOS=mkdtempSync(join(tmpdir(),'anonymo-funciones-'));
await enCarpeta(process.env.ANONYMO_PROYECTOS!,async()=>{
const html=(c:string)=>`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba ficticia</title><style>body{font:18px system-ui;padding:24px;color:#111;background:white}button,input{font:inherit;padding:12px}a{color:#163d2e}</style></head><body><main><h1>Taller ficticio</h1>${c}</main></body></html>`;
const archivos:Record<string,string>={
 'index.html':html('<a href="equipo.html#personas">Equipo</a><a href="mailto:prueba@example.invalid">Correo</a><button type="button" id="menu" onclick="document.querySelector(\'#panel\').hidden=!document.querySelector(\'#panel\').hidden">Menú</button><nav id="panel" hidden><a href="equipo.html">Conocer el taller</a></nav>'),
 'cobertura.html':html('<button type="button" id="muerto">Sin acción</button><button type="button" id="activo" onclick="document.querySelector(\'#salida\').hidden=false">Mostrar</button><p id="salida" hidden>Visible</p>'),
 'equipo.html':html('<section id="personas"><h2>Personas</h2></section>'),
 'roto.html':html('<a href="ausente.html">Archivo perdido</a><a href="equipo.html#no-existe">Ancla perdida</a><a href="#">Sin destino</a><a href="javascript:void(0)">Enlace falso</a>'),
 'formulario.html':html('<form action="https://example.invalid/recibir" method="post"><label>Correo<input name="email" type="email" required></label><button id="enviar">Enviar</button></form>'),
};
let enviados=0;
const servidor=createServer((req,res)=>{if(req.method!=='GET')enviados++;const c=archivos[new URL(req.url!,'http://localhost').pathname.slice(1)];res.writeHead(c?200:404,{'content-type':'text/html'});res.end(c??'Ausente');});
await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(servidor.address() as {port:number}).port}`;
const browser=await navegadorCalidad();
try{
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===base&&r.request().method()==='GET'?r.continue():r.abort());
 const page=await ctx.newPage();await page.goto(base+'/index.html');
 assert.ok((await comprobarEnlaces(page,'index.html',390,base,r=>archivos[r]?Buffer.from(archivos[r]):undefined)).every(c=>c.estado==='cumple'));
 const casos=leerPruebasWeb(JSON.stringify({version:1,pruebas:[390,1440].flatMap(ancho=>[
 {nombre:'Abrir menú '+ancho,pagina:'index.html',ancho,pasos:[{accion:'clic',selector:'#menu'}],resultado:{selector:'#panel',visible:true}},
 {nombre:'Cerrar menú '+ancho,pagina:'index.html',ancho,pasos:[{accion:'clic',selector:'#menu'},{accion:'clic',selector:'#menu'}],resultado:{selector:'#panel',visible:false,texto:'Conocer el taller'}},
 ])}));
 // Se comprueba abrir y cerrar, aunque el cierre regrese al estado inicial.
 const primer=await comprobarInteracciones(page,'index.html',390,base,casos);assert.equal(primer.find(c=>c.texto.startsWith('Abrir'))?.estado,'cumple');assert.equal(primer.find(c=>c.texto.startsWith('Cerrar'))?.estado,'cumple');
 await page.goto(base+'/index.html');const trivial=leerPruebasWeb(JSON.stringify({version:1,pruebas:[{nombre:'Sin cambio',pagina:'index.html',ancho:390,pasos:[{accion:'clic',selector:'#menu'}],resultado:{selector:'h1',texto:'Taller ficticio'}}]}));assert.ok((await comprobarInteracciones(page,'index.html',390,base,trivial)).some(c=>c.estado==='falla'));
 console.log('✓ Enlaces locales y anclas reales; menú cambia de estado; una condición ya satisfecha no se acepta como prueba.');
 await page.goto(base+'/cobertura.html');const cobertura=await comprobarInteracciones(page,'cobertura.html',390,base,leerPruebasWeb(JSON.stringify({version:1,pruebas:[{nombre:'No encubrir botones muertos',pagina:'cobertura.html',ancho:390,pasos:[{accion:'clic',selector:'#muerto'},{accion:'clic',selector:'#activo'}],resultado:{selector:'#salida',visible:true}}]})));assert.ok(cobertura.some(c=>c.estado==='falla'&&c.evidencia.includes('Sin acción')));
 await page.goto(base+'/roto.html');const rotos=await comprobarEnlaces(page,'roto.html',390,base,r=>archivos[r]?Buffer.from(archivos[r]):undefined);assert.equal(rotos[0].estado,'falla');for(const texto of ['ausente.html','#no-existe','destino útil','Protocolo no admitido'])assert.ok(rotos[0].evidencia.includes(texto));
 console.log('✓ Se rechazan archivo ausente, ancla inexistente, enlace vacío y protocolo de script.');
 await page.goto(base+'/index.html');assert.ok((await comprobarInteracciones(page,'index.html',1440,base,leerPruebasWeb(undefined))).some(c=>c.estado==='falla'));
 assert.ok(leerPruebasWeb('{mal').error);assert.ok(leerPruebasWeb(JSON.stringify({version:1,pruebas:[{nombre:'Ejecutar código',pagina:'index.html',ancho:390,pasos:[{accion:'evaluar',selector:'body'}],resultado:{selector:'body',visible:true}}]})).error);
 await page.goto(base+'/formulario.html');const formulario=await comprobarInteracciones(page,'formulario.html',390,base,leerPruebasWeb(JSON.stringify({version:1,pruebas:[{nombre:'No enviar',pagina:'formulario.html',ancho:390,pasos:[{accion:'clic',selector:'#enviar'}],resultado:{selector:'#confirmacion',visible:true}}]})));assert.ok(formulario.some(c=>c.estado==='pendiente'&&c.id.startsWith('formularios-')));assert.ok(formulario.some(c=>c.estado==='falla'));assert.equal(enviados,0);
 console.log('✓ Sin casos reproducibles no se verifican botones; los formularios no se envían y quedan pendientes.');
 // Integración real con la puerta de calidad: ni la IA ni Lighthouse pueden tapar un enlace roto.
 const pedido={id:'funciones-prueba',cliente:'Taller ficticio',tipo:'web' as const,descripcion:'Web de prueba.',creado:new Date().toISOString()};crear(pedido,planificar(pedido,{tareas:['4.vector']}));const p=leerProyecto(pedido.id);
 guardarSitio(pedido.id,1,{'index.html':archivos['roto.html'],'equipo.html':archivos['equipo.html']});
 const e={tarea:'4.vector' as const,agente:'vector',titulo:'Web ficticia',contenido:'Una web de prueba con fallos deliberados.',dice:'Prueba.',necesita:'—',estado:'lista' as const,modo:'real' as const,version:1,creado:new Date().toISOString()};
 const informe=await controlar(p,e,false);assert.equal(informe.estado,'cambios');assert.equal(informe.capturas.length,4);assert.ok(informe.comprobaciones.some(c=>c.id.startsWith('enlaces-')&&c.estado==='falla'));assert.equal(informe.nota,undefined);assert.equal(informe.auditoria,undefined);
 const legado={...e,calidad:{...controlInicial(p,e),estado:'verificado' as const,huella:'huella-del-control-anterior'}};assert.equal(estadoEntrega(p,legado),'pendiente');
 guardarSitio(pedido.id,2,{'index.html':archivos['formulario.html']});const sinConectar=await controlar(p,{...e,version:2},false);assert.equal(sinConectar.estado,'pendiente');assert.ok(sinConectar.comprobaciones.some(c=>c.id.startsWith('formularios-')));
 guardarSitio(pedido.id,3,{'index.html':html('<button type="button" id="simular" onclick="fetch(&quot;https://example.invalid/recibir&quot;,{method:&quot;POST&quot;}).catch(()=>document.querySelector(&quot;#respuesta&quot;).textContent=&quot;Enviado&quot;)">Enviar por servicio</button><p id="respuesta">Pendiente</p>'),'pruebas.json':JSON.stringify({version:1,pruebas:[390,1440].map(ancho=>({nombre:'Respuesta local '+ancho,pagina:'index.html',ancho,pasos:[{accion:'clic',selector:'#simular'}],resultado:{selector:'#respuesta',texto:'Enviado'}}))})});
 const conexion=await controlar(p,{...e,version:3},false);assert.equal(conexion.estado,'pendiente');assert.ok(conexion.comprobaciones.some(c=>c.id.startsWith('conexion-')));
 guardarSitio(pedido.id,4,{'index.html':html('<link rel="stylesheet" href="ausente.css"><p>Recurso sin archivo.</p>')});const recursos=await controlar(p,{...e,version:4},false);assert.equal(recursos.estado,'cambios');assert.ok(recursos.comprobaciones.some(c=>c.evidencia.includes('ausente.css')));
 console.log('✓ Control integrado: fallo real → cambios; recepción no probada → pendiente; se conservan capturas y no se compra una nota de IA para ocultarlo.');
}finally{await browser.close();await new Promise<void>(r=>servidor.close(()=>r()));}

});
