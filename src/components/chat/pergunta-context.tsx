"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Ponte entre a sidebar e o chat: clicar num evento injeta a pergunta
 * no chat sem sair da tela (PRD, seção 6).
 */
interface Ctx {
  registrar: (fn: ((pergunta: string) => void) | null) => void;
  perguntar: (pergunta: string) => void;
  chatAtivo: boolean;
}

const PerguntaContext = createContext<Ctx | null>(null);

export function PerguntaProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<((pergunta: string) => void) | null>(null);
  const [chatAtivo, setChatAtivo] = useState(false);

  const registrar = useCallback((fn: ((pergunta: string) => void) | null) => {
    ref.current = fn;
    setChatAtivo(Boolean(fn));
  }, []);
  const perguntar = useCallback((p: string) => {
    ref.current?.(p);
  }, []);

  const valor = useMemo(() => ({ registrar, perguntar, chatAtivo }), [registrar, perguntar, chatAtivo]);

  return <PerguntaContext.Provider value={valor}>{children}</PerguntaContext.Provider>;
}

export function usePerguntaContext() {
  const ctx = useContext(PerguntaContext);
  if (!ctx) throw new Error("usePerguntaContext precisa estar dentro de PerguntaProvider");
  return ctx;
}
