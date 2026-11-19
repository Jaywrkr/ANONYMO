import { chromium } from "playwright";
const B = "http://127.0.0.1:3100";
const rutas = ["/estudio", "/estudio/clinica-sonrisa", "/estudio/clinica-sonrisa/web", "/estudio/clinica-sonrisa/direcciones", "/estudio/clinica-sonrisa/propuesta", "/estudio/clinica-sonrisa/revisar", "/estudio/clinica-sonrisa/calidad", "/estudio/clinica-sonrisa/atlas", "/estudio/clinica-sonrisa/avisos", "/estudio/clinica-sonrisa/guardados", "/estudio/nuevo", "/estudio/clientes", "/estudio/clientes/nuevos", "/estudio/clientes/tanda", "/estudio/clientes/plantillas", "/estudio/video", "/estudio/video/marcas", "/estudio/banco", "/estudio/biblioteca", "/estudio/oficina", "/estudio/estado", "/estudio/criterio", "/estudio/conexiones", "/estudio/analitica", "/estudio/papelera", "/entrar", "/"];
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const informe = [];
for (const [w, h, n] of [[390, 844, "cel"], [1440, 900, "esc"]]) {
  const c = await nav.newContext({ viewport: { width: w, height: h }, isMobile: n === "cel", hasTouch: n === "cel" });
  const p = await c.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message.slice(0, 120)));
  p.on("console", (m) => { if (m.type() === "error") errores.push("consola: " + m.text().slice(0, 120)); });
  await p.goto(B + "/entrar");
  await p.screenshot({ path: `/tmp/aud/entrar-${n}.png` });
  await p.check('input[name="quien"][value="jay"]', { force: true }); await p.fill('input[name="clave"]', "prueba-clave-jay"); await p.click("text=Entrar al estudio"); await p.waitForURL(/estudio$/);
  for (const r of rutas) {
    if (r === "/entrar") continue;
    errores.length = 0;
    const t0 = Date.now();
    const res = await p.goto(B + r, { waitUntil: "load" }).catch((e) => ({ status: () => "x " + e.message.slice(0, 60) }));
    await p.waitForTimeout(700);
    const d = await p.evaluate((cel) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
      const chicos = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), summary")].filter(vis).map((e) => ({ e, r: e.getBoundingClientRect() })).filter(({ e, r }) => (r.height < 40 || r.width < 40) && !(e.tagName === "A" && getComputedStyle(e).display === "inline")).map(({ e, r }) => `${(e.innerText || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      const letras = new Set(); let mini = 0;
      for (const e of document.querySelectorAll("p, span, a, button, li, dt, dd, label, h1, h2, h3, td, th")) { if (!vis(e) || !e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const f = parseFloat(getComputedStyle(e).fontSize); letras.add(f); if (f < 12) mini++; }
      const sinNombre = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea")].filter(vis).filter((e) => !(e.innerText || "").trim() && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby") && !e.getAttribute("title") && !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.closest("label")).length;
      const principales = [...document.querySelectorAll("button, a")].filter(vis).filter((e) => { const b = getComputedStyle(e).backgroundColor; return /rgb\((2[0-5]\d|1\d|[0-9]), ?(\d{1,2}), ?(\d{1,2})\)/.test(b) || b === "rgb(255, 77, 46)"; }).length;
      return { ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, h1: [...document.querySelectorAll("h1")].filter(vis).map((e) => e.innerText.slice(0, 40)), chicos: cel ? chicos.slice(0, 12) : chicos.length, nChicos: chicos.length, letras: [...letras].sort((a, b) => a - b).join(","), mini, sinNombre, principales };
    }, n === "cel");
    await p.screenshot({ path: `/tmp/aud/${r.replace(/\//g, "_") || "_raiz"}-${n}.png`, fullPage: false });
    informe.push({ r, n, estado: res.status(), ms: Date.now() - t0 - 700, ...d, errores: [...new Set(errores)].slice(0, 3) });
  }
  await c.close();
}
await nav.close();
for (const i of informe) console.log(JSON.stringify(i));
