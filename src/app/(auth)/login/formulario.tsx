"use client";

import { useActionState } from "react";
import { enviarLinkMagico, type EstadoLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioLogin() {
  const [estado, action, pendente] = useActionState<EstadoLogin, FormData>(enviarLinkMagico, {});

  if (estado.ok) {
    return (
      <div className="rounded-xl border border-borda bg-white p-6 text-center shadow-sm">
        <h2 className="font-medium">Link enviado</h2>
        <p className="mt-2 text-sm text-texto-suave">
          Abra o e-mail em <span className="font-medium text-texto">{estado.email}</span> e clique no link para entrar.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-borda bg-white p-6 shadow-sm">
      <label htmlFor="email" className="mb-1 block text-sm font-medium">
        Seu e-mail
      </label>
      <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required autoFocus />
      {estado.erro && <p className="mt-2 text-sm text-erro">{estado.erro}</p>}
      <Button type="submit" className="mt-4 w-full" disabled={pendente}>
        {pendente ? "Enviando..." : "Receber link de acesso"}
      </Button>
      <p className="mt-3 text-center text-xs text-texto-suave">Sem senha. Só entra quem está na lista.</p>
    </form>
  );
}
