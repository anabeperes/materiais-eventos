import type { Metadata } from "next";
import { listarEventos, listarPalestrantes } from "@/lib/data";
import { criarMaterial } from "../../actions";
import { FormularioMaterial } from "../formulario";

export const metadata: Metadata = { title: "Novo material" };

export default async function NovoMaterialPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const { evento } = await searchParams;
  const [eventos, palestrantes] = await Promise.all([listarEventos(), listarPalestrantes()]);
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Novo material</h1>
      <FormularioMaterial eventos={eventos} palestrantes={palestrantes} eventoInicial={evento} action={criarMaterial} />
    </div>
  );
}
