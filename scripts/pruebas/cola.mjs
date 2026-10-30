// PostgreSQL real y efímero. Nunca usa URLs, credenciales ni bases de datos existentes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const bin=process.env.POSTGRES_BIN;
if(!bin||!existsSync(join(bin,'initdb'))||!existsSync(join(bin,'pg_ctl')))throw new Error('Indica POSTGRES_BIN con los binarios de PostgreSQL para crear una base temporal propia. No se admite conectar a bases existentes.');
const temporal=mkdtempSync(join(tmpdir(),'anonymo-cola-')),data=join(temporal,'datos');
const comando=(nombre,args)=>{const r=spawnSync(join(resolve(bin),nombre),args,{encoding:'utf8',timeout:30000});if(r.status!==0)throw new Error(`${nombre} no terminó: ${(r.stderr||r.stdout||String(r.error)).slice(0,1500)}`);return r.stdout;};
const puerto=await new Promise((ok,mal)=>{const s=createServer();s.on('error',mal);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>ok(n));});});
comando('initdb',['-D',data,'-A','trust','--no-locale','-U','postgres']);
let iniciado=false;const conexiones=[];
const conectar=async()=>{const c=new pg.Client({host:'127.0.0.1',port:puerto,user:'postgres',database:'postgres',connectionTimeoutMillis:5000,options:'-c statement_timeout=3000 -c idle_in_transaction_session_timeout=10000'});await c.connect();conexiones.push(c);return c;};
try{
 comando('pg_ctl',['-D',data,'-l',join(temporal,'servidor.log'),'-o',`-h 127.0.0.1 -p ${puerto} -k ${temporal}`,'-w','start']);iniciado=true;
 const admin=await conectar();await admin.query('create role anon;create role authenticated;create role service_role bypassrls;');await admin.query(readFileSync(new URL('../../infra/cola.sql',import.meta.url),'utf8'));
 const a=await conectar(),b=await conectar();await a.query('set role service_role');await b.query('set role service_role');const propietarioA=randomUUID(),propietarioB=randomUUID();
 const insertar=async(proyecto,limite=3)=>{const id=randomUUID();await admin.query('insert into anonymo_trabajos(id,proyecto,entrada,limite) values($1,$2,$3,$4)',[id,proyecto,{caso:'ficticio'},limite]);return id;};
 const tomar=(c,p,quien)=>c.query('select * from anonymo_tomar_trabajo($1,$2,60)',[p,quien]);
 const cerrar=(c,j,quien,rev)=>c.query('select anonymo_terminar_trabajo($1,$2,$3,$4,true) as correcto',[j,quien,rev,{prueba:'ficticia'}]);
 for(let i=0;i<8;i++){
  const proyecto='simultaneo-'+i;await insertar(proyecto);await insertar(proyecto);const respuestas=await Promise.all([tomar(a,proyecto,propietarioA),tomar(b,proyecto,propietarioB)]);assert.equal(respuestas.reduce((n,r)=>n+r.rows.length,0),1);
  const ganador=respuestas.find(r=>r.rows.length).rows[0];if(i===0)await assert.rejects(admin.query("insert into anonymo_trabajos(id,proyecto,entrada,estado,propietario,vence) values($1,$2,'{}','ejecutando',$3,now()+interval '60 seconds')",[randomUUID(),proyecto,propietarioB]),e=>e.code==='23505');assert.equal((await admin.query("select count(*)::int n from anonymo_trabajos where proyecto=$1 and estado='ejecutando'",[proyecto])).rows[0].n,1);assert.equal((await cerrar(a,ganador.id,ganador.propietario,ganador.revision)).rows[0].correcto,true);
 }
 console.log('✓ Ocho carreras entre conexiones independientes: una sola reserva activa por proyecto.');
 const id=await insertar('vencida');const primera=(await tomar(a,'vencida',propietarioA)).rows[0];await admin.query("update anonymo_trabajos set vence=now()-interval '1 second' where id=$1",[id]);
 assert.equal((await a.query('select anonymo_renovar_trabajo($1,$2,$3,60) correcto',[id,propietarioA,primera.revision])).rows[0].correcto,false);
 const segunda=(await tomar(b,'vencida',propietarioB)).rows[0];assert.ok(Number(segunda.revision)>Number(primera.revision));assert.equal((await cerrar(a,id,propietarioA,primera.revision)).rows[0].correcto,false);assert.equal((await b.query('select anonymo_renovar_trabajo($1,$2,$3,60) correcto',[id,propietarioB,segunda.revision])).rows[0].correcto,true);assert.equal((await cerrar(b,id,propietarioB,segunda.revision)).rows[0].correcto,true);assert.equal((await cerrar(b,id,propietarioB,segunda.revision)).rows[0].correcto,false);
 console.log('✓ Reserva vencida recuperada con revisión nueva; propietario anterior no renueva ni finaliza; repetir cierre no vuelve a aplicar.');
 const agotado=await insertar('agotada',1);await tomar(a,'agotada',propietarioA);await admin.query("update anonymo_trabajos set vence=now()-interval '1 second' where id=$1",[agotado]);assert.equal((await tomar(b,'agotada',propietarioB)).rows.length,0);assert.equal((await admin.query('select estado from anonymo_trabajos where id=$1',[agotado])).rows[0].estado,'error');
 await assert.rejects(a.query("select * from anonymo_tomar_trabajo('prueba',$1,null)",[propietarioA]),/Duración/);await assert.rejects(a.query("select * from anonymo_tomar_trabajo('prueba',null,60)"),/Propietario/);
 const anon=await conectar();await anon.query('set role anon');await assert.rejects(tomar(anon,'vencida',propietarioA),/permission denied/);await assert.rejects(anon.query('select * from anonymo_trabajos'),/permission denied/);await assert.rejects(cerrar(anon,id,propietarioB,segunda.revision),/permission denied/);await assert.rejects(anon.query('select anonymo_renovar_trabajo($1,$2,$3,60)',[id,propietarioB,segunda.revision]),/permission denied/);
 console.log('✓ Límite de intentos termina en error visible; entradas nulas rechazadas; rol anónimo sin acceso.');
 // Un bloqueo de fila externo no hace esperar al trabajador por la primera fila.
 const bloqueo=await conectar();const x=await insertar('bloqueada'),y=await insertar('bloqueada');await bloqueo.query('begin');await bloqueo.query('select * from anonymo_trabajos where id=$1 for update',[x]);
 const elegida=await tomar(a,'bloqueada',propietarioA);assert.equal(elegida.rows[0].id,y);await bloqueo.query('rollback');
 console.log('✓ La selección omite una fila bloqueada y toma el trabajo libre sin esperar su desbloqueo.');
 console.log('PostgreSQL real validado. Esto NO activa la cola ni protege todavía escrituras del ejecutor actual en Storage.');
}finally{await Promise.allSettled(conexiones.map(c=>c.end()));if(iniciado)comando('pg_ctl',['-D',data,'-m','immediate','-w','stop']);}
