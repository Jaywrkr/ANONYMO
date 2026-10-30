// Solo servicios falsos: evidencia de memoria y vector editable, sin datos de clientes.
import assert from 'node:assert/strict';
import {crear,planificar,guardarProyecto,guardarEntrega,leerProyecto,leerEntrega,guardarPiezas,controlInicial,pedirControl,avanzar,real,subirProyecto,registrarDecisiones,detectarMejora} from '../../packages/pipeline/src/index.ts';
if(process.env.SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.ANTHROPIC_BASE_URL!=='http://127.0.0.1:45888')throw new Error('Solo servicios falsos.');
const pedido={id:'atlas-prueba',cliente:'Taller Atlas Ficticio',tipo:'marca' as const,descripcion:'Una identidad geométrica y legible para un taller ficticio.',creado:new Date().toISOString()};
crear(pedido,planificar(pedido,{tareas:['3.mira'],preguntas:[]}));
const p=leerProyecto(pedido.id);p.estado='esperando';p.modo='paso';p.tareas['3.mira']='lista';p.revision={tarea:'3.mira',fecha:new Date().toISOString()};guardarProyecto(p);
const nombres=['logo-principal','logo-monocromo','simbolo','ruta-1','ruta-2','ruta-3'];
const piezas=Object.fromEntries(nombres.map((n,i)=>[n+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${i===1?'#111111':'#174e3b'}" d="M${10+i} 80L50 ${10+i}L90 80Z"/></svg>`]));
guardarPiezas(pedido.id,'3.mira',1,piezas);
const e={tarea:'3.mira' as const,agente:'mira',titulo:'Identidad ficticia del taller',contenido:'Seis propuestas ficticias. Licencias y adecuación creativa no demostradas por esta prueba técnica.',dice:'Propuestas de prueba.',necesita:'—',estado:'lista' as const,modo:'real' as const,version:1,creado:new Date().toISOString(),datos:{piezas:Object.keys(piezas),decisiones:[{decision:'Explorar una geometría triangular',motivo:'Propuesta ficticia ligada al contrato de prueba.',fuentes:['c-0']}]}};
guardarEntrega(pedido.id,{...e,calidad:controlInicial(p,e)});registrarDecisiones(pedido.id,e);
detectarMejora(pedido.id,{tipo:'limitacion',titulo:'Calibración creativa pendiente',detalle:'Esta prueba técnica utiliza seis formas ficticias y un revisor falso. No demuestra calidad creativa.',tarea:'3.mira',version:1});
pedirControl(pedido.id,'3.mira');await avanzar(pedido.id,real,()=>{},{max:1});
const final=leerEntrega(pedido.id,'3.mira')!;assert.equal(final.calidad?.estado,'verificado',JSON.stringify(final.calidad));assert.equal(final.calidad.capturas.length,12);assert.ok(final.calidad.comprobaciones.filter(c=>c.id.startsWith('navegador-')).every(c=>c.estado==='cumple'));
await subirProyecto(pedido.id);console.log('✓ Seis SVG reales: doce capturas de navegador y revisión falsa; memoria subida a la nube falsa.');
