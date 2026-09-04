import Link from "next/link";
import type { Metadata } from "next";
import { listarEventosComContagem } from "@/lib/data";
import { formatarData } from "@/lib/utils";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventosPage() {
  const eventos = await listarEventosComContagem();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Eventos</h1>
      <p className="mt-1 text-sm text-texto-suave">{eventos.length} eventos cadastrados.</p>
      <ul className="mt-4 divide-y divide-borda rounded-xl border border-borda bg-superficie">
        {eventos.map((e) => (
          <li key={e.id}>
            <Link href={`/eventos/${e.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.nome}</p>
                <p className="text-xs text-texto-suave">
                  {formatarData(e.data_evento)}
                  {e.local ? ` · ${e.local}` : ""}
                </p>
              </div>
              <span className="rounded-md bg-fundo px-2 py-0.5 text-xs text-texto-suave">
                {e.total_materiais} {e.total_materiais === 1 ? "material" : "materiais"}
              </span>
            </Link>
          </li>
        ))}
        {eventos.length === 0 && <li className="px-4 py-6 text-sm text-texto-suave">Nenhum evento ainda.</li>}
      </ul>
    </div>
  );
}
