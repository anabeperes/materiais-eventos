import { notFound } from "next/navigation";
import { buscarMaterialPorId, listarEventos, listarPalestrantes } from "@/lib/data";
import { atualizarMaterial } from "../../actions";
import { BotaoExcluirMaterial } from "../../botoes";
import { FormularioMaterial } from "../formulario";

export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [material, eventos, palestrantes] = await Promise.all([buscarMaterialPorId(id), listarEventos(), listarPalestrantes()]);
  if (!material) notFound();
  const action = atualizarMaterial.bind(null, id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Editar material</h1>
      <FormularioMaterial
        eventos={eventos}
        palestrantes={palestrantes}
        material={material}
        action={action}
        extra={<BotaoExcluirMaterial id={material.id} titulo={material.titulo} />}
      />
    </div>
  );
}
