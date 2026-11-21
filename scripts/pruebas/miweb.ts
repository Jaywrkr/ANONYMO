// Proyecto de prueba para «Mi web» (sistema/98): una web de dos páginas con una foto, en la nube falsa.
import { readFileSync } from 'node:fs';
import { crear, existe, guardarArchivo, guardarSitio, planificar, subirProyecto, tokenPortal } from '../../packages/pipeline/src/index.ts';
if (process.env.SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Solo se permite la nube falsa.');
const pedido = { id: 'miweb-prueba', cliente: 'Consultorio Mi Web', tipo: 'web' as const, descripcion: 'Web de un consultorio para probar Mi web.', creado: new Date().toISOString() };
if (!existe(pedido.id)) crear(pedido, planificar(pedido, { tareas: ['4.vector'], preguntas: [] }));
guardarArchivo(pedido.id, 'consultorio.png', readFileSync(new URL('./imagen.png', import.meta.url)));
const css = 'body{margin:0;font-family:system-ui;background:#f7f4ee;color:#1a1816}main{padding:24px;max-width:760px;margin:auto}img{max-width:100%;height:auto}a{color:inherit}';
guardarSitio(pedido.id, 1, {
  'index.html': `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Consultorio Mi Web</title><link rel="stylesheet" href="estilos.css"></head><body><main><nav><a href="index.html">Inicio</a> · <a href="servicios.html">Servicios</a></nav><h1>Cuidamos tu sonrisa en Cuenca</h1><p>Atendemos de lunes a viernes, de 9 a 18.</p><img src="img/consultorio.png" alt="El consultorio"><ul><li>Limpieza: USD 30</li><li>Blanqueamiento: USD 120</li></ul><a href="https://wa.me/593992220001">Agenda por WhatsApp</a></main></body></html>`,
  'servicios.html': `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Servicios</title><link rel="stylesheet" href="estilos.css"></head><body><main><h1>Nuestros servicios</h1><p>Odontología general y estética.</p></main></body></html>`,
  'estilos.css': css,
});
tokenPortal(pedido.id);
await subirProyecto(pedido.id);
console.log('✓ Proyecto miweb-prueba con su web v1 en la nube falsa.');
