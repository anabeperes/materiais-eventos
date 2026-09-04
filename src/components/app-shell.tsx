"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Sidebar, type DadosSidebar } from "@/components/sidebar";
import type { Usuario } from "@/lib/types";
import { PerguntaProvider, usePerguntaContext } from "@/components/chat/pergunta-context";

interface Props {
  usuario: Usuario;
  sidebar: DadosSidebar;
  children: React.ReactNode;
}

export function AppShell(props: Props) {
  return (
    <PerguntaProvider>
      <Shell {...props} />
    </PerguntaProvider>
  );
}

function Shell({ usuario, sidebar, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { perguntar, chatAtivo } = usePerguntaContext();

  return (
    <div className="flex h-dvh flex-col">
      <Header usuario={usuario} onAbrirMenu={() => setMenuAberto(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          {...sidebar}
          aberta={menuAberto}
          onFechar={() => setMenuAberto(false)}
          onPerguntar={chatAtivo ? perguntar : undefined}
        />
        <main className="scroll-suave min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
