import type { Metadata } from "next";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar CSV" };

export default function ImportarPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Importar CSV</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Colunas: <code className="rounded bg-fundo px-1">evento_nome, data_evento, material_titulo, url, tipo, palestrante_nome, tags, descricao</code>.
        Vários palestrantes ou tags na mesma célula: separe por <code className="rounded bg-fundo px-1">;</code>. Eventos e palestrantes
        que não existem são criados automaticamente (deduplicando por nome).
      </p>
      <a href="/template-importacao.csv" download className="mt-2 inline-block text-sm text-marca hover:underline">
        Baixar template CSV
      </a>
      <div className="mt-6">
        <Importador />
      </div>
    </div>
  );
}
