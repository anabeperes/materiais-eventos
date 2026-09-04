"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPOS_MATERIAL, TIPO_LABEL, type EventoComContagem, type Palestrante } from "@/lib/types";

export interface DadosSidebar {
  eventos: EventoComContagem[];
  palestrantes: Palestrante[];
  anos: number[];
  tags: string[];
}

interface Props extends DadosSidebar {
  aberta: boolean;
  onFechar: () => void;
  /** Quando definido (tela do chat), clicar injeta a pergunta no chat em vez de navegar. */
  onPerguntar?: (pergunta: string) => void;
}

function Secao({
  titulo,
  aberto = true,
  destaque = false,
  children,
}: {
  titulo: string;
  aberto?: boolean;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(aberto);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1 px-2 py-1.5 hover:text-texto",
          destaque ? "text-base font-bold text-texto" : "text-[11px] font-semibold uppercase tracking-wider text-texto-suave",
        )}
      >
        {open ? <ChevronDown size={destaque ? 16 : 12} /> : <ChevronRight size={destaque ? 16 : 12} />}
        {titulo}
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

export function Sidebar({ eventos, palestrantes, anos, tags, aberta, onFechar, onPerguntar }: Props) {
  const item = (
    label: React.ReactNode,
    pergunta: string,
    href: string,
    extra?: React.ReactNode,
  ) => {
    const classes =
      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-texto hover:bg-fundo";
    if (onPerguntar) {
      return (
        <button
          type="button"
          className={classes}
          onClick={() => {
            onPerguntar(pergunta);
            onFechar();
          }}
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {extra}
        </button>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onFechar}>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {extra}
      </Link>
    );
  };

  return (
    <>
      {aberta && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onFechar} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-borda bg-superficie transition-transform md:static md:z-auto md:w-64 md:translate-x-0 lg:w-72",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-3 md:hidden">
          <span className="font-semibold">Materiais Eventos</span>
          <button type="button" onClick={onFechar} className="rounded-lg p-2 text-texto-suave hover:bg-fundo" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-suave flex-1 space-y-4 overflow-y-auto px-2 py-3">
          <Secao titulo="Eventos" destaque>
            {eventos.length === 0 && (
              <p className="px-2 py-1 text-xs text-texto-suave">Nenhum evento cadastrado ainda.</p>
            )}
            {eventos.map((e) =>
              (
                <div key={e.id}>
                  {item(e.nome, `materiais do evento ${e.nome}`, `/eventos/${e.slug}`)}
                </div>
              ),
            )}
          </Secao>

          <div className="border-t border-borda" />

          <Secao titulo="Refinar" aberto={false}>
            <Secao titulo="Palestrante" aberto={false}>
              {palestrantes.map((p) => (
                <div key={p.id}>{item(p.nome, `materiais do palestrante ${p.nome}`, `/palestrantes#${p.slug}`)}</div>
              ))}
              {palestrantes.length === 0 && <p className="px-2 text-xs text-texto-suave">—</p>}
            </Secao>
            <Secao titulo="Ano" aberto={false}>
              {anos.map((a) => (
                <div key={a}>{item(String(a), `materiais dos eventos de ${a}`, `/buscar?ano=${a}`)}</div>
              ))}
              {anos.length === 0 && <p className="px-2 text-xs text-texto-suave">—</p>}
            </Secao>
            <Secao titulo="Tipo" aberto={false}>
              {TIPOS_MATERIAL.map((t) => (
                <div key={t}>{item(TIPO_LABEL[t], `todos os materiais do tipo ${TIPO_LABEL[t].toLowerCase()}`, `/buscar?tipo=${t}`)}</div>
              ))}
            </Secao>
            <Secao titulo="Tag" aberto={false}>
              {tags.map((t) => (
                <div key={t}>{item(`#${t}`, `materiais com a tag ${t}`, `/buscar?q=${encodeURIComponent(t)}`)}</div>
              ))}
              {tags.length === 0 && <p className="px-2 text-xs text-texto-suave">—</p>}
            </Secao>
          </Secao>
        </div>
      </aside>
    </>
  );
}
