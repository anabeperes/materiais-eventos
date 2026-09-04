import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarUsuarios } from "@/lib/data";
import { FormularioUsuario, LinhaUsuario } from "./cliente";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const [atual, usuarios] = await Promise.all([exigirAdmin(), listarUsuarios()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Usuários com acesso</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Só e-mails desta lista conseguem entrar. Desativar um usuário bloqueia o acesso na próxima navegação.
        </p>
      </div>

      <FormularioUsuario />

      <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie text-sm">
        {usuarios.map((u) => (
          <LinhaUsuario key={u.id} usuario={u} souEu={u.id === atual.id} />
        ))}
      </ul>
    </div>
  );
}
