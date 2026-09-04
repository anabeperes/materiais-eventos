"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotaoCopiar({
  texto,
  rotulo = "Copiar link",
  rotuloCopiado = "Copiado!",
  className,
  tamanho = "md",
}: {
  texto: string;
  rotulo?: string;
  rotuloCopiado?: string;
  className?: string;
  tamanho?: "sm" | "md";
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback para contextos sem clipboard API (http, iframes)
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-borda bg-superficie font-medium text-texto transition-colors hover:bg-fundo",
        tamanho === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
        copiado && "border-marca bg-marca-clara",
        className,
      )}
      title={rotulo}
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
      {copiado ? rotuloCopiado : rotulo}
    </button>
  );
}
