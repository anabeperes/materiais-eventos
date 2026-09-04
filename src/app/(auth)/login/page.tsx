import { FormularioLogin } from "./formulario";
import { Logo } from "@/components/logo";

const MENSAGENS: Record<string, string> = {
  "sem-acesso": "Seu e-mail não está mais na lista de acesso. Fale com o admin.",
  "link-invalido": "Esse link expirou ou já foi usado. Peça um novo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo tamanho={64} className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">Materiais Eventos</h1>
          <p className="mt-1 text-sm text-texto-suave">Mentoria Fluxo — acesso interno</p>
        </div>
        {erro && MENSAGENS[erro] && (
          <p className="mb-4 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm font-medium text-texto">
            {MENSAGENS[erro]}
          </p>
        )}
        <FormularioLogin />
      </div>
    </main>
  );
}
