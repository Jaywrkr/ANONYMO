import './preparar.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tomarVersionado} from '../src/versionado.ts';
test('una respuesta HTTP correcta sin una reserva completa no permite empezar trabajo',async()=>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
 process.env.SUPABASE_URL='http://127.0.0.1:54321';process.env.SUPABASE_SERVICE_KEY='clave-ficticia';
 const valido={id:'11111111-1111-1111-1111-111111111111',propietario:'22222222-2222-2222-2222-222222222222',proyecto:'ensayo',revision:1};
 try{for(const respuesta of [{},[{}],[{...valido,proyecto:'otro'}],[{...valido,revision:0}],[{...valido,propietario:null}]])await assert.rejects(tomarVersionado('ensayo',(async()=>Response.json(respuesta)) as typeof fetch),/reserva válida/);
 assert.equal(await tomarVersionado('ensayo',(async()=>Response.json([])) as typeof fetch),undefined);
 assert.equal((await tomarVersionado('ensayo',(async(_u,op)=>Response.json([{...valido,propietario:JSON.parse(String(op?.body)).p_propietario}])) as typeof fetch))?.revision,1);
 }finally{url===undefined?delete process.env.SUPABASE_URL:process.env.SUPABASE_URL=url;key===undefined?delete process.env.SUPABASE_SERVICE_KEY:process.env.SUPABASE_SERVICE_KEY=key;}
});
