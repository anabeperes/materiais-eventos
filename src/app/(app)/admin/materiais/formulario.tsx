"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { TIPOS_MATERIAL, TIPO_LABEL, type Evento, type MaterialCompleto, type Palestrante } from "@/lib/types";
import type { EstadoForm } from "../actions";

interface Props {
  eventos: Evento[];
  palestrantes: Palestrante[];
  material?: MaterialCompleto;
  eventoInicial?: string;
  action: (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
  extra?: React.ReactNode;
}

export function FormularioMaterial({ eventos, palestrantes, material, eventoInicial, action, extra }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(action, {});
  const [eventoSel, setEventoSel] = useState(material?.evento_id ?? eventoInicial ?? (eventos[0]?.id ? "" : "__novo__"));
  const idsIniciais = new Set(material?.palestrantes.map((p) => p.id) ?? []);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-borda bg-superficie p-5">
      <div>
        <Label htmlFor="evento_id">Evento</Label>
        <Select id="evento_id" name="evento_id" value={eventoSel} onChange={(e) => setEventoSel(e.target.value)} required>
          <option value="" disabled>
            Selecione...
          </option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
              {e.data_evento ? ` (${e.data_evento.slice(0, 4)})` : ""}
            </option>
          ))}
          <option value="__novo__">+ Criar novo evento</option>
        </Select>
        {eventoSel === "__novo__" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input name="evento_novo_nome" placeholder="Nome do novo evento" required />
            <Input name="evento_novo_data" type="date" className="sm:w-44" />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" defaultValue={material?.titulo} placeholder="Ex.: Slides da apresentação" required />
      </div>

      <div>
        <Label htmlFor="url">URL</Label>
        <Input id="url" name="url" type="url" defaultValue={material?.url} placeholder="https://..." required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue={material?.tipo ?? "slide"}>
            {TIPOS_MATERIAL.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" name="tags" defaultValue={material?.tags.join(", ")} placeholder="oferta, copy (separe por vírgula)" />
        </div>
      </div>

      <div>
        <Label>Palestrantes</Label>
        <div className="flex flex-wrap gap-2">
          {palestrantes.map((p) => (
            <label key={p.id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1.5 text-sm has-checked:border-marca has-checked:bg-marca-clara">
              <input type="checkbox" name="palestrante_ids" value={p.id} defaultChecked={idsIniciais.has(p.id)} className="accent-marca" />
              {p.nome}
            </label>
          ))}
        </div>
        <Input name="palestrantes_novos" className="mt-2" placeholder="Novos palestrantes (separe por vírgula)" />
      </div>

      <div>
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" name="descricao" defaultValue={material?.descricao ?? ""} />
      </div>

      {estado.erro && <p className="text-sm text-erro">{estado.erro}</p>}
      {estado.ok && <p className="text-sm font-medium text-texto">Salvo.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : material ? "Salvar alterações" : "Cadastrar material"}
        </Button>
        {extra}
      </div>
    </form>
  );
}
