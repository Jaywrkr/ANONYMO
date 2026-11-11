// Clientes tiene dos partes (sistema/70): la cartera (los que ya son clientes o están por serlo) y los nuevos que busca Imán.
import Link from "next/link";

export function PestanasClientes({ actual, cartera, nuevos }: { actual: "cartera" | "nuevos"; cartera?: number; nuevos?: number }) {
  const t = (id: "cartera" | "nuevos", href: string, nombre: string, n?: number) => (
    <Link href={href} aria-current={actual === id ? "page" : undefined}
      className={`relative inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap px-3 text-[14px] transition ${actual === id ? "font-medium text-tinta after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-tinta" : "text-medio hover:text-tinta"}`}>
      {nombre}{n !== undefined && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f1ede6] px-1.5 text-[11px] text-medio">{n}</span>}
    </Link>
  );
  return (
    <nav aria-label="Partes de clientes" className="-mx-5 mt-6 border-b border-borde px-5 md:-mx-10 md:px-10">
      <div className="flex gap-1">
        {t("cartera", "/estudio/clientes", "Cartera", cartera)}
        {t("nuevos", "/estudio/clientes/nuevos", "Nuevos · Imán", nuevos)}
      </div>
    </nav>
  );
}
