"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";

export interface EstadoLogin {
  ok?: boolean;
  erro?: string;
  email?: string;
}

const schema = z.object({ email: z.string().trim().toLowerCase().email("Digite um e-mail válido.") });

export async function enviarLinkMagico(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  const { email } = parsed.data;

  const supabase = await createClient();

  // Allowlist: só manda o link se o e-mail está cadastrado e ativo.
  const { data: permitido, error: erroAllow } = await supabase.rpc("email_permitido", { p_email: email });
  if (erroAllow) return { erro: "Não foi possível verificar o e-mail. Tente de novo." };
  if (!permitido) return { erro: "Esse e-mail não tem acesso ao acervo. Fale com o admin." };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { erro: "Não foi possível enviar o link. Tente de novo em instantes." };

  return { ok: true, email };
}
