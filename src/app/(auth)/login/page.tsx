import { FormularioLogin } from "./formulario";

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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-marca text-lg font-bold text-white">
            AE
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Acervo de Eventos</h1>
          <p className="mt-1 text-sm text-texto-suave">Mentoria Fluxo — acesso interno</p>
        </div>
        {erro && MENSAGENS[erro] && (
          <p className="mb-4 rounded-lg border border-erro/30 bg-erro/10 px-3 py-2 text-sm text-erro">
            {MENSAGENS[erro]}
          </p>
        )}
        <FormularioLogin />
      </div>
    </main>
  );
}
