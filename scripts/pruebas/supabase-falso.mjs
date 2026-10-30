// Supabase Storage falso en memoria, para probar el estudio en línea.
import http from "node:http";
const datos = new Map();
export function crearStorageFalso(rpc){return http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*"); res.setHeader("access-control-allow-methods", "PUT, POST, OPTIONS"); res.setHeader("access-control-allow-headers", "*");
  if (req.method === "OPTIONS") { res.end(); return; }
  const cuerpo = await new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
  if(req.method==="GET"&&req.url==="/storage/v1/bucket/proyectos"){res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"proyectos",public:false}));return;}
  if(req.url.startsWith('/rest/v1/rpc/')&&rpc){try{const d=await rpc(req.url.slice('/rest/v1/rpc/'.length),JSON.parse(cuerpo));res.setHeader('content-type','application/json');res.end(JSON.stringify(d));}catch{res.writeHead(400).end('RPC de prueba rechazado');}return;}
  const firma = req.url.match(/^\/storage\/v1\/object\/upload\/sign\/proyectos\/([^?]+)(\?token=(.+))?$/);
  if (firma) {
    const ruta = decodeURIComponent(firma[1]);
    if (req.method === "POST") { res.end(JSON.stringify({ url: `/object/upload/sign/proyectos/${firma[1]}?token=tk-${ruta.length}` })); return; }
    if (req.method === "PUT" && firma[3] === `tk-${ruta.length}`) { datos.set(ruta, cuerpo); res.end(JSON.stringify({ Key: ruta })); return; }
    res.writeHead(400).end("firma mala"); return;
  }
  const m = req.url.match(/^\/storage\/v1\/object\/(list\/)?proyectos\/?(.*)$/);
  if (!m) { res.writeHead(404).end(); return; }
  const ruta = decodeURIComponent(m[2]);
  if (m[1]) {
    const { prefix,offset=0,limit=1000 } = JSON.parse(cuerpo);
    const hijos = new Map();
    for (const k of datos.keys()) {
      if (prefix && !k.startsWith(prefix + "/")) continue;
      const resto = prefix ? k.slice(prefix.length + 1) : k;
      const [cabeza, ...cola] = resto.split("/");
      hijos.set(cabeza, cola.length > 0 || (hijos.get(cabeza) ?? false));
    }
    res.end(JSON.stringify([...hijos].sort(([a],[b])=>a.localeCompare(b)).slice(offset,offset+limit).map(([name, c]) => ({ name, id: c ? null : name }))));
  } else if (req.method === "DELETE") { for (const p of JSON.parse(cuerpo).prefixes) datos.delete(p); res.end("[]"); }
  else if (req.method === "POST") { if(req.headers["x-upsert"]==="false"&&datos.has(ruta)){res.writeHead(409).end("ya existe");return;}datos.set(ruta, cuerpo); res.end("{}"); }
  else if (ruta === "__todo") { res.end(JSON.stringify([...datos.keys()].sort())); }
  else if (datos.has(ruta)) res.end(datos.get(ruta)); else { res.writeHead(404).end("no"); }
});}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])crearStorageFalso().listen(54321,()=>console.log("supabase falso en 54321"));
