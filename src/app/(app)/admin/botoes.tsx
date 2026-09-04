"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirEvento, excluirMaterial } from "./actions";

export function BotaoExcluirEvento({ id, nome, total }: { id: string; nome: string; total: number }) {
  const [pendente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        const msg =
          total > 0
            ? `Excluir "${nome}" e os ${total} materiais vinculados? Isso não pode ser desfeito.`
            : `Excluir o evento "${nome}"?`;
        if (confirm(msg)) start(() => excluirEvento(id));
      }}
      className="rounded-md p-1.5 text-texto-suave hover:bg-fundo hover:text-texto disabled:opacity-50"
      title="Excluir evento"
    >
      <Trash2 size={15} />
    </button>
  );
}

export function BotaoExcluirMaterial({ id, titulo }: { id: string; titulo: string }) {
  const [pendente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (confirm(`Excluir o material "${titulo}"?`)) start(() => excluirMaterial(id));
      }}
      className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-texto-suave hover:bg-fundo hover:text-texto disabled:opacity-50"
    >
      <Trash2 size={15} /> Excluir
    </button>
  );
}
