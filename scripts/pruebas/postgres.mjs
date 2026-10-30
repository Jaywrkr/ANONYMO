import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import pg from 'pg';
export async function conPostgresTemporal(fn){
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
 const admin=await conectar();await admin.query('create role anon;create role authenticated;create role service_role bypassrls;');await admin.query(readFileSync(new URL('../../infra/cola.sql',import.meta.url),'utf8'));return await fn({admin,conectar,puerto});
}finally{await Promise.allSettled(conexiones.map(c=>c.end()));if(iniciado)comando('pg_ctl',['-D',data,'-m','immediate','-w','stop']);}
}
