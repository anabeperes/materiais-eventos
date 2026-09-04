import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Evento } from "@/lib/types";
import { atualizarEvento } from "../../actions";
import { FormularioEvento } from "./formulario";

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle();
  const evento = data as Evento | null;
  if (!evento) notFound();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Editar evento</h1>
        <Link href={`/eventos/${evento.slug}`} className="text-sm text-texto-suave hover:underline">
          Ver página do evento
        </Link>
      </div>
      <FormularioEvento evento={evento} action={atualizarEvento.bind(null, evento.id)} />
    </div>
  );
}
