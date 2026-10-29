// La esquina con la versión y la hora del último build (sistema/34). Así se sabe si ya llegó lo nuevo.
import { VERSION, horaBuild } from "@/lib/version";

export function Version({ className = "" }: { className?: string }) {
  const commit = process.env.NEXT_PUBLIC_COMMIT;
  return (
    <span className={`pointer-events-auto select-text font-mono text-[10.5px] tracking-tight text-tinta/45 ${className}`} title={`Versión ${VERSION} · build ${horaBuild()} (hora de Cuenca)${commit ? ` · commit ${commit}` : ""}`}>
      v{VERSION} · {horaBuild()}{commit ? ` · ${commit}` : ""}
    </span>
  );
}
