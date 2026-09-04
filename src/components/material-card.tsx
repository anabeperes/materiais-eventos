import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BadgeTipo, Tag } from "@/components/ui/badge";
import { BotaoCopiar } from "@/components/botao-copiar";
import { formatarData } from "@/lib/utils";
import type { TipoMaterial } from "@/lib/types";

export interface MaterialCardProps {
  id: string;
  titulo: string;
  url: string;
  tipo: TipoMaterial;
  descricao?: string | null;
  tags?: string[];
  eventoNome: string;
  eventoSlug: string;
  dataEvento: string | null;
  palestrantes: string[];
  /** Esconde a linha do evento quando o card já está dentro da página do evento. */
  ocultarEvento?: boolean;
  acoes?: React.ReactNode;
}

export function MaterialCard(p: MaterialCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-3 shadow-sm sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        {!p.ocultarEvento && (
          <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-texto-suave">
            <Link href={`/eventos/${p.eventoSlug}`} className="font-medium text-texto hover:underline">
              {p.eventoNome}
            </Link>
            <span>·</span>
            <span>{formatarData(p.dataEvento)}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{p.titulo}</span>
          <BadgeTipo tipo={p.tipo} />
        </div>
        {p.palestrantes.length > 0 && (
          <p className="mt-0.5 text-xs text-texto-suave">
            {p.palestrantes.length === 1 ? "Palestrante" : "Palestrantes"}: {p.palestrantes.join(", ")}
          </p>
        )}
        {p.descricao && <p className="mt-1 text-sm text-texto-suave">{p.descricao}</p>}
        {p.tags && p.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {p.acoes}
        <BotaoCopiar texto={p.url} />
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-marca px-3 text-sm font-medium text-texto hover:bg-marca-escura"
        >
          Abrir <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
