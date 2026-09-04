import { cn } from "@/lib/utils";
import { TIPO_LABEL, type TipoMaterial } from "@/lib/types";

const cores: Record<TipoMaterial, string> = {
  slide: "bg-amber-100 text-amber-800",
  gravacao: "bg-rose-100 text-rose-800",
  pdf: "bg-red-100 text-red-800",
  planilha: "bg-emerald-100 text-emerald-800",
  link: "bg-sky-100 text-sky-800",
  outro: "bg-neutral-200 text-neutral-700",
};

export function BadgeTipo({ tipo, className }: { tipo: TipoMaterial; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium", cores[tipo] ?? cores.outro, className)}>
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md bg-fundo px-1.5 py-0.5 text-[11px] text-texto-suave">#{children}</span>;
}
