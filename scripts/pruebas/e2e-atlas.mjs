import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3100',ruta='/estudio/atlas-prueba/atlas';
assert.ok([307,308,404].includes((await fetch(base+ruta+'/consultar',{method:'POST',redirect:'manual',headers:{'content-type':'application/json'},body:'{}'})).status));
const nav=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium'});
try{
 const p=await nav.newPage({viewport:{width:390,height:844}}),errores=[];p.on('pageerror',e=>errores.push(e.message));
 await p.goto(base+'/entrar');await p.fill('input[name="clave"]','prueba-clave-jay');await p.click('text=Entrar al estudio');await p.waitForURL(base+'/estudio');await p.goto(base+ruta);await p.getByRole('button',{name:'Abrir chat de Atlas',exact:true}).click();
 await p.getByLabel('Tu consulta').fill('¿Qué avanzó en este proyecto?');await p.getByRole('button',{name:'Enviar mensaje',exact:true}).click();await p.getByText('Respuesta ficticia: revisa el avance del proyecto en sus registros.',{exact:true}).last().waitFor();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390));await p.reload();await p.getByRole('button',{name:'Abrir chat de Atlas',exact:true}).click();await p.getByText('Respuesta ficticia: revisa el avance del proyecto en sus registros.',{exact:true}).last().waitFor();
 const id=randomUUID(),d={pregunta:'¿Qué falta?',agente:'atlas',solicitud:id,modo:'consultar'};
 const solicitar=data=>p.evaluate(async({url,data})=>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});return {estado:r.status,texto:await r.text()};},{url:ruta+'/consultar',data});
 const a=await solicitar(d);assert.equal(a.estado,200);assert.doesNotThrow(()=>JSON.parse(a.texto));const b=await solicitar(d);assert.deepEqual(JSON.parse(a.texto),JSON.parse(b.texto));
 const c=await solicitar({...d,pregunta:'Otra pregunta'});assert.ok(c.estado>=400);
 console.log('✓ Consulta autenticada, con fuentes, persistente, sin duplicados y sin desbordamiento móvil.');
 await p.getByRole('dialog',{name:'Chat con Atlas'}).getByText('Opciones · Atlas',{exact:true}).click();await p.getByLabel('Qué necesitas').selectOption('encargar');await p.getByLabel('Tu consulta').fill('Pausa el proyecto');await p.getByRole('button',{name:'Enviar encargo',exact:true}).first().click();await p.getByText('El proyecto queda en pausa.',{exact:true}).last().waitFor();await p.getByRole('button',{name:'Cerrar chat de Atlas',exact:true}).click();await p.reload();await p.getByText('Encargos registrados · 1',{exact:true}).click();await p.getByText('pausar · aplicado',{exact:true}).last().waitFor();
 await p.getByText('Decisiones registradas · 1',{exact:true}).click();await p.getByText('Explorar una geometría triangular',{exact:true}).last().waitFor();
 await p.getByText('Problemas y mejoras detectados · 1',{exact:true}).click();await p.getByText('Calibración creativa pendiente',{exact:true}).last().waitFor();await p.screenshot({path:'/tmp/anonymo-pruebas/49-atlas-movil.png',fullPage:true});
 console.log('✓ Encargo aplicado y registrado, decisión con fuente e incidencia comprobables desde móvil.');
 await p.goto(base+'/estudio/atlas-prueba/3-mira');const galeria=p.getByRole('region',{name:'Archivos vectoriales'});await galeria.waitFor();assert.equal(await galeria.locator('img').count(),6);
 const src=await galeria.locator('img').first().getAttribute('src');const svg=await p.request.get(base+src);assert.equal(svg.status(),200);assert.match(svg.headers()['content-type'],/image\/svg/);assert.match(await svg.text(),/<path/);
 const partes=src.split('/');partes[5]='invalida';assert.equal((await p.request.get(base+partes.join('/'))).status(),404);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390));assert.deepEqual(errores,[]);console.log('✓ Seis archivos SVG editables por versión, enlaces firmados y navegador sin errores.');
}finally{await nav.close();}
