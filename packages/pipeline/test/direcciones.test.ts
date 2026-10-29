import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerDirecciones, textoDireccion } from '../src/direcciones.ts';
const base = { nombre: 'Atelier', colores: [{hex:'#112233'}, {hex:'#ffffff'}], portada: {titular:'Un oficio propio'} };
const leer = (extra = {}) => leerDirecciones('```json\n' + JSON.stringify([{...base, ...extra}]) + '\n```');
test('conserva portada libre y su vínculo con el pedido al elegir', () => {
 const html = '<main><h1>Un oficio propio</h1></main><style>main{display:grid}</style>';
 const [d] = leer({html, justificacion:'La referencia del cliente usa ritmo editorial.'});
 assert.equal(d.html, html);
 assert.match(textoDireccion(d), /ritmo editorial/);
 assert.ok(textoDireccion(d).includes(html));
});
test('entregas anteriores siguen funcionando y HTML incompleto o enorme no se acepta', () => {
 assert.equal(leer()[0].html, undefined);
 assert.equal(leer({html:'<script>alert(1)</script>'})[0].html, undefined);
 assert.equal(leer({html:'<main>' + 'x'.repeat(60000)})[0].html, undefined);
 assert.equal(leer({html:42})[0].html, undefined);
});
