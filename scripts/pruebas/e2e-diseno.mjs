// Ejecutar después de diseno.ts y nube.sh. Falla con código distinto de cero si una comprobación falla.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const base = 'http://127.0.0.1:3100';
const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
 const p = await nav.newPage();
 await p.goto(`${base}/entrar`);
 await p.fill('input[name="clave"]', 'prueba-clave-jay');
 await p.click('text=Entrar al estudio');
 await p.waitForURL(`${base}/estudio`);
 const estado = JSON.parse(readFileSync('/tmp/anonymo-pruebas/diseno/diseno-prueba/estado.json', 'utf8'));
 for (const ruta of ['/estudio/diseno-prueba/direcciones', '/imprimir/diseno-prueba/direcciones', `/portal/diseno-prueba?t=${estado.portal.token}`]) {
  await p.goto(base + ruta);
  await p.waitForLoadState("networkidle");
  const marco = p.frameLocator('iframe[title="Dirección Serena"]');
  await marco.getByRole('heading', {name:'Una portada propia'}).waitFor();
  assert.equal(await p.locator('iframe[title="Dirección Serena"]').getAttribute('sandbox'), 'allow-scripts');
  await marco.getByRole('button', {name:'Explorar'}).click();
  await marco.getByRole('heading', {name:'Movimiento activo'}).waitFor();
  assert.equal(await p.locator('body').getAttribute('data-invasion'), null);
  assert.equal(await marco.locator('body').evaluate(async () => { try { await fetch('/estudio'); return false; } catch { return true; } }), true);
  await p.getByText('La columna lateral responde', {exact:false}).first().waitFor();
  console.log('✓ portada propia, interacción y aislamiento:', ruta.split('?')[0]);
 }
 await p.setViewportSize({width:390,height:844});
 await p.goto(base + '/estudio/diseno-prueba/direcciones');
 const marco = p.frameLocator('iframe[title="Dirección Serena"]');
 await marco.getByRole('heading').waitFor();
 assert.ok(await marco.locator('main').evaluate(el => el.scrollWidth <= innerWidth));
 console.log('✓ dirección en celular sin desbordamiento');
} finally { await nav.close(); }
