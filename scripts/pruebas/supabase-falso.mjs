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
  // Lectura firmada (sistema/62): el navegador reproduce los videos directo de la nube, con saltos (Range).
  const lectura = req.url.match(/^\/storage\/v1\/object\/sign\/proyectos\/([^?]+)(\?token=([^&]+)(&download=(.*))?)?$/);
  if (lectura) {
    const ruta = decodeURIComponent(lectura[1]);
    if (req.method === "POST") { if (!datos.has(ruta)) { res.writeHead(404).end("no"); return; } res.end(JSON.stringify({ signedURL: `/object/sign/proyectos/${lectura[1]}?token=tl-${ruta.length}` })); return; }
    if (lectura[3] !== `tl-${ruta.length}` || !datos.has(ruta)) { res.writeHead(400).end("firma mala"); return; }
    const b = datos.get(ruta), r = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    res.setHeader("accept-ranges", "bytes"); res.setHeader("content-type", { mp4: "video/mp4", png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav" }[ruta.split(".").pop()] ?? "application/octet-stream");
    if (lectura[5]) res.setHeader("content-disposition", `attachment; filename="${decodeURIComponent(lectura[5])}"`);
    if (r) { const a = r[1] ? Number(r[1]) : 0, z = r[2] ? Math.min(b.length - 1, Number(r[2])) : b.length - 1; res.writeHead(206, { "content-range": `bytes ${a}-${z}/${b.length}`, "content-length": z - a + 1 }); res.end(b.subarray(a, z + 1)); return; }
    res.setHeader("content-length", b.length); res.end(b); return;
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
