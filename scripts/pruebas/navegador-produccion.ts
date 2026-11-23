// Comprueba que el navegador que usa Vercel abre y dibuja una página. Las pruebas de funciones usan Chromium normal (con fuentes).
import assert from 'node:assert/strict';
import {navegadorCalidad} from '../../packages/pipeline/src/inspeccionar.ts';
process.env.VERCEL='1';
const browser=await navegadorCalidad();
try{
 const page=await browser.newPage();
 await page.setContent('<main style="width:200px;height:120px;background:#F0602A">Unmake</main>');
 const caja=await page.locator('main').boundingBox();
 assert.equal(Math.round(caja?.width??0),200);assert.ok((await page.screenshot()).length>500);
 console.log('✓ El navegador de producción abre y dibuja una página.');
}finally{await browser.close();}
