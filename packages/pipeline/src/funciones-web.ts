// Comprueba la versión aislada. No navega a terceros ni envía formularios.
import type {Page} from 'playwright';
import type {Comprobacion} from './tipos.ts';
export interface PruebaWeb {nombre:string;pagina:string;ancho:390|1440;pasos:({accion:'clic';selector:string}|{accion:'rellenar';selector:string;valor:string})[];resultado:{selector:string;visible?:boolean;texto?:string};}
export function leerPruebasWeb(texto:string|undefined):{pruebas:PruebaWeb[];error?:string}{
 if(!texto)return {pruebas:[]};
 try{
  if(Buffer.byteLength(texto)>64000)throw new Error();
  const d=JSON.parse(texto),selector=(s:unknown)=>typeof s==='string'&&s.length>0&&s.length<=240;
  if(d.version!==1||!Array.isArray(d.pruebas)||d.pruebas.length>24)throw new Error();
  const nombres=new Set<string>(),grupos=new Map<string,number>();
  for(const p of d.pruebas){
   if(typeof p.nombre!=='string'||!p.nombre.trim()||p.nombre.length>120||nombres.has(p.nombre)||typeof p.pagina!=='string'||!p.pagina.endsWith('.html')||p.pagina.includes('..')||!(/^[a-zA-Z0-9_./-]+$/).test(p.pagina)||![390,1440].includes(p.ancho)||!Array.isArray(p.pasos)||!p.pasos.length||p.pasos.length>6)throw new Error();
   nombres.add(p.nombre);const grupo=p.pagina+':'+p.ancho;grupos.set(grupo,(grupos.get(grupo)??0)+1);if((grupos.get(grupo)??0)>12)throw new Error();
   if(p.pasos.some((s:Record<string,unknown>)=>!selector(s.selector)||!['clic','rellenar'].includes(s.accion as string)||s.accion==='rellenar'&&(typeof s.valor!=='string'||s.valor.length>300)))throw new Error();
   if(!p.resultado||!selector(p.resultado.selector)||(typeof p.resultado.visible!=='boolean'&&typeof p.resultado.texto!=='string')||p.resultado.texto!==undefined&&(typeof p.resultado.texto!=='string'||!p.resultado.texto.trim()||p.resultado.texto.length>500))throw new Error();
  }
  return {pruebas:d.pruebas};
 }catch{return {pruebas:[],error:'pruebas.json no tiene el formato admitido o supera sus límites. Corrige sus casos; no se ejecuta código de prueba arbitrario.'};}
}
export async function comprobarEnlaces(page:Page,pagina:string,ancho:number,base:string,leer:(ruta:string)=>Buffer|undefined):Promise<Comprobacion[]>{
 const enlaces=await page.locator('a').evaluateAll(as=>as.map(a=>({href:a.getAttribute('href'),nombre:(a.textContent??'').trim().slice(0,80)})));
 const fallos:string[]=[],pendientes:string[]=[];let locales=0,externos=0;
 if(enlaces.length>120)pendientes.push('Hay más de 120 enlaces: divide esta página para completar la revisión.');
 const fragmentos=new Map<string,Set<string>>();
 fragmentos.set(page.url().split('#')[0],new Set(await page.locator('[id],a[name]').evaluateAll(ns=>ns.flatMap(n=>[n.id,n.getAttribute('name')??'']))));
 for(const e of enlaces.slice(0,120)){
  const ref=e.href?.trim();if(!ref||ref==='#'){fallos.push(`«${e.nombre||'Enlace sin texto'}» no tiene destino útil.`);continue;}
  let u:URL;try{u=new URL(ref,page.url());}catch{fallos.push(`Destino inválido en «${e.nombre}».`);continue;}
  if(['mailto:','tel:'].includes(u.protocol)){if(!u.pathname.trim())fallos.push(`Contacto vacío en «${e.nombre}».`);else externos++;continue;}
  if(!['http:','https:'].includes(u.protocol)){fallos.push(`Protocolo no admitido en «${e.nombre}». Usa un botón para acciones.`);continue;}
  if(u.origin!==base){externos++;continue;}
  let ruta:string;try{ruta=decodeURIComponent(u.pathname).slice(1);}catch{fallos.push(`Ruta inválida en «${e.nombre}».`);continue;}
  const cuerpo=leer(ruta);if(!cuerpo){fallos.push(`«${e.nombre}» apunta a un archivo ausente: ${ruta||'/'}.`);continue;}locales++;
  if(u.hash){
   let ancla:string;try{ancla=decodeURIComponent(u.hash.slice(1));}catch{fallos.push(`Ancla inválida en ${ruta}.`);continue;}
   const destino=u.origin+u.pathname+u.search;
   let ids=fragmentos.get(destino);
   if(!ids){
    const otra=await page.context().newPage();
    try{await otra.goto(destino,{waitUntil:'load',timeout:6000});ids=new Set(await otra.locator('[id],a[name]').evaluateAll(ns=>ns.flatMap(n=>[n.id,n.getAttribute('name')??''])));fragmentos.set(destino,ids);}catch{pendientes.push(`No se pudo comprobar el ancla en ${ruta}.`);}finally{await otra.close();}
   }
   if(ids&&!ids.has(ancla))fallos.push(`Falta #${ancla} en ${ruta}.`);
  }
 }
 return [{id:`enlaces-${pagina}-${ancho}`,texto:`Enlaces de ${pagina} a ${ancho}px`,estado:fallos.length?'falla':pendientes.length?'pendiente':'cumple',evidencia:[`${locales} destinos locales encontrados. ${externos} enlaces externos o de contacto sin visitar ni enviar.`,...fallos.slice(0,20),...pendientes].join(' · ')}];
}
export async function comprobarInteracciones(page:Page,pagina:string,ancho:390|1440,base:string,plan:ReturnType<typeof leerPruebasWeb>,plazo?:number):Promise<Comprobacion[]>{
 const salida:Comprobacion[]=[],url=page.url();
 const controles=await page.locator('button,[role="button"],input[type="button"],input[type="submit"]').evaluateAll(ns=>ns.map((n,i)=>({i,nombre:(n.getAttribute('aria-label')??n.textContent??n.getAttribute('value')??'').trim().slice(0,80),visible:!!(n as HTMLElement).getClientRects().length&&getComputedStyle(n).visibility!=='hidden',deshabilitado:n.matches(':disabled')||n.getAttribute('aria-disabled')==='true',envia:!!(n as HTMLButtonElement).form&&['submit','image'].includes((n as HTMLButtonElement).type)})));
 const cubiertos=new Set<number>();
 const forms=await page.locator('form').count();
 if(forms)salida.push({id:`formularios-${pagina}-${ancho}`,texto:`Formularios de ${pagina} a ${ancho}px`,estado:'pendiente',evidencia:`${forms} formularios encontrados. Falta una prueba autorizada contra su destino real y comprobar recepción. Esta revisión no envía datos ni considera un mensaje de éxito como entrega recibida.`});
 if(plan.error)salida.push({id:`plan-funcional-${pagina}-${ancho}`,texto:'Casos de prueba del sitio',estado:'falla',evidencia:plan.error});
 for(const [i,p] of plan.pruebas.entries()){
  if(p.pagina!==pagina||p.ancho!==ancho)continue;
  if(plazo&&Date.now()>plazo-15000)throw new Error('Las funciones necesitan otra vuelta; las comprobaciones anteriores se conservan.');
  let estado:Comprobacion['estado']='cumple',evidencia='';let ultimoControl=-1;
  try{
   await page.goto(url,{waitUntil:'load',timeout:10000});
   const resultado=page.locator(p.resultado.selector);
   const cumple=async()=>{const n=await resultado.count();if(n===0)return p.resultado.visible===false&&p.resultado.texto===undefined;if(n!==1)return false;if(p.resultado.visible!==undefined&&await resultado.isVisible()!==p.resultado.visible)return false;if(p.resultado.texto!==undefined&&(await resultado.innerText()).trim()!==p.resultado.texto.trim())return false;return true;};
   let antesDelUltimoPaso=false;
   for(const paso of p.pasos){
    antesDelUltimoPaso=await cumple();ultimoControl=-1;
    const objetivo=page.locator(paso.selector);if(await objetivo.count()!==1)throw new Error('El selector debe identificar un único control: '+paso.selector);
    if(!await objetivo.isVisible()||!await objetivo.isEnabled())throw new Error('El control no está visible o habilitado: '+paso.selector);
    const riesgo=await objetivo.evaluate(n=>{const a=n.closest('a');const boton=n.closest('button,input') as HTMLButtonElement|null;return {href:a?.href,envia:!!boton?.form&&['submit','image'].includes(boton.type),indice:[...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')].indexOf(n.closest('button,[role="button"],input[type="button"],input[type="submit"]')??n)};});
    if(riesgo.envia)throw new Error('El caso intenta enviar un formulario. Su recepción requiere una prueba autorizada aparte.');
    if(riesgo.href&&new URL(riesgo.href).origin!==base)throw new Error('El caso intenta abrir un destino externo; no se visita.');
    if(paso.accion==='clic'){await objetivo.click({timeout:3000});ultimoControl=riesgo.indice;}else await objetivo.fill(paso.valor,{timeout:3000});
   }
   const fin=Date.now()+2500;while(!await cumple()&&Date.now()<fin)await new Promise(r=>setTimeout(r,100));
   if(antesDelUltimoPaso)throw new Error('El resultado ya se cumplía antes del último paso: el caso no demuestra que el control funcione.');
   if(!await cumple())throw new Error('No apareció el resultado esperado después de ejecutar los pasos.');
   if(ultimoControl>=0)cubiertos.add(ultimoControl);
   evidencia=`Tras ${p.pasos.length} pasos, ${p.resultado.selector} cambió y cumple ${JSON.stringify(p.resultado)}. La condición no se cumplía antes del último paso. Envíos y destinos externos bloqueados.`;
  }catch(error){estado='falla';evidencia=(error as Error).message.slice(0,900);}
  salida.push({id:`interaccion-${i}-${ancho}`,texto:`${p.nombre} · ${pagina} a ${ancho}px`,estado,evidencia});
 }
 const sinPrueba=controles.filter(c=>c.visible&&!c.deshabilitado&&!c.envia&&!cubiertos.has(c.i));
 if(sinPrueba.length)salida.push({id:`controles-${pagina}-${ancho}`,texto:`Controles de ${pagina} a ${ancho}px`,estado:'falla',evidencia:'Faltan casos ejecutados con cambio comprobable para: '+sinPrueba.slice(0,15).map(c=>c.nombre||`control ${c.i+1}`).join(', ')+'. Añade casos a pruebas.json; una captura no demuestra interacción.'});
 return salida;
}
