import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

const EXT = ["webp", "avif", "jpg", "jpeg", "png"];

/** Busca public/fotos/<nombre>.<ext> al compilar. */
export function rutaFoto(nombre: string): string | undefined {
  const ext = EXT.find((e) => existsSync(join(process.cwd(), "public", "fotos", `${nombre}.${e}`)));
  return ext ? `/fotos/${nombre}.${ext}` : undefined;
}

interface Props {
  nombre: string;
  alt: string;
  /** Texto del espacio mientras no hay foto. */
  pendiente: string;
  proporcion?: string;
  colores?: [string, string];
  className?: string;
  prioridad?: boolean;
  tamanos?: string;
}

// Foto real si existe; si no, un espacio diseñado con el mismo encuadre (web/20).
export function Foto({ nombre, alt, pendiente, proporcion = "4 / 5", colores = ["#d6d3cb", "#efede8"], className = "", prioridad, tamanos = "(min-width: 768px) 40vw, 90vw" }: Props) {
  const src = rutaFoto(nombre);
  return (
    <figure className={`relative m-0 overflow-hidden rounded-3xl ${className}`} style={{ aspectRatio: proporcion }}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={tamanos} priority={prioridad} className="object-cover" />
      ) : (
        <div role="img" aria-label={alt} className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 30% 20%, ${colores[1]}, ${colores[0]})` }}>
          <span className="absolute bottom-4 left-4 font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{pendiente}</span>
        </div>
      )}
    </figure>
  );
}
