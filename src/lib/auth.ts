import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types";

/**
 * Usuário da allowlist correspondente à sessão atual.
 * Retorna null se não há sessão ou se o e-mail não está (mais) na allowlist.
 */
export const getUsuarioAtual = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("usuario_atual");
  const usuario = (Array.isArray(data) ? data[0] : data) as Usuario | null | undefined;
  if (!usuario || !usuario.id) return null;
  return usuario;
});

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login?erro=sem-acesso");
  return usuario;
}

export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin") redirect("/?erro=somente-admin");
  return usuario;
}
