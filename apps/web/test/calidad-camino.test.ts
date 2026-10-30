import {test} from 'node:test';
import assert from 'node:assert/strict';
import {momento} from '../lib/camino.ts';
const base={estado:'en-curso',faseActual:4,plan:{fases:[4],tareas:['4.vector']},tareas:{'4.vector':'lista'},actualizado:new Date().toISOString(),controlPendiente:{tarea:'4.vector',version:1}};
test('muestra la revisión pendiente sin fingir producción nueva',()=>{
 const m=momento(base,'jay','jay');assert.match(m.ahora,/Revisando/);assert.equal(m.teToca,false);
});
test('un control sin señal ni actividad reciente no aparece trabajando para siempre',()=>{
 const m=momento({...base,actualizado:'2020-01-01T00:00:00Z'},'jay','jay');assert.equal(m.tono,'cortado');assert.equal(m.accion,'Continuar');
});
test('una revisión incompleta dice qué falta en lugar de ofrecer aprobar',()=>{
 const m=momento({...base,estado:'esperando',revision:{tarea:'4.vector',fecha:new Date().toISOString(),calidad:'pendiente'}},'jay','jay');assert.equal(m.accion,'Ver qué falta');assert.match(m.ahora,/Falta completar/);
});
