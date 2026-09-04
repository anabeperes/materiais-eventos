"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { confirmarImportacao, previewImportacao, type LinhaCsv, type LinhaPreview } from "../actions";

const COLUNAS: (keyof LinhaCsv)[] = [
  "evento_nome",
  "data_evento",
  "material_titulo",
  "url",
  "tipo",
  "palestrante_nome",
  "tags",
  "descricao",
];

export function Importador() {
  const [linhas, setLinhas] = useState<LinhaCsv[]>([]);
  const [preview, setPreview] = useState<LinhaPreview[] | null>(null);
  const [resultado, setResultado] = useState<{ importados: number; erros: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  function lerArquivo(file: File | undefined) {
    if (!file) return;
    setErro(null);
    setResultado(null);
    setPreview(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const faltando = ["evento_nome", "material_titulo", "url"].filter((c) => !res.meta.fields?.includes(c));
        if (faltando.length) {
          setErro(`Colunas obrigatórias ausentes: ${faltando.join(", ")}`);
          return;
        }
        const dados = res.data.map((r) => {
          const l = {} as LinhaCsv;
          for (const c of COLUNAS) l[c] = (r[c] ?? "").trim();
          return l;
        });
        setLinhas(dados);
        start(async () => {
          try {
            setPreview(await previewImportacao(dados));
          } catch {
            setErro("Não foi possível gerar o preview.");
          }
        });
      },
      error: () => setErro("Não foi possível ler o arquivo."),
    });
  }

  const validas = preview?.filter((p) => p.status !== "erro") ?? [];
  const comErro = preview?.filter((p) => p.status === "erro") ?? [];

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-borda bg-superficie p-8 text-center hover:border-marca">
        <span className="text-sm font-medium">Escolher arquivo CSV</span>
        <span className="mt-1 text-xs text-texto-suave">UTF-8, separado por vírgula, com cabeçalho</span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => lerArquivo(e.target.files?.[0])} />
      </label>

      {erro && <p className="rounded-lg border border-erro/30 bg-erro/10 px-3 py-2 text-sm text-erro">{erro}</p>}
      {pendente && !preview && <p className="text-sm text-texto-suave">Analisando...</p>}

      {preview && !resultado && (
        <div className="space-y-3">
          <p className="text-sm">
            <span className="font-medium">{validas.length}</span> linhas prontas para importar
            {comErro.length > 0 && (
              <>
                , <span className="font-medium text-erro">{comErro.length}</span> com erro (serão ignoradas)
              </>
            )}
            .
          </p>
          <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-fundo text-left uppercase tracking-wider text-texto-suave">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Evento</th>
                  <th className="px-2 py-2">Material</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Palestrante</th>
                  <th className="px-2 py-2">O que vai acontecer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {preview.map((p) => (
                  <tr key={p.linha} className={cn(p.status === "erro" && "bg-erro/5")}>
                    <td className="px-2 py-1.5 text-texto-suave">{p.linha}</td>
                    <td className="px-2 py-1.5">{p.dados.evento_nome}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium">{p.dados.material_titulo}</span>
                      <br />
                      <span className="text-texto-suave">{p.dados.url}</span>
                    </td>
                    <td className="px-2 py-1.5">{p.dados.tipo || "link"}</td>
                    <td className="px-2 py-1.5">{p.dados.palestrante_nome || "—"}</td>
                    <td className="px-2 py-1.5">
                      {p.status === "erro" ? (
                        <span className="text-erro">{p.erro}</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {p.detalhes.map((d, i) => (
                            <li key={i} className={cn(d.startsWith("Atenção") && "text-amber-700")}>
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={pendente || validas.length === 0}
              onClick={() =>
                start(async () => {
                  const ok = linhas.filter((_, i) => preview[i]?.status !== "erro");
                  setResultado(await confirmarImportacao(ok));
                })
              }
            >
              {pendente ? "Importando..." : `Importar ${validas.length} materiais`}
            </Button>
            <Button variante="secundario" onClick={() => setPreview(null)} disabled={pendente}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {resultado && (
        <div className="rounded-xl border border-borda bg-superficie p-4 text-sm">
          <p className="font-medium">{resultado.importados} materiais importados.</p>
          {resultado.erros.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-erro">
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
