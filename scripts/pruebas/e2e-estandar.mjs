import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3100';
assert.ok([307,308,404].includes((await fetch(base+'/estudio/conexiones/comprobar',{method:'POST',redirect:'manual'})).status));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium'});
try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),errores=[];p.on('pageerror',e=>errores.push(e.message));
 await p.goto(base+'/entrar');await p.locator('input[name="clave"]').fill('prueba-clave-jay');await p.getByRole('button',{name:'Entrar al estudio',exact:true}).click();await p.waitForURL(base+'/estudio');
 await p.goto(base+'/estudio/conexiones');assert.equal(await p.getByText(/Conexión comprobada/).count(),0);await p.getByRole('button',{name:'Comprobar conexiones',exact:true}).click();await p.getByText('Conexión de IA · Conexión comprobada',{exact:true}).waitFor();await p.getByText('Almacén privado · Conexión comprobada',{exact:true}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390));
 console.log('✓ Conexiones autenticadas: solo aparecen comprobadas tras respuesta válida de IA y almacén privado falsos.');
 const abrir=async n=>{const s=p.getByText('Referencias de calidad · '+n,{exact:true});if(!await s.locator('..').evaluate(d=>d.open))await s.click();};
 await p.goto(base+'/estudio/control-prueba/calidad');await abrir(1);const imagen=p.getByAltText('Claridad de prueba',{exact:true});await imagen.waitFor();const src=await imagen.getAttribute('src');const consultar=src=>p.evaluate(async src=>{const r=await fetch(src);return {estado:r.status,tipo:r.headers.get('content-type')};},src);const copia=await consultar(src);assert.equal(copia.estado,200);assert.match(copia.tipo,/^image\//);
 const anon=await browser.newContext();const r=await anon.request.get(base+src,{maxRedirects:0});assert.ok([307,308,404].includes(r.status()));await anon.close();
 await p.getByRole('button',{name:'Retirar de la selección',exact:true}).click();await p.waitForURL(/ok=/);await abrir(0);
 await p.getByLabel('Nombre de la referencia',{exact:true}).fill('Ritmo nuevo de prueba');await p.getByLabel('Qué debe aportar al diseño',{exact:true}).fill('Jerarquía clara y diferenciada en el contenido.');await p.getByLabel('Qué debemos evitar',{exact:true}).fill('Copiar la composición de la imagen.');await p.getByLabel('Origen de la referencia',{exact:true}).fill('Ejemplo ficticio local');await p.getByRole('button',{name:'Guardar referencia',exact:true}).click();await p.waitForURL(/ok=/);
 await p.getByText('Revisión pendiente',{exact:true}).first().waitFor();assert.equal((await consultar(src)).estado,200);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390));
 await abrir(1);await p.getByText('Ritmo nuevo de prueba',{exact:true}).waitFor();await p.screenshot({path:'/tmp/anonymo-pruebas/52-referencias-movil.png',fullPage:true});assert.deepEqual(errores,[]);
 console.log('✓ Selección privada, historial conservado al retirar, nuevo criterio invalida la revisión y móvil sin desbordamiento.');
}finally{await browser.close();}
