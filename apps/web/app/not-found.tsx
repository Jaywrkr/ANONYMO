import Link from "next/link";

// Página no encontrada (sistema/102): sin adornos, con la salida a la vista.
export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-[720px] flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-[13px] text-gris">404</p>
      <h1 className="font-display text-[36px] leading-[1.2]">esta página se desarmó.</h1>
      <p className="max-w-[46ch] text-[17px] leading-[1.6] text-gris">No encontramos lo que buscabas. Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link href="/" className="w-fit border border-tinta px-5 py-3 text-[15px] font-medium">Volver al inicio</Link>
    </main>
  );
}
