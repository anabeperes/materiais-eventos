"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Usuario } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adicionarUsuario, alterarPapel, alternarUsuarioAtivo, type EstadoForm } from "../actions";

export function FormularioUsuario() {
  const [estado, action, pendente] = useActionState<EstadoForm, FormData>(adicionarUsuario, {});
  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-texto-suave">E-mail</label>
        <Input name="email" type="email" placeholder="pessoa@exemplo.com" required />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-texto-suave">Nome</label>
        <Input name="nome" placeholder="Opcional" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-texto-suave">Papel</label>
        <Select name="papel" defaultValue="membro" className="sm:w-32">
          <option value="membro">Membro</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Adicionar"}
      </Button>
      {estado.erro && <p className="text-sm text-erro sm:ml-2">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-marca sm:ml-2">Adicionado.</p>}
    </form>
  );
}

export function LinhaUsuario({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const [pendente, start] = useTransition();
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-2.5", !usuario.ativo && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {usuario.email}
          {souEu && <span className="ml-2 text-xs font-normal text-texto-suave">(você)</span>}
        </p>
        {usuario.nome && <p className="text-xs text-texto-suave">{usuario.nome}</p>}
      </div>
      <Select
        value={usuario.papel}
        disabled={pendente || souEu}
        onChange={(e) => start(() => alterarPapel(usuario.id, e.target.value as "admin" | "membro"))}
        className="h-8 w-28 text-xs"
      >
        <option value="membro">Membro</option>
        <option value="admin">Admin</option>
      </Select>
      <Button
        tamanho="sm"
        variante={usuario.ativo ? "secundario" : "primario"}
        disabled={pendente || souEu}
        onClick={() => start(() => alternarUsuarioAtivo(usuario.id, !usuario.ativo))}
      >
        {usuario.ativo ? "Desativar" : "Reativar"}
      </Button>
    </li>
  );
}
