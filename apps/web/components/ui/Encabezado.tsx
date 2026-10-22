import Link from "next/link";

export function Encabezado() {
  return (
    <header className="relative z-[3] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-[max(20px,env(safe-area-inset-left))] py-5 font-mono text-[11px] uppercase tracking-[0.14em] md:px-10">
      <Link href="/" className="text-tinta">
        Anonymo<sup className="ml-1 text-gris">*</sup>
      </Link>
      <nav className="flex gap-4 whitespace-nowrap text-gris md:gap-6">
        <Link className="hover:text-tinta" href="/#equipo">Equipo</Link>
        <Link className="hover:text-tinta" href="/sala">La sala</Link>
        <Link className="hover:text-tinta" href="/#como">Fases</Link>
        <Link className="hover:text-tinta" href="/sistema">Sistema</Link>
      </nav>
      <span className="hidden text-gris md:inline">Cuenca · 2°54′S 79°00′O</span>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="relative z-[3] mt-24 flex flex-wrap justify-between gap-4 border-t border-linea px-[max(20px,env(safe-area-inset-left))] py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-gris md:px-10">
      <span>* Nombre provisional</span>
      <span>Fase 1 · dirección de arte</span>
      <span>Cuenca, Ecuador · 2026</span>
    </footer>
  );
}
