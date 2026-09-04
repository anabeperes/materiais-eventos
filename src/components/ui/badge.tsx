import { cn } from "@/lib/utils";
import { TIPO_LABEL, type TipoMaterial } from "@/lib/types";

const cores: Record<TipoMaterial, string> = {
  slide: "bg-marca-clara text-texto",
  gravacao: "bg-marca-clara text-texto",
  pdf: "bg-marca-clara text-texto",
  planilha: "bg-marca-clara text-texto",
  link: "bg-marca-clara text-texto",
  outro: "bg-fundo text-texto-suave",
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
