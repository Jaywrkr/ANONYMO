// Registros ficticios para comprobar versiones, vigencia y el chat flotante en la nube falsa.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {crear,planificar,guardarEntrega,guardarProyecto,leerProyecto,registrarDecisiones,decisionesDe,controlInicial,consultarAtlas,subirProyecto,carpeta,type Entrega} from '../../packages/pipeline/src/index.ts';
if(process.env.SUPABASE_URL!=='http://127.0.0.1:54321')throw new Error('Solo nube falsa.');
delete process.env.ANTHROPIC_API_KEY;
const id='memoria-prueba',pedido={id,cliente:'Taller Memoria Ficticio',tipo:'web' as const,descripcion:'Dar prioridad a la claridad del equipo.',creado:new Date().toISOString()};
crear(pedido,planificar(pedido,{tareas:['1.atlas','4.orla'],preguntas:[]}));
const p=leerProyecto(id);p.estado='plan';guardarProyecto(p);
for(const version of [1,2]){
 const e:Entrega={tarea:'1.atlas',agente:'atlas',titulo:'Plan ficticio',contenido:version===1?'La versión anterior exploraba saturación.':'La versión actual prioriza claridad.',dice:'Registro de prueba.',necesita:'—',estado:'lista',modo:'real',version,creado:new Date().toISOString(),datos:{decisiones:[{decision:version===1?'Explorar saturación':'Priorizar claridad',motivo:version===1?'Motivo histórico de prueba.':'El pedido exige claridad del equipo.',fuentes:['c-0']},...(version===2?[{decision:'Nota sin contexto original',motivo:'Ejemplo de un registro anterior sin evidencia completa.',fuentes:['c-0']}]:[])]}};
 e.calidad={...controlInicial(p,e),estado:'aprobado',aprobadoPor:'jay'};guardarEntrega(id,e);registrarDecisiones(id,e);
}
const antiguo=decisionesDe(id).find(d=>d.decision==='Nota sin contexto original')!;delete antiguo.contexto;writeFileSync(join(carpeta(),id,'memoria','decisiones',antiguo.id+'.json'),JSON.stringify(antiguo));
await consultarAtlas(id,'¿Qué decisiones siguen vigentes?','jay');
await subirProyecto(id);console.log('✓ Memoria ficticia: una confirmada, una versión anterior y un contexto sin comprobar; conversación factual persistida.');
