// SQL real en un clúster temporal privado.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {conPostgresTemporal} from './postgres.mjs';
await conPostgresTemporal(async({admin,conectar})=>{
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
 console.log('PostgreSQL real validado. Esta prueba aislada no activa la cola de producción; el piloto integrado se comprueba en publicaciones.mjs.');
});
