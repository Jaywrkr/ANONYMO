// Solo contra la nube falsa de nube.sh: prepara una dirección libre sin IA ni datos reales.
import { existe, crear, guardarProyecto, leerProyecto, planificar, tokenPortal, subirProyecto } from '../../packages/pipeline/src/index.ts';
import { direccionesSimuladas } from '../../packages/pipeline/src/direcciones.ts';
if (process.env.SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Usa únicamente la nube falsa.');
const pedido = { id: 'diseno-prueba', cliente: 'Taller de prueba', tipo: 'web', descripcion: 'Composición editorial con una columna lateral.', creado: new Date().toISOString() };
if (!existe(pedido.id)) crear(pedido, planificar(pedido, { tareas: ['4.orla', '4.vector'] }));
const p = leerProyecto(pedido.id);
p.estado = 'esperando';
const opciones = direccionesSimuladas(pedido);
opciones[0].html = `<main><aside>Oficio local</aside><h1>Una portada propia</h1><button onclick="document.querySelector('h1').textContent='Movimiento activo'">Explorar</button></main><style>body{margin:0;background:#f1eee6;color:#21352d}main{display:grid;grid-template-columns:1fr 3fr;padding:32px;gap:20px}h1{font:clamp(36px,7vw,92px) Georgia;margin:0}button{padding:16px} @media(max-width:500px){main{grid-template-columns:1fr}}</style><script>try{parent.document.body.dataset.invasion='si'}catch{};fetch('/estudio').catch(()=>{});</script>`;
opciones[0].justificacion = 'La columna lateral responde a la referencia editorial del pedido.';
p.direcciones = { tarea: '4.orla', opciones, esperando: true };
guardarProyecto(p);
tokenPortal(pedido.id);
await subirProyecto(pedido.id);
