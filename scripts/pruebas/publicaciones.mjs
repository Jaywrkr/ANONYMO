// PostgreSQL real + protocolo HTTP de Storage falso. No conecta a servicios ni proyectos reales.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {chromium} from 'playwright';
import {conPostgresTemporal} from './postgres.mjs';
import {crearStorageFalso} from './supabase-falso.mjs';
const metodos={anonymo_leer_publicacion:['p_proyecto'],anonymo_listar_publicaciones:[],anonymo_publicar:['p_proyecto','p_base','p_id','p_huella','p_archivos','p_trabajo','p_propietario','p_reserva','p_correcto','p_error'],anonymo_encolar:['p_proyecto','p_id'],anonymo_tomar_trabajo:['p_proyecto','p_propietario','p_segundos'],anonymo_pulso:['p_id','p_propietario','p_revision','p_vivo'],anonymo_estado_trabajo:['p_proyecto'],anonymo_terminar_trabajo:['p_id','p_propietario','p_revision','p_resultado','p_correcto'],anonymo_guardados_de:['p_proyecto']};
const tablas=new Set(['anonymo_listar_publicaciones','anonymo_tomar_trabajo','anonymo_guardados_de']);
await conPostgresTemporal(async({admin,conectar})=>{
 await admin.query(readFileSync(new URL('../../infra/publicaciones.sql',import.meta.url),'utf8'));const db=await conectar();await db.query('set role service_role');
 const server=crearStorageFalso(async(nombre,d)=>{const campos=metodos[nombre];if(!campos)throw new Error('Método no admitido');const r=await db.query(`select * from public.${nombre}(${campos.map((_,i)=>'$'+(i+1)).join(',')})`,campos.map(c=>d[c]??null));return tablas.has(nombre)?r.rows:r.rows[0]?.[nombre]??null;});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`,raiz=mkdtempSync(join(tmpdir(),'anonymo-publicaciones-'));
 process.env.SUPABASE_URL=url;process.env.SUPABASE_SERVICE_KEY='clave-falsa';process.env.ANONYMO_NUBE='1';process.env.ANONYMO_ALMACEN_VERSIONADO='1';
 const p=await import('../../packages/pipeline/src/index.ts');const id='piloto-publicacion';
 const copia=(n,fn)=>p.enPublicacion(()=>p.enCarpeta(join(raiz,n),fn));
 const pedido={id,cliente:'Taller ficticio',tipo:'web',descripcion:'Ensayo aislado.',creado:new Date().toISOString()};
 try{
  await copia('inicial',async()=>{await p.bajarProyecto(id,fetch,true);p.crear(pedido,p.planificar(pedido,{tareas:['1.atlas']}));await p.subirProyecto(id);});
  assert.equal((await p.indiceActual(id)).revision,1);
  let liberarA,liberarB;const esperarA=new Promise(r=>liberarA=r),esperarB=new Promise(r=>liberarB=r);let listoA,listoB;const aLista=new Promise(r=>listoA=r),bLista=new Promise(r=>listoB=r);
  const a=copia('a',async()=>{await p.bajarProyecto(id,fetch,true);const antes=p.huellaProyecto(id);const q=p.leerProyecto(id);q.notasCliente=[{texto:'Cambio A',fecha:new Date().toISOString()}];p.guardarProyecto(q);listoA();await esperarA;return p.subirDistintos(id,antes);});
  const b=copia('b',async()=>{await p.bajarProyecto(id,fetch,true);const antes=p.huellaProyecto(id);const q=p.leerProyecto(id);q.notasCliente=[{texto:'Cambio B',fecha:new Date().toISOString()}];p.guardarProyecto(q);listoB();await esperarB;return p.subirDistintos(id,antes);});
  await Promise.all([aLista,bLista]);liberarA();await a;liberarB();await assert.rejects(b,/cambió mientras/);assert.match(await p.leerRemoto(id,'estado.json'),/Cambio A/);assert.doesNotMatch(await p.leerRemoto(id,'estado.json'),/Cambio B/);assert.equal((await p.guardadosVersionados(id)).length,1);
  // Una vuelta antigua que todavía escribe las rutas anteriores no modifica la revisión autoritativa.
  await fetch(url+`/storage/v1/object/proyectos/${id}/estado.json`,{method:'POST',body:'{"intruso":true}'});assert.doesNotMatch(await p.leerRemoto(id,'estado.json'),/intruso/);
  console.log('✓ Dos copias de la misma base: la segunda no sobrescribe; conserva su avance. La ruta antigua deja de ser autoritativa.');
  await p.encolarVersionado(id);const reservaA=await p.tomarVersionado(id);assert.ok(reservaA);assert.equal(await p.tomarVersionado(id),undefined);await copia('pulso',()=>p.conReserva(reservaA,()=>p.pulsoVersionado(id,{latido:new Date().toISOString(),fase:'escribiendo',palabras:32})));const senal=JSON.parse(await p.leerRemoto(id,'vivo.json'));assert.equal(senal.palabras,32);assert.equal(senal.fin,undefined);assert.equal(senal.vuelta,reservaA.propietario);
  await copia('antiguo',async()=>p.conReserva(reservaA,async()=>{await p.bajarProyecto(id,fetch,true);const antes=p.huellaProyecto(id);await admin.query("update anonymo_trabajos set vence=now()-interval '1 second' where id=$1",[reservaA.id]);const reservaB=await p.tomarVersionado(id);assert.ok(reservaB.revision>reservaA.revision);const q=p.leerProyecto(id);q.pedido.descripcion='Resultado del propietario anterior';p.guardarProyecto(q);await assert.rejects(p.subirDistintos(id,antes),/reserva dejó/);
   await copia('nuevo',async()=>p.conReserva(reservaB,async()=>{await p.bajarProyecto(id,fetch,true);const prev=p.huellaProyecto(id);const actual=p.leerProyecto(id);actual.pedido.descripcion='Resultado del propietario vigente';p.guardarProyecto(actual);await p.subirDistintos(id,prev);}));
  }));assert.match(await p.leerRemoto(id,'estado.json'),/propietario vigente/);assert.doesNotMatch(await p.leerRemoto(id,'estado.json'),/propietario anterior/);
  console.log('✓ Reserva recuperada: el propietario anterior no cambia el índice, el vigente publica archivos y cierre juntos.');
  const revision=(await p.indiceActual(id)).revision;let perder=true;
  const incierta=async(u,op)=>{const r=await fetch(u,op);if(String(u).endsWith('/anonymo_publicar')&&perder){perder=false;await r.text();throw new Error('Respuesta perdida después del commit');}return r;};
  await copia('respuesta-perdida',async()=>{await p.bajarProyecto(id,fetch,true);const antes=p.huellaProyecto(id);const q=p.leerProyecto(id);q.pedido.descripcion='Guardado confirmado tras perder la respuesta';p.guardarProyecto(q);await p.subirDistintos(id,antes,true,incierta);});assert.equal((await p.indiceActual(id)).revision,revision+1);
  console.log('✓ Respuesta perdida tras el commit: reintento con el mismo recibo, una sola revisión nueva.');
  // Carrera real entre conexiones: también protege la primera publicación (aún no hay fila que bloquear).
  const mapa=(await p.indiceActual(id)).archivos,cols=Object.keys(mapa);const carrera='carrera-publicacion';
  const mapaCarrera=Object.fromEntries(cols.map(r=>[r,{...mapa[r],objeto:mapa[r].objeto.replace(id,carrera)}]));
  const c1=await conectar(),c2=await conectar();const guardar=c=>c.query('select anonymo_publicar($1,0,$2,$3,$4)',[carrera,randomUUID(),'a'.repeat(64),mapaCarrera]);
  const resultados=await Promise.all([guardar(c1),guardar(c2)]);assert.deepEqual(resultados.map(r=>r.rows[0].anonymo_publicar.estado).sort(),['conflicto','publicado']);
  await admin.query('delete from anonymo_publicaciones where proyecto=$1',[carrera]);await admin.query('delete from anonymo_guardados where proyecto=$1',[carrera]);
  console.log('✓ Primera publicación simultánea en dos conexiones: una gana y la otra conserva el conflicto.');
  // Integración opcional con el build: navegador, acción real, cola SQL y vuelta en segundo plano.
  if(process.env.PROBAR_ESTUDIO_VERSIONADO==='1'){
   let token;const piloto='piloto-estudio';await copia('estudio-semilla',async()=>{await p.bajarProyecto(piloto,fetch,true);const ped={...pedido,id:piloto};p.crear(ped,p.planificar(ped,{tareas:['1.atlas']}),'plan');token=p.tokenPortal(piloto);await p.subirProyecto(piloto);});
   const puerto=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>r(n));});});
   const base=`http://127.0.0.1:${puerto}`,next=spawn(process.execPath,[new URL('../../node_modules/next/dist/bin/next',import.meta.url).pathname,'start','-p',String(puerto)],{cwd:new URL('../../apps/web/',import.meta.url),env:{...process.env,ANONYMO_PROYECTOS:join(raiz,'estudio'),ESTUDIO:'1',ANTHROPIC_API_KEY:'sk-ant-prueba-falsa',ANTHROPIC_BASE_URL:url,ESTUDIO_CLAVE_JAY:'prueba-clave-jay',ESTUDIO_SECRETO:'secreto-ficticio-publicaciones-prueba-53',ANONYMO_PROYECTOS_VERSIONADOS:piloto+','+id},stdio:['ignore','pipe','pipe']});let log='';next.stdout.on('data',b=>log+=b);next.stderr.on('data',b=>log+=b);let nav;
   try{
    for(let i=0;i<100;i++){try{if((await fetch(base+'/entrar')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
    nav=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium'});const pagina=await nav.newPage({viewport:{width:390,height:844}});
    await pagina.goto(base+'/entrar');await pagina.fill('input[name="clave"]','prueba-clave-jay');await pagina.click('text=Entrar al estudio');await pagina.waitForURL(base+'/estudio');
    await pagina.goto(base+'/estudio/'+piloto);await pagina.waitForLoadState('networkidle');await pagina.check('input[name="motor"][value="simulado"]');await pagina.click("button:has-text('Que empiecen')");
    let estado;for(let i=0;i<100;i++){estado=JSON.parse(await p.leerRemoto(piloto,'estado.json'));if(estado.tareas['1.atlas']==='lista')break;await new Promise(r=>setTimeout(r,300));}
    assert.equal(estado.tareas['1.atlas'],'lista',log);assert.ok((await p.indiceActual(piloto)).revision>=3);assert.equal((await p.estadoCola(piloto)).estado,'terminado');
    await pagina.goto(base+'/estudio/'+id+'/guardados');await pagina.getByRole('heading',{name:'Avances guardados'}).waitFor();await pagina.locator('details summary').first().click();const descarga=pagina.locator('a[href*="?archivo="]').first();const enlace=await descarga.getAttribute('href');const b=await pagina.evaluate(async href=>{const r=await fetch(href);return {status:r.status,tipo:r.headers.get('content-type'),disposicion:r.headers.get('content-disposition'),bytes:(await r.arrayBuffer()).byteLength};},enlace);assert.equal(b.status,200);assert.equal(b.tipo,'application/octet-stream');assert.match(b.disposicion,/attachment/);assert.ok(b.bytes>0);
    const anonimo=await fetch(base+enlace,{redirect:'manual'});assert.ok([404,307].includes(anonimo.status));if(anonimo.status===307)assert.equal(new URL(anonimo.headers.get('location'),base).pathname,'/entrar');
    assert.equal(await pagina.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await pagina.goto(base+'/portal/'+piloto+'?t='+token);await pagina.fill('textarea[name="texto"]','Comentario ficticio del portal versionado');await pagina.locator('form').filter({has:pagina.locator('textarea[name="texto"]')}).getByRole('button').click();await pagina.waitForURL(u=>u.searchParams.has('m'));assert.match(await p.leerRemoto(piloto,'estado.json'),/Comentario ficticio del portal versionado/);
    console.log('✓ Portal: comentario de cliente confirmado mediante la copia aislada y el índice versionado.');
    console.log('✓ Estudio móvil real: iniciar → cola → vuelta → publicación atómica; avance privado descargable y denegado sin sesión.');
   }catch(e){console.error(log);throw e;}finally{await nav?.close();next.kill('SIGTERM');await new Promise(r=>next.exitCode!==null?r():next.once('exit',r));}
  }
  // Importación expresa: rechaza trabajo activo y solo admite una copia antigua estable.
  const legado='piloto-importacion';await copia('legado',async()=>{const ped={...pedido,id:legado};p.crear(ped,p.planificar(ped,{tareas:['1.atlas']}),'plan');const ruta=join(p.carpeta(),legado,'estado.json');const activo={...p.leerProyecto(legado),estado:'en-curso'};await fetch(url+`/storage/v1/object/proyectos/${legado}/estado.json`,{method:'POST',body:JSON.stringify(activo)});await assert.rejects(p.importarProyectoVersionado(legado),/Pausa el proyecto/);assert.equal(await p.indiceActual(legado),null);await fetch(url+`/storage/v1/object/proyectos/${legado}/estado.json`,{method:'POST',body:readFileSync(ruta)});await p.importarProyectoVersionado(legado);assert.equal((await p.indiceActual(legado)).revision,1);});
  console.log('✓ Importación privada y explícita: proyecto activo rechazado; copia antigua estable publicada sin borrar el origen.');
  // Un fallo remoto dentro de una reserva se transmite a la carpeta aislada que debe conservar la copia.
  await copia('incierta',async()=>{await p.bajarProyecto(id,fetch,true);const antes=p.huellaProyecto(id),q=p.leerProyecto(id);q.pedido.descripcion='Respuesta de publicación incierta';p.guardarProyecto(q);await assert.rejects(p.conReserva({id:randomUUID(),proyecto:id,propietario:randomUUID(),revision:1},()=>p.subirDistintos(id,antes,false,async(u,op)=>{if(String(u).endsWith('/anonymo_publicar'))throw new Error('Sin conexión');return fetch(u,op);})),/No se pudo confirmar/);assert.equal(p.hayPublicacionSinConfirmar(),true);});
  console.log('✓ Respuesta incierta: conserva la señal de recuperación fuera del ámbito de la reserva.');
  const actual=await p.indiceActual(id),entrada=actual.archivos['estado.json'];await fetch(url+`/storage/v1/object/proyectos/${entrada.objeto}`,{method:'POST',body:'alterado'});await assert.rejects(p.leerRemoto(id,'estado.json'),/no coincide/);
  const anon=await conectar();await anon.query('set role anon');await assert.rejects(anon.query("select anonymo_leer_publicacion('piloto-publicacion')"),/permission denied/);await assert.rejects(anon.query('select * from anonymo_guardados'),/permission denied/);
  console.log('✓ Contenido alterado rechazado; índices y avances no son accesibles al rol anónimo.');
 }finally{await new Promise(r=>server.close(r));}
});
