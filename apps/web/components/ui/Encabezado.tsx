import Link from "next/link";

const NAV = [
  ["/agentes", "Equipo"],
  ["/proceso", "Proceso"],
  ["/sala", "Sala"],
  ["/casos", "Casos"],
  ["/contacto", "Contacto"],
];

export function Encabezado() {
  return (
    <header className="relative z-[3] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-[max(20px,env(safe-area-inset-left))] py-5 font-mono text-[11px] uppercase tracking-[0.14em] md:px-10">
      <Link href="/" className="text-tinta">
        Anonymo<sup className="ml-1 text-gris">*</sup>
      </Link>
      <nav aria-label="Principal" className="flex gap-3 whitespace-nowrap text-gris sm:gap-6">
        {NAV.map(([href, t]) => (
          <Link key={href} className="hover:text-tinta" href={href}>{t}</Link>
        ))}
      </nav>
      <span className="hidden text-gris lg:inline">Cuenca · 2°54′S 79°00′O</span>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="relative z-[3] mt-24 border-t border-linea px-[max(20px,env(safe-area-inset-left))] py-8 md:px-10">
      <Link href="/contacto" className="display block text-[clamp(56px,10vw,160px)] hover:opacity-70">Hablemos →</Link>
      <div className="mt-8 flex flex-wrap justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-gris">
        <span>* Nombre provisional</span>
        <nav className="flex flex-wrap gap-5">
          {NAV.map(([href, t]) => (
            <Link key={href} className="hover:text-tinta" href={href}>{t}</Link>
          ))}
          <Link className="hover:text-tinta" href="/sistema">Sistema</Link>
        </nav>
        <span>Cuenca, Ecuador · 2026</span>
      </div>
    </footer>
  );
}
