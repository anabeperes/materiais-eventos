import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { MaterialCard } from "@/components/material-card";
import { getUsuarioAtual } from "@/lib/auth";
import { buscarEventoPorSlug, listarMateriaisDoEvento } from "@/lib/data";
import { formatarData } from "@/lib/utils";

export default async function EventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evento = await buscarEventoPorSlug(slug);
  if (!evento) notFound();
  const [materiais, usuario] = await Promise.all([listarMateriaisDoEvento(evento.id), getUsuarioAtual()]);
  const admin = usuario?.papel === "admin";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/eventos" className="text-xs text-texto-suave hover:underline">
        ← Eventos
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{evento.nome}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {formatarData(evento.data_evento)}
            {evento.local ? ` · ${evento.local}` : ""}
          </p>
          {evento.descricao && <p className="mt-2 text-sm">{evento.descricao}</p>}
        </div>
        {admin && (
          <Link
            href={`/admin/materiais/novo?evento=${evento.id}`}
            className="inline-flex h-9 items-center rounded-lg border border-borda bg-superficie px-3 text-sm hover:bg-fundo"
          >
            + Material neste evento
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {materiais.map((m) => (
          <MaterialCard
            key={m.id}
            id={m.id}
            titulo={m.titulo}
            url={m.url}
            tipo={m.tipo}
            descricao={m.descricao}
            tags={m.tags}
            eventoNome={m.evento.nome}
            eventoSlug={m.evento.slug}
            dataEvento={m.evento.data_evento}
            palestrantes={m.palestrantes.map((p) => p.nome)}
            ocultarEvento
            acoes={
              admin ? (
                <Link href={`/admin/materiais/${m.id}`} className="rounded-lg p-2 text-texto-suave hover:bg-fundo" title="Editar">
                  <Pencil size={16} />
                </Link>
              ) : null
            }
          />
        ))}
        {materiais.length === 0 && (
          <p className="rounded-xl border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
            Nenhum material cadastrado neste evento.
          </p>
        )}
      </div>
    </div>
  );
}
