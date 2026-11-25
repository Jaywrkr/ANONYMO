// Atlas entiende sin IA (sistema/106): lo que pasa cuando no hay clave o la IA falla.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entenderPorPalabras} from '../lib/atlas-entender.ts';
const clientes=[{id:'clinica-sonrisa',nombre:'Clínica Sonrisa'},{id:'cafe-lento',nombre:'Café Lento'},{id:'dental-norte',nombre:'Dental Norte'}];
const accion=(t:string,ctx={})=>entenderPorPalabras(t,clientes,ctx).eleccion;
test('«¿qué me toca hoy?» con signo de apertura es «hoy»',()=>{assert.equal(accion('¿qué me toca hoy?')?.accion,'hoy');assert.equal(accion('Pendientes')?.accion,'hoy');});
test('«qué sabes de» busca al cliente nombrado en palabras normales',()=>{const e=accion('¿qué sabes de café lento?');assert.equal(e?.accion,'memoria');assert.equal(e?.cliente,'cafe-lento');});
test('pedir que algo cambie dentro de un proyecto es un cambio de ese proyecto',()=>{const e=accion('que el botón diga Agenda tu cita',{proyecto:'clinica-sonrisa'});assert.equal(e?.accion,'cambio');assert.equal(e?.proyecto,'clinica-sonrisa');});
test('una pregunta cualquiera dentro de un proyecto va al proyecto, no a la ayuda',()=>{assert.equal(accion('en qué fase va',{proyecto:'clinica-sonrisa'})?.accion,'proyecto');});
test('el último cliente del que se habló no se pega a un reel que no lo necesita',()=>{const e=accion('un reel para el día de la madre',{cliente:'cafe-lento',suave:true});assert.equal(e?.accion,'guion');assert.equal(e?.cliente,undefined);});
test('en la página de un cliente, el reel sí es para ese cliente',()=>{assert.equal(accion('un reel para el día de la madre',{cliente:'cafe-lento'})?.cliente,'cafe-lento');});
test('sin nada que entender, ofrece ayuda en vez de quedarse mudo',()=>{assert.equal(accion('hola')?.accion,'ayuda');});
// sistema/108: Atlas reconoce el cliente aunque solo se diga un nombre, y lo nombrado manda sobre la página.
import {clienteEnTexto} from '../lib/atlas-entender.ts';
const conPareja=[...clientes,{id:'sebastian-silva-y-gabriela-abril',nombre:'Sebastián Silva y Gabriela Abril (odontólogos, Cuenca)'}];
test('«la web de Gabriela» es el proyecto de Sebastián y Gabriela',()=>{assert.equal(clienteEnTexto('¿cómo va la web de Gabriela?',conPareja),'sebastian-silva-y-gabriela-abril');});
test('«Cuenca» sola no elige a nadie',()=>{assert.equal(clienteEnTexto('algo para negocios de Cuenca',conPareja),undefined);});
test('en el proyecto de un cliente, preguntar por otro cliente va a ese otro',()=>{const e=entenderPorPalabras('¿qué sabes de café lento?',conPareja,{proyecto:'sebastian-silva-y-gabriela-abril'},[{id:'sebastian-silva-y-gabriela-abril',cliente:'Sebastián Silva y Gabriela Abril (odontólogos, Cuenca)',estado:'esperando'}]).eleccion;assert.equal(e?.cliente,'cafe-lento');assert.equal(e?.proyecto,undefined);});
test('en el proyecto, nombrar a su mismo cliente no lo saca del proyecto',()=>{const e=entenderPorPalabras('que el botón de Gabriela diga Agenda',conPareja,{proyecto:'sebastian-silva-y-gabriela-abril'},[{id:'sebastian-silva-y-gabriela-abril',cliente:'Sebastián Silva y Gabriela Abril (odontólogos, Cuenca)',estado:'esperando'}]).eleccion;assert.equal(e?.accion,'cambio');assert.equal(e?.proyecto,'sebastian-silva-y-gabriela-abril');});
