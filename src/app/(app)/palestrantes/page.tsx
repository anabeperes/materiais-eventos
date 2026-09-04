import type { Metadata } from "next";
import { MaterialCard } from "@/components/material-card";
import { listarMateriaisDoPalestrante, listarPalestrantes } from "@/lib/data";

export const metadata: Metadata = { title: "Palestrantes" };

export default async function PalestrantesPage() {
  const palestrantes = await listarPalestrantes();
  const materiaisPor = await Promise.all(palestrantes.map((p) => listarMateriaisDoPalestrante(p.id)));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Palestrantes</h1>
      <p className="mt-1 text-sm text-texto-suave">{palestrantes.length} cadastrados.</p>

      <div className="mt-6 space-y-8">
        {palestrantes.map((p, i) => (
          <section key={p.id} id={p.slug} className="scroll-mt-4">
            <h2 className="text-base font-semibold">
              {p.nome}
              {p.apelidos.length > 0 && (
                <span className="ml-2 text-xs font-normal text-texto-suave">também: {p.apelidos.join(", ")}</span>
              )}
            </h2>
            <div className="mt-2 space-y-2">
              {materiaisPor[i].map((m) => (
                <MaterialCard
                  key={m.id}
                  id={m.id}
                  titulo={m.titulo}
                  url={m.url}
                  tipo={m.tipo}
                  tags={m.tags}
                  eventoNome={m.evento.nome}
                  eventoSlug={m.evento.slug}
                  dataEvento={m.evento.data_evento}
                  palestrantes={m.palestrantes.map((x) => x.nome)}
                />
              ))}
              {materiaisPor[i].length === 0 && <p className="text-sm text-texto-suave">Sem materiais vinculados.</p>}
            </div>
          </section>
        ))}
        {palestrantes.length === 0 && <p className="text-sm text-texto-suave">Nenhum palestrante ainda.</p>}
      </div>
    </div>
  );
}
