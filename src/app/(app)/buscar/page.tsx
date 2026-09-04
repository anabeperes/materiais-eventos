import type { Metadata } from "next";
import { Search } from "lucide-react";
import { MaterialCard } from "@/components/material-card";
import { Input, Select } from "@/components/ui/input";
import { anosDisponiveis, buscarMateriais, listarTodosMateriais } from "@/lib/data";
import { TIPOS_MATERIAL, TIPO_LABEL, type MaterialBusca, type TipoMaterial } from "@/lib/types";

export const metadata: Metadata = { title: "Buscar" };

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; ano?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tipo = TIPOS_MATERIAL.includes(sp.tipo as TipoMaterial) ? (sp.tipo as TipoMaterial) : null;
  const ano = sp.ano && /^\d{4}$/.test(sp.ano) ? Number(sp.ano) : null;
  const anos = await anosDisponiveis();

  let resultados: MaterialBusca[] = [];
  if (q) {
    resultados = await buscarMateriais(q, { tipo, ano, limite: 60 });
  } else if (tipo || ano) {
    // Só filtros, sem termo: lista direta.
    const todos = await listarTodosMateriais();
    resultados = todos
      .filter((m) => (!tipo || m.tipo === tipo) && (!ano || (m.evento.data_evento ?? "").startsWith(String(ano))))
      .map((m) => ({
        material_id: m.id,
        titulo: m.titulo,
        url: m.url,
        tipo: m.tipo,
        descricao: m.descricao,
        tags: m.tags,
        evento_id: m.evento.id,
        evento_nome: m.evento.nome,
        evento_slug: m.evento.slug,
        data_evento: m.evento.data_evento,
        evento_local: m.evento.local,
        palestrantes: m.palestrantes.map((p) => p.nome),
        score: 1,
      }));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Busca manual</h1>
      <p className="mt-1 text-sm text-texto-suave">Sem IA. Busca direta no banco, tolerante a acentos e erros de digitação.</p>

      <form className="mt-4 flex flex-col gap-2 sm:flex-row" action="/buscar" method="get">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave" />
          <Input name="q" defaultValue={q} placeholder="Nome do evento, palestrante, título ou tag" className="pl-9" />
        </div>
        <Select name="tipo" defaultValue={tipo ?? ""} className="sm:w-40">
          <option value="">Todos os tipos</option>
          {TIPOS_MATERIAL.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select name="ano" defaultValue={ano ? String(ano) : ""} className="sm:w-32">
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <button type="submit" className="h-10 rounded-lg bg-marca px-4 text-sm font-medium text-texto hover:bg-marca-escura">
          Buscar
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {(q || tipo || ano) && (
          <p className="text-xs text-texto-suave">
            {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </p>
        )}
        {resultados.map((m) => (
          <MaterialCard
            key={m.material_id}
            id={m.material_id}
            titulo={m.titulo}
            url={m.url}
            tipo={m.tipo}
            descricao={m.descricao}
            tags={m.tags}
            eventoNome={m.evento_nome}
            eventoSlug={m.evento_slug}
            dataEvento={m.data_evento}
            palestrantes={m.palestrantes}
          />
        ))}
        {(q || tipo || ano) && resultados.length === 0 && (
          <p className="rounded-xl border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
            Nada encontrado. Tenta o nome do evento ou do palestrante.
          </p>
        )}
      </div>
    </div>
  );
}
