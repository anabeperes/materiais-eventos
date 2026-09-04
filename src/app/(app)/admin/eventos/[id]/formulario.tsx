"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Evento } from "@/lib/types";
import type { EstadoForm } from "../../actions";

export function FormularioEvento({
  evento,
  action,
}: {
  evento: Evento;
  action: (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-borda bg-superficie p-5">
      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={evento.nome} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="data_evento">Data</Label>
          <Input id="data_evento" name="data_evento" type="date" defaultValue={evento.data_evento ?? ""} />
          <p className="mt-1 text-xs text-texto-suave">Deixe em branco se não souber.</p>
        </div>
        <div>
          <Label htmlFor="local">Local</Label>
          <Input id="local" name="local" defaultValue={evento.local ?? ""} placeholder="São Paulo, Online..." />
        </div>
      </div>
      <div>
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" name="descricao" defaultValue={evento.descricao ?? ""} />
      </div>
      {estado.erro && <p className="text-sm text-erro">{estado.erro}</p>}
      {estado.ok && <p className="text-sm font-medium text-texto">Salvo.</p>}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar evento"}
      </Button>
    </form>
  );
}
