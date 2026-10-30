import {comprobarEnlaces,comprobarInteracciones,leerPruebasWeb} from './funciones-web.ts';
// Navegador sin sesión del estudio. Solo sirve los archivos de la versión elegida.
import {archivosPiezas,leerPieza} from './piezas.ts';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { carpeta } from './almacen.ts';
import { leerImagenDireccion, archivosSitio, leerArchivoSitio, TIPOS_SITIO } from './sitio.ts';
import type { CapturaCalidad, Comprobacion, Entrega, Proyecto } from './tipos.ts';
import type { Auditoria } from './herramientas/auditar.ts';

export async function navegadorCalidad(puerto?: number) {
  const { chromium } = await import('playwright');
  const depuracion = puerto ? [`--remote-debugging-port=${puerto}`] : [];
  if (process.env.VERCEL) {
    const { default: binario } = await import('@sparticuz/chromium');
    return chromium.launch({ executablePath: await binario.executablePath(), args: [...binario.args.filter(arg => !puerto || arg !== "--single-process"), ...depuracion], headless: true });
  }
  const ruta = process.env.CHROMIUM ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  return chromium.launch({ executablePath: ruta, args: depuracion, headless: true });
}

export async function inspeccionar(p: Proyecto, e: Entrega, proponer: boolean, plazo?: number, huella = "") {
  const id = p.pedido.id;
  const vectorial=e.tarea==='3.mira';
  const vectores=vectorial?archivosPiezas(id,e.tarea,e.version):[];
  const direcciones = proponer ? p.direcciones?.opciones ?? [] : [];
  const archivos = proponer ? [] : archivosSitio(id, e.version);
  const planFunciones=leerPruebasWeb(!proponer&&!vectorial?leerArchivoSitio(id,e.version,'pruebas.json')?.toString():undefined);
  const paginas = vectorial?vectores.map((_,i)=>`vector-${i+1}.html`):proponer ? direcciones.map((_, i) => `direccion-${i + 1}.html`) : archivos.filter(a => a.ruta.endsWith('.html')).map(a => a.ruta);
  if(planFunciones.pruebas.some(p=>!paginas.includes(p.pagina)))planFunciones.error='pruebas.json contiene una página que no existe en esta versión.';
  if (!paginas.length || paginas.length > 12) throw new Error('Faltan piezas para ver o hay más de 12 páginas: divide la revisión.');
  if (proponer && (direcciones.length !== 3 || direcciones.some(d => !d.html))) throw new Error('Las tres direcciones necesitan una portada propia para revisarlas.');
  const servidor = createServer((req, res) => {
    let ruta: string;
    try { ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname).slice(1); } catch { res.writeHead(400).end(); return; }
    const n = paginas.indexOf(ruta);
    const vector=vectores[paginas.indexOf(ruta)];
    const muestra=vector?`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba de logo</title><style>body{font:16px system-ui;color:#141414;background:#f5f1e8;margin:0;padding:24px}section{padding:24px;display:flex;gap:24px;align-items:center;flex-wrap:wrap;background:white;margin-block:16px}img{max-width:100%}.oscuro{background:#171717;color:white}</style></head><body><main><h1>${vector}</h1><section aria-label="Tamaños de reproducción"><img src="${vector}" width="128" height="128" alt="Logo a 128 píxeles"><img src="${vector}" width="32" height="32" alt="Logo a 32 píxeles"><img src="${vector}" width="16" height="16" alt="Logo a 16 píxeles"></section><section class="oscuro" aria-label="Fondo oscuro"><img src="${vector}" width="128" height="128" alt="Logo sobre fondo oscuro"></section></main></body></html>`:undefined;
    const cuerpo = vectorial?(muestra?Buffer.from(muestra):leerPieza(id,e.tarea,e.version,ruta)):proponer ? (n < 0 ? leerImagenDireccion(id,e.version,ruta) : Buffer.from(direcciones[n].html!)) : leerArchivoSitio(id, e.version, ruta);
    if (!cuerpo) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS_SITIO[ruta.split('.').at(-1)!] ?? 'application/octet-stream', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'" });
    res.end(cuerpo);
  });
  await new Promise<void>(ok => servidor.listen(0, '127.0.0.1', ok));
  const puerto = (servidor.address() as {port: number}).port;
  // El puerto de depuración lo elige el navegador; no se expone fuera de la máquina.
  const browser = await navegadorCalidad().catch(err => { servidor.close(); throw err; });
  let capturas: CapturaCalidad[] = [];
  let comprobaciones: Comprobacion[] = [];
  let textos: string[] = [];
  let auditoria: Auditoria | undefined;
  const base = `http://127.0.0.1:${puerto}`;
  const destino = join(carpeta(), id, 'calidad', e.tarea.replace('.', '-'), `v${e.version}`);
  mkdirSync(destino, {recursive: true});
  const checkpoint=join(destino,"inspeccion.json");
  let auditorias: Record<string,Auditoria>={};
  try {
    const guardado=JSON.parse(readFileSync(checkpoint,"utf8")) as {motor:number;huella:string;capturas:CapturaCalidad[];comprobaciones:Comprobacion[];textos:string[];auditorias:Record<string,Auditoria>};
    if(guardado.motor===2 && huella && guardado.huella===huella && guardado.capturas.every(c=> /^calidad\/[0-9]+-[a-z]+\/v[1-9][0-9]*\/[1-9][0-9]*-(390|1440)(-[0-9a-f]{12})?\.jpg$/.test(c.ruta) && createHash('sha256').update(readFileSync(join(carpeta(),id,c.ruta))).digest('hex')===c.sha256)) {
      capturas=guardado.capturas;comprobaciones=guardado.comprobaciones;textos=guardado.textos;auditorias=guardado.auditorias;
    }
  } catch { /* Sin punto de reanudación válido: se comprueba de nuevo. */ }
  const guardar=()=>{writeFileSync(checkpoint+".tmp",JSON.stringify({motor:2,huella,capturas,comprobaciones,textos,auditorias}));renameSync(checkpoint+".tmp",checkpoint);};

  try {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.route('**/*', async route => {
      const u = new URL(route.request().url());
      const permitido = ['GET','HEAD'].includes(route.request().method()) && (u.origin === base || (u.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'].includes(u.hostname)));
      return permitido ? route.continue() : route.abort();
    });
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const puntos: Auditoria[] = [];
    for (const [i, pagina] of paginas.entries()) {
      for (const ancho of [1440, 390]) {
        if(capturas.some(c=>c.pagina===pagina&&c.ancho===ancho)) continue;
        if (plazo && Date.now() > plazo - 25000) throw new Error('La revisión necesita otra vuelta; las capturas guardadas se conservan.');
        const page = await ctx.newPage();
        const errores: string[] = [],conexiones:string[]=[];
        page.on('console',m=>{if(m.type()==='error'&&/connect-src|Refused to connect|Connecting to/i.test(m.text()))conexiones.push('Una conexión de datos fue bloqueada por el aislamiento; falta comprobar su destino y recepción real.');});
        page.on('requestfailed',r=>{if(['fetch','xhr'].includes(r.resourceType()))conexiones.push('Una conexión de datos no pudo completarse; falta comprobar su destino y resultado.');});
        page.on('pageerror', err => errores.push(err.message.slice(0, 160)));
        page.on('response',r=>{if(r.url().startsWith(base+'/')&&r.status()>=400)errores.push(`Recurso local ausente (${r.status()}): ${new URL(r.url()).pathname}`);});
        await page.setViewportSize({width: ancho, height: 900});
        await page.goto(`${base}/${pagina}`, {waitUntil: 'load', timeout: 20000});
        await page.evaluate(async () => { await document.fonts.ready; });
        // Activa imágenes y entradas al recorrer la página, sin esperar conexiones persistentes.
        await page.evaluate(async () => { for (let y = 0; y < Math.min(document.body.scrollHeight, 16000); y += 800) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
        const medidas = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, rotas: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length, texto: document.body.innerText }));
        textos.push(`${pagina} · ${ancho}px\n${medidas.texto.slice(0, 14000)}`);
        const imagen = await page.screenshot({type: 'jpeg', quality: 65, fullPage: medidas.alto <= 16000, animations: 'disabled'});
        const nombre = `${i+1}-${ancho}-${createHash('sha256').update(imagen).digest('hex').slice(0,12)}.jpg`;
        writeFileSync(join(destino, nombre), imagen);
        const captura={ruta: `calidad/${e.tarea.replace('.', '-')}/v${e.version}/${nombre}`, sha256: createHash('sha256').update(imagen).digest('hex'), ancho, pagina};
        const axe = await new AxeBuilder({page: page as never}).analyze();
        const problemas = [
          ...errores,
          ...(medidas.ancho > ancho + 2 ? ['Hay desbordamiento horizontal.'] : []),
          ...(medidas.rotas ? [`${medidas.rotas} imágenes no cargaron. Usa archivos locales o imágenes incrustadas.`] : []),
          ...(medidas.alto > 16000 ? ['Página demasiado larga para una captura completa.'] : []),
          ...axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => v.help),
        ];
        comprobaciones.push({ id: `navegador-${i}-${ancho}`, texto: `${pagina} a ${ancho}px`, estado: problemas.length ? 'falla' : 'cumple', evidencia: problemas.length ? problemas.join(' · ') : 'Renderizada, sin errores JS, imágenes rotas, desbordamiento ni errores graves de accesibilidad.' });
        if(!proponer&&!vectorial){
          comprobaciones.push(...await comprobarEnlaces(page,pagina,ancho,base,r=>leerArchivoSitio(id,e.version,r)));
          comprobaciones.push(...await comprobarInteracciones(page,pagina,ancho as 390|1440,base,planFunciones,plazo));
        }
        if(conexiones.length)comprobaciones.push({id:`conexion-${i}-${ancho}`,texto:`Conexiones de ${pagina} a ${ancho}px`,estado:'pendiente',evidencia:conexiones[0]+' El navegador de revisión no autoriza envíos a servicios.'});
        if(errores.length)comprobaciones.push({id:`errores-${i}-${ancho}`,texto:`Errores durante la revisión de ${pagina}`,estado:'falla',evidencia:[...new Set(errores)].slice(0,10).join(' · ')});
        capturas.push(captura);
        await page.close();
        guardar();
      }
    }
    await ctx.close();
    await browser.close();
    // Lighthouse comprueba los archivos recién generados, nunca pedido.contexto.url.
    if (!proponer && !vectorial && !comprobaciones.some(c=>c.estado!=='cumple')) {
      const { auditar } = await import('./herramientas/auditar.ts');
      for (const pagina of paginas) {
        if(auditorias[pagina]){puntos.push(auditorias[pagina]);continue;}
        if (plazo && Date.now() > plazo - 65000) throw new Error('Falta tiempo: la auditoría sigue en otra vuelta sin repetir las páginas comprobadas.');
        const a = await auditar(`${base}/${pagina}`);
        a.url = `sitio/v${e.version}/${pagina}`;
        puntos.push(a);
        auditorias[pagina]=a;
        comprobaciones.push({ id: `lighthouse-${pagina}`, texto: `Rendimiento de ${pagina}`, estado: a.celular.rendimiento >= 85 && a.celular.accesibilidad >= 90 && !a.axe.length ? 'cumple' : 'falla', evidencia: `Lighthouse móvil: rendimiento ${a.celular.rendimiento}, accesibilidad ${a.celular.accesibilidad}; axe: ${a.axe.length} incidencias. ${a.arreglos.join(' · ')}` });
        guardar();
      }
      const minimo = (equipo: 'celular' | 'escritorio'): Auditoria['celular'] => ({ rendimiento: Math.min(...puntos.map(a => a[equipo].rendimiento)), accesibilidad: Math.min(...puntos.map(a => a[equipo].accesibilidad)), practicas: Math.min(...puntos.map(a => a[equipo].practicas)), seo: Math.min(...puntos.map(a => a[equipo].seo)) });
      auditoria = { url: `sitio/v${e.version} · ${paginas.length} páginas`, celular: minimo('celular'), escritorio: minimo('escritorio'), axe: puntos.flatMap(a => a.axe), arreglos: puntos.flatMap(a => a.arreglos) };
    }
    return {capturas, comprobaciones, auditoria, textos};
  } finally { await browser.close(); await new Promise<void>(ok => servidor.close(() => ok())); }
}
