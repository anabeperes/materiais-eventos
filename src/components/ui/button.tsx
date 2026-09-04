import * as React from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md";

const variantes: Record<Variante, string> = {
  primario: "bg-marca text-texto hover:bg-marca-escura",
  secundario: "border border-borda bg-white text-texto hover:bg-fundo",
  fantasma: "text-texto hover:bg-fundo",
  perigo: "border border-texto bg-superficie text-texto hover:bg-fundo",
};
const tamanhos: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export function Button({ className, variante = "primario", tamanho = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    />
  );
}

export function buttonClasses(variante: Variante = "primario", tamanho: Tamanho = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    variantes[variante],
    tamanhos[tamanho],
    className,
  );
}
