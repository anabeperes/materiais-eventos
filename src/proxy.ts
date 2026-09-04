import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

const OBRIGATORIAS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export async function proxy(request: NextRequest) {
  const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]?.trim());
  if (faltando.length > 0) {
    // Em vez de um 500 mudo, diz exatamente o que falta configurar na hospedagem.
    return new NextResponse(
      `Configuração incompleta.\n\nFaltam estas variáveis de ambiente no servidor:\n- ${faltando.join("\n- ")}\n\nNa Vercel: Settings → Environment Variables (tipo Config), depois Redeploy.`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  try {
    return await atualizarSessao(request);
  } catch (e) {
    console.error("proxy de sessão falhou", e);
    return new NextResponse(
      "Não foi possível validar a sessão. Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão corretas na hospedagem.",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|template-importacao.csv|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
