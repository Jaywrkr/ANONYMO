import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3100',id='memoria-prueba';
assert.ok([307,308,404].includes((await fetch(`${base}/estudio/${id}/atlas/consultar`,{redirect:'manual'})).status));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium'});
try{
 const p=await browser.newPage({viewport:{width:1440,height:960}}),errores=[];p.on('pageerror',e=>errores.push(e.message));
 await p.goto(base+'/entrar');await p.getByLabel('Clave').fill('prueba-clave-jay');await p.getByRole('button',{name:'Entrar al estudio',exact:true}).click();await p.waitForURL(base+'/estudio');
 const chat=p.getByRole('dialog',{name:'Chat con Atlas',exact:true}),abrir=p.getByRole('button',{name:'Abrir chat de Atlas',exact:true});assert.equal(await chat.isVisible(),false);await abrir.click();await chat.getByLabel('Proyecto de la conversación').selectOption(id);
 await chat.getByText(/Confirmadas y vigentes: 1/).waitFor();await chat.getByLabel('Tu consulta').fill('Un borrador que se conserva');await p.keyboard.press('Escape');await abrir.waitFor();await abrir.click();assert.equal(await chat.getByLabel('Tu consulta').inputValue(),'Un borrador que se conserva');
 await chat.getByLabel('Tu consulta').fill('Primera línea');await chat.getByLabel('Tu consulta').press('Shift+Enter');await chat.getByLabel('Tu consulta').type('Segunda línea');assert.equal(await chat.getByLabel('Tu consulta').inputValue(),'Primera línea\nSegunda línea');
 let peticiones=0;await p.route('**/atlas/consultar',async route=>{if(route.request().method()==='POST'){peticiones++;await new Promise(r=>setTimeout(r,500));}await route.continue();});
 await chat.getByLabel('Tu consulta').fill('¿Qué avanzó hoy?');await chat.getByLabel('Tu consulta').press('Enter');await chat.getByRole('status').waitFor();await chat.getByRole('button',{name:'Cerrar chat de Atlas'}).click();await abrir.click();await chat.getByRole('status').waitFor({state:'hidden'});await chat.getByText('Respuesta ficticia: revisa el avance del proyecto en sus registros.',{exact:true}).last().waitFor();assert.equal(peticiones,1);await p.screenshot({path:'/tmp/anonymo-pruebas/51-atlas-flotante-escritorio.png',fullPage:false});
 console.log('✓ Chat común: esquina inferior derecha, Enter envía, Shift+Enter crea línea, Escape cierra, borrador y respuesta se conservan al cerrar.');
 await chat.getByRole('link',{name:'Memoria y decisiones del proyecto ↗',exact:true}).click();await p.waitForURL(new RegExp(id+'/atlas'));assert.equal(await chat.isVisible(),false);
 await p.getByText('Decisiones registradas · 3',{exact:true}).click();for(const estado of ['Confirmada y vigente','Versión anterior','Contexto sin comprobar'])await p.getByText(estado,{exact:true}).waitFor();
 await p.getByRole('link',{name:'Ver entrega · v1',exact:true}).click();await p.waitForURL(/v=1/);await p.getByText('La versión anterior exploraba saturación.',{exact:true}).waitFor();
 console.log('✓ Memoria: confirmada, histórica y sin contexto; enlace a los bytes de la versión anterior.');
 await p.goto(base+'/estudio/cafe-lento');await abrir.click();await chat.getByLabel('Tu consulta').waitFor();assert.equal(await chat.getByLabel('Proyecto de la conversación').inputValue(),'cafe-lento');assert.equal(await chat.getByText(/Confirmadas y vigentes: 1/).count(),0);await chat.getByRole('button',{name:'Cerrar chat de Atlas'}).click();
 await p.setViewportSize({width:390,height:844});await p.goto(base+`/estudio/${id}`);const posicion=await abrir.boundingBox();assert.ok(posicion.x>195&&posicion.y>422);await abrir.click();await chat.getByLabel('Tu consulta').waitFor();assert.equal(await chat.getByLabel('Proyecto de la conversación').inputValue(),id);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390));
 await p.setViewportSize({width:390,height:500});await p.waitForFunction(()=>{const b=document.getElementById('atlas-ventana').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;});const caja=await chat.boundingBox(),entrada=await chat.getByLabel('Tu consulta').boundingBox();assert.ok(caja.y>=0&&caja.y+caja.height<=500);assert.ok(entrada.y+entrada.height<=500);
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/anonymo-pruebas/51-atlas-flotante-movil.png',fullPage:false});assert.deepEqual(errores,[]);
 console.log('✓ Contexto aislado por proyecto; móvil sin desbordamiento y controles visibles al reducir el alto del visor.');
}finally{await browser.close();}
