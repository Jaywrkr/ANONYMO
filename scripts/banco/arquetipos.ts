// Maquetas genéricas del banco (sistema/55): cómo se ve lo correcto-pero-de-plantilla y lo de principiante.
// Son nuestras (no exponen a ningún negocio real): sirven para que el juez vea los niveles bajos, no solo los lea.
const RUBRO: Record<string, { negocio: string; servicio: string; icono: string; simbolo: string }> = {
  salud: { negocio: "Clínica Ejemplo", servicio: "Odontología integral", icono: "🦷", simbolo: "M40 18c-9 0-14 6-14 14 0 10 5 14 6 26 1 8 4 10 6 10 3 0 3-8 6-8s3 8 6 8c2 0 5-2 6-10 1-12 6-16 6-26 0-8-5-14-14-14-4 0-6 2-8 2s-4-2-8-2z" },
  comida: { negocio: "Café Ejemplo", servicio: "Café y pastelería", icono: "☕", simbolo: "M22 34h38v16c0 10-8 18-19 18S22 60 22 50zM60 38h6c5 0 8 4 8 8s-3 8-8 8h-6M34 14c-3 4 3 7 0 12M44 14c-3 4 3 7 0 12" },
  profesionales: { negocio: "Estudio Jurídico Ejemplo", servicio: "Asesoría legal y contable", icono: "⚖️", simbolo: "M48 14v54M28 68h40M20 28h56M30 28l-10 22h20zM66 28l-10 22h20z" },
  tienda: { negocio: "Tienda Ejemplo", servicio: "Productos para tu hogar", icono: "🛍️", simbolo: "M24 30h48l-4 38H28zM36 30c0-8 5-14 12-14s12 6 12 14" },
  espacios: { negocio: "Inmobiliaria Ejemplo", servicio: "Casas y departamentos", icono: "🏠", simbolo: "M16 46L48 18l32 28M26 38v30h44V38M42 68V52h12v16" },
  bienestar: { negocio: "Spa Ejemplo", servicio: "Masajes y relajación", icono: "🌿", simbolo: "M48 70C30 60 24 40 30 20c14 6 24 22 18 50zM48 70c18-10 24-30 18-50-14 6-24 22-18 50z" },
  tecnologia: { negocio: "Tecno Ejemplo", servicio: "Soluciones tecnológicas", icono: "⚙️", simbolo: "M48 30a18 18 0 1 0 .1 0zM48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M24 72l7-7M65 31l7-7" },
  educacion: { negocio: "Academia Ejemplo", servicio: "Cursos y capacitación", icono: "🎓", simbolo: "M12 38l36-16 36 16-36 16zM26 44v16c8 6 36 6 44 0V44" },
  turismo: { negocio: "Hostal Ejemplo", servicio: "Tours y alojamiento", icono: "🏔️", simbolo: "M10 70l26-40 14 20 10-12 26 32z" },
  creativos: { negocio: "Foto Ejemplo", servicio: "Fotografía profesional", icono: "📷", simbolo: "M18 32h14l6-8h20l6 8h14v36H18zM48 40a10 10 0 1 0 .1 0z" },
  eventos: { negocio: "Eventos Ejemplo", servicio: "Bodas y celebraciones", icono: "💍", simbolo: "M38 44a14 14 0 1 0 .1 0zM58 44a14 14 0 1 0 .1 0z" },
  otro: { negocio: "Empresa Ejemplo", servicio: "Servicios de calidad", icono: "⭐", simbolo: "M48 14l10 22 24 2-18 16 6 24-22-13-22 13 6-24-18-16 24-2z" },
};
export const datosRubro = (r: string) => RUBRO[r] ?? RUBRO.otro;

