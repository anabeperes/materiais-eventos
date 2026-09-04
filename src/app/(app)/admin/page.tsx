import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { BadgeTipo } from "@/components/ui/badge";
import { listarEventosComContagem, listarTodosMateriais } from "@/lib/data";
import { formatarData } from "@/lib/utils";
import { BotaoExcluirEvento } from "./botoes";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const [materiais, eventos] = await Promise.all([listarTodosMateriais(), listarEventosComContagem()]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Materiais</h1>
          <span className="text-sm text-texto-suave">{materiais.length} no total</span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-fundo text-left text-xs uppercase tracking-wider text-texto-suave">
              <tr>
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Evento</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Palestrantes</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {materiais.map((m) => (
                <tr key={m.id} className="hover:bg-fundo/60">
                  <td className="px-3 py-2">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {m.titulo}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-texto-suave">
                    <Link href={`/eventos/${m.evento.slug}`} className="hover:underline">
                      {m.evento.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <BadgeTipo tipo={m.tipo} />
                  </td>
                  <td className="px-3 py-2 text-texto-suave">{m.palestrantes.map((p) => p.nome).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/materiais/${m.id}`} className="inline-flex rounded-md p-1.5 text-texto-suave hover:bg-fundo" title="Editar">
                      <Pencil size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {materiais.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-texto-suave">
                    Nenhum material. Cadastre um ou importe um CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Eventos</h2>
        <ul className="mt-3 divide-y divide-borda rounded-xl border border-borda bg-superficie text-sm">
          {eventos.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <Link href={`/eventos/${e.slug}`} className="font-medium hover:underline">
                  {e.nome}
                </Link>
                <span className="ml-2 text-xs text-texto-suave">
                  {formatarData(e.data_evento)} · {e.total_materiais} materiais
                </span>
              </div>
              <BotaoExcluirEvento id={e.id} nome={e.nome} total={e.total_materiais} />
            </li>
          ))}
          {eventos.length === 0 && <li className="px-3 py-4 text-texto-suave">Nenhum evento.</li>}
        </ul>
      </section>
    </div>
  );
}