const pagina = (cuerpo: string, estilo: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}${estilo}</style></head><body>${cuerpo}</body></html>`;

/** HTML de una maqueta web genérica. */
export function webArquetipo(plantilla: string, rubro: string): string {
  const d = datosRubro(rubro);
  const tarjetas = (clase: string) => ["Calidad", "Confianza", "Experiencia"].map((t, i) => `<div class="${clase}"><div class="ic">${["✔", "★", "♥"][i]}</div><h3>${t}</h3><p>Brindamos un servicio de excelencia con los mejores profesionales para satisfacer todas sus necesidades.</p></div>`).join("");
  switch (plantilla) {
    case "landing-degradado":
      return pagina(`<nav><b>${d.negocio}</b><span>Inicio · Servicios · Precios · Contacto</span><a>Empezar gratis</a></nav>
<header><h1>La mejor solución para tu negocio</h1><p>${d.servicio} con tecnología de punta. Rápido, fácil y seguro.</p><a class="b">Comienza ahora →</a><div class="mock"></div></header>
<section class="g">${tarjetas("c")}${tarjetas("c")}</section><section class="t"><p>“Excelente servicio, 100% recomendado.”</p><small>— Cliente feliz</small></section>`,
        `body{font-family:Inter,system-ui,sans-serif;color:#1f2340;background:#f7f7fc}nav{display:flex;justify-content:space-between;align-items:center;padding:20px 6vw;background:transparent;position:absolute;width:100%;color:#fff}nav a{background:#fff;color:#6d28d9;padding:10px 18px;border-radius:999px}header{background:linear-gradient(135deg,#7c3aed,#4f46e5 60%,#06b6d4);color:#fff;text-align:center;padding:150px 6vw 80px}h1{font-size:clamp(34px,5vw,58px);margin:0 0 16px}.b{display:inline-block;background:#fff;color:#4f46e5;padding:16px 30px;border-radius:999px;font-weight:600;box-shadow:0 20px 40px rgba(0,0,0,.25)}.mock{margin:50px auto 0;max-width:820px;height:300px;border-radius:24px;background:rgba(255,255,255,.18);box-shadow:0 40px 80px rgba(0,0,0,.3)}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;padding:70px 6vw}.c{background:#fff;border-radius:20px;padding:28px;box-shadow:0 20px 50px rgba(79,70,229,.12)}.ic{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;display:grid;place-items:center}.t{text-align:center;padding:50px}`);
    case "builder-generica":
      return pagina(`<div class="top">📞 (00) 000-0000 · ✉ info@ejemplo.com</div><nav><b>${d.negocio.toUpperCase()}</b><span>INICIO | NOSOTROS | SERVICIOS | GALERÍA | BLOG | CONTACTO</span></nav>
<div class="slider"><div><h1>${d.servicio}</h1><p>Somos líderes en el mercado</p><a>LEER MÁS</a></div><i>‹</i><i class="d">›</i></div>
<main><article><h2>Bienvenidos a ${d.negocio}</h2><p>Somos una empresa con más de 10 años de experiencia ofreciendo soluciones integrales para nuestros clientes. Nuestra misión es brindar calidad y calidez en cada uno de nuestros servicios.</p><div class="row">${tarjetas("c")}</div></article><aside><h4>Entradas recientes</h4><ul><li>Consejos para el verano</li><li>Nuestro nuevo local</li><li>Feliz día de la madre</li></ul><h4>Categorías</h4><ul><li>Noticias</li><li>Sin categoría</li></ul></aside></main>`,
        `body{font-family:"Open Sans",Arial,sans-serif;color:#555;background:#fff}.top{background:#222;color:#bbb;font-size:12px;padding:8px 5vw}nav{display:flex;justify-content:space-between;padding:22px 5vw;border-bottom:3px solid #e74c3c;font-size:13px}nav b{color:#e74c3c;font-size:22px}.slider{height:420px;background:#9aa4ad linear-gradient(0deg,rgba(0,0,0,.35),rgba(0,0,0,.35));display:grid;place-items:center;text-align:center;color:#fff;position:relative}.slider a{border:2px solid #fff;padding:10px 26px}.slider i{position:absolute;left:20px;top:45%;font-size:50px}.slider .d{left:auto;right:20px}main{display:grid;grid-template-columns:1fr 280px;gap:40px;padding:50px 5vw}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.c{text-align:center;border:1px solid #eee;padding:20px}.ic{font-size:30px;color:#e74c3c}aside{background:#f5f5f5;padding:20px}@media(max-width:700px){main{grid-template-columns:1fr}.row{grid-template-columns:1fr}nav span{display:none}}`);
    case "principiante":
      return pagina(`<center><h1>¡¡¡BIENVENIDOS A ${d.negocio.toUpperCase()}!!!</h1><marquee>*** ${d.servicio} *** los mejores precios *** llámenos ya ***</marquee><table border="1" cellpadding="10"><tr><td><h2>Quiénes somos</h2>somos una empresa dedicada a ${d.servicio.toLowerCase()} con los mejores precios del mercado!!!</td><td style="font-size:80px">${d.icono}</td></tr><tr><td colspan="2"><h2>SERVICIOS</h2><ul><li>servicio 1</li><li>servicio 2</li><li>servicio 3</li></ul></td></tr></table><p><u><font color="blue">Haga click aquí para contactarnos</font></u></p><p>Visitante número: 000123</p></center>`,
        `body{font-family:"Comic Sans MS","Comic Sans",cursive;background:#ffff66;color:#c00;padding:20px}h1{color:#00c;text-shadow:3px 3px #f0f}table{background:#fff;color:#000;max-width:700px}marquee{background:#0c0;color:#fff;font-weight:bold}`);
    case "principiante-recargada":
      return pagina(`<div class="b1">${d.icono} ${d.negocio} ${d.icono}</div><div class="b2">✨ OFERTA ✨ 50% OFF ✨ SOLO HOY ✨</div><div class="grid"><div style="background:#ff69b4">CALIDAD</div><div style="background:#00ced1">PRECIO</div><div style="background:#ffa500">SERVICIO</div><div style="background:#7fff00">GARANTÍA</div></div><h2>${d.servicio}!!! 📞📞📞</h2><p>Somos los mejores!!! Contamos con todo lo que necesitas y más. Visítanos!!! Te esperamos!!! Síguenos en todas nuestras redes sociales!!!</p><div class="foot">© Todos los derechos reservados · Diseñado por mi primo</div>`,
        `body{font-family:Impact,Arial Black,sans-serif;background:radial-gradient(circle,#fff 0,#ffd700 40%,#ff4500 100%);text-align:center;padding:16px}.b1{font-size:46px;color:#8b00ff;border:8px dashed #00f;padding:10px;background:#fff}.b2{margin:10px 0;font-size:26px;background:#f00;color:#ff0;padding:8px;border:4px double #000}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.grid div{padding:30px;font-size:28px;color:#fff;text-shadow:2px 2px #000;border:5px ridge #999}h2{color:#006400;font-family:"Times New Roman";font-size:34px}p{font-family:Arial;font-size:18px;color:#00008b;background:#e0ffff}.foot{font-family:Arial;font-size:11px;background:#000;color:#0f0;padding:8px}`);
    case "corporativa-azul":
    default:
      return pagina(`<nav><b>${d.icono} ${d.negocio}</b><span>Inicio &nbsp; Nosotros &nbsp; Servicios &nbsp; Contacto</span></nav>
<header><h1>Bienvenidos a ${d.negocio}</h1><p>${d.servicio} con calidad y calidez. Tu mejor opción.</p><a>Contáctanos</a></header>
<section><h2>Nuestros servicios</h2><div class="g">${tarjetas("c")}</div></section><section class="n"><h2>¿Por qué elegirnos?</h2><p>Contamos con un equipo de profesionales altamente capacitados comprometidos con la excelencia.</p><div class="k"><span>+500<br><small>clientes felices</small></span><span>+10<br><small>años de experiencia</small></span><span>100%<br><small>satisfacción</small></span></div></section><footer>© 2025 ${d.negocio}. Todos los derechos reservados.</footer>`,
        `body{font-family:Roboto,Arial,sans-serif;color:#333;background:#fff}nav{display:flex;justify-content:space-between;padding:20px 8vw;box-shadow:0 2px 10px rgba(0,0,0,.08)}nav b{color:#1e63c6}header{text-align:center;padding:130px 8vw;background:linear-gradient(rgba(20,60,130,.6),rgba(20,60,130,.6)),linear-gradient(120deg,#8fb3d9,#c7d6e8);color:#fff}h1{font-size:clamp(32px,4vw,52px);margin:0 0 12px}header a{display:inline-block;margin-top:22px;background:#1e63c6;padding:14px 32px;border-radius:6px}section{text-align:center;padding:70px 8vw}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px}.c{padding:30px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.08)}.ic{font-size:30px;color:#1e63c6}.n{background:#f3f6fb}.k{display:flex;justify-content:center;gap:60px;font-size:34px;color:#1e63c6;flex-wrap:wrap}footer{background:#123c80;color:#cfd8e6;text-align:center;padding:24px}`);
  }
}

/** SVG de un logo genérico. */
export function logoArquetipo(plantilla: string, rubro: string): string {
  const d = datosRubro(rubro);
  const n = d.negocio.split(" ")[0];
  const iniciales = d.negocio.split(" ").map((x) => x[0]).join("").slice(0, 2);
  const lienzo = (cuerpo: string, fondo = "#fff") => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 400 400"><rect width="400" height="400" fill="${fondo}"/>${cuerpo}</svg>`;
  switch (plantilla) {
    case "iniciales-circulo":
      return lienzo(`<circle cx="200" cy="170" r="90" fill="none" stroke="#1e3a5f" stroke-width="8"/><text x="200" y="198" text-anchor="middle" font-family="Georgia,serif" font-size="80" fill="#1e3a5f">${iniciales}</text><text x="200" y="310" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="6" fill="#1e3a5f">${d.negocio.toUpperCase()}</text>`);
    case "swoosh-degradado":
      return lienzo(`<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#00c6ff"/><stop offset="1" stop-color="#7b2ff7"/></linearGradient></defs><path d="M90 210c60-90 170-110 230-60-70-20-150 0-230 60z" fill="url(#g)"/><text x="200" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="48" fill="#333" style="filter:drop-shadow(2px 3px 2px rgba(0,0,0,.35))">${n}</text><text x="200" y="305" text-anchor="middle" font-family="Arial" font-size="20" fill="#7b2ff7">${d.servicio}</text>`);
    case "clipart":
      return lienzo(`<text x="200" y="190" text-anchor="middle" font-size="140">${d.icono}</text><text x="200" y="280" text-anchor="middle" font-family="'Comic Sans MS',cursive" font-size="46" fill="#ff1493" stroke="#00f" stroke-width="2">${d.negocio}</text><text x="200" y="330" text-anchor="middle" font-family="'Brush Script MT',cursive" font-size="30" fill="#228b22">${d.servicio}!!</text>`, "#fffacd");
    case "tipografia-sistema":
      return lienzo(`<text x="200" y="215" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="54" fill="#d00" style="filter:drop-shadow(4px 4px 0 #999)">${d.negocio.toUpperCase()}</text>`);
    case "icono-literal":
    default:
      return lienzo(`<g transform="translate(152 70)" fill="none" stroke="#1e88e5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="${d.simbolo}"/></g><text x="200" y="250" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-weight="600" font-size="40" fill="#1e88e5">${d.negocio}</text><text x="200" y="285" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-size="18" fill="#7a8a99">${d.servicio}</text>`);
  }
}
