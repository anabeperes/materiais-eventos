import { createClient } from "@/lib/supabase/server";
import type {
  Evento,
  EventoComContagem,
  MaterialBusca,
  MaterialCompleto,
  Palestrante,
  TipoMaterial,
  Usuario,
} from "@/lib/types";

const MATERIAL_SELECT =
  "id, evento_id, titulo, url, tipo, descricao, tags, criado_por, criado_em, evento:eventos(id, nome, slug, data_evento, local), palestrantes(id, nome, slug)";

type LinhaMaterial = Omit<MaterialCompleto, "evento" | "palestrantes"> & {
  evento: MaterialCompleto["evento"] | MaterialCompleto["evento"][] | null;
  palestrantes: MaterialCompleto["palestrantes"] | null;
};

function normalizarLinha(l: LinhaMaterial): MaterialCompleto {
  const evento = Array.isArray(l.evento) ? l.evento[0] : l.evento;
  return {
    ...l,
    evento: evento ?? { id: l.evento_id, nome: "?", slug: "", data_evento: null, local: null },
    palestrantes: (l.palestrantes ?? []).sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

export async function listarEventosComContagem(): Promise<EventoComContagem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eventos_com_contagem")
    .select("*")
    .order("data_evento", { ascending: false, nullsFirst: false })
    .order("nome");
  if (error) throw error;
  return (data ?? []) as EventoComContagem[];
}

export async function listarEventos(): Promise<Evento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .order("data_evento", { ascending: false, nullsFirst: false })
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Evento[];
}

export async function buscarEventoPorSlug(slug: string): Promise<Evento | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("eventos").select("*").eq("slug", slug).maybeSingle();
  return (data as Evento | null) ?? null;
}

export async function listarPalestrantes(): Promise<Palestrante[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("palestrantes").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as Palestrante[];
}

export async function listarMateriaisDoEvento(eventoId: string): Promise<MaterialCompleto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais")
    .select(MATERIAL_SELECT)
    .eq("evento_id", eventoId)
    .order("tipo")
    .order("titulo");
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaMaterial[]).map(normalizarLinha);
}

export async function listarMateriaisDoPalestrante(palestranteId: string): Promise<MaterialCompleto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais_palestrantes")
    .select(`material:materiais(${MATERIAL_SELECT})`)
    .eq("palestrante_id", palestranteId);
  if (error) throw error;
  const linhas = (data ?? []) as unknown as { material: LinhaMaterial | LinhaMaterial[] | null }[];
  return linhas
    .flatMap((l) => (Array.isArray(l.material) ? l.material : l.material ? [l.material] : []))
    .map(normalizarLinha)
    .sort((a, b) => (b.evento.data_evento ?? "").localeCompare(a.evento.data_evento ?? ""));
}

export async function listarTodosMateriais(): Promise<MaterialCompleto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais")
    .select(MATERIAL_SELECT)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaMaterial[]).map(normalizarLinha);
}

export async function buscarMaterialPorId(id: string): Promise<MaterialCompleto | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("materiais").select(MATERIAL_SELECT).eq("id", id).maybeSingle();
  return data ? normalizarLinha(data as unknown as LinhaMaterial) : null;
}

export async function buscarMateriaisPorIds(ids: string[]): Promise<MaterialCompleto[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("materiais").select(MATERIAL_SELECT).in("id", ids);
  if (error) throw error;
  const porId = new Map(((data ?? []) as unknown as LinhaMaterial[]).map((l) => [l.id, normalizarLinha(l)]));
  return ids.map((id) => porId.get(id)).filter((m): m is MaterialCompleto => Boolean(m));
}

/**
 * Busca full-text + fuzzy no banco. É a ÚNICA fonte de dados da IA
 * e também alimenta a busca manual.
 */
export async function buscarMateriais(
  termo: string,
  filtros: { tipo?: TipoMaterial | null; ano?: number | null; limite?: number } = {},
): Promise<MaterialBusca[]> {
  const t = termo.trim();
  if (!t) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buscar_materiais", {
    termo: t,
    p_tipo: filtros.tipo ?? null,
    p_ano: filtros.ano ?? null,
    p_limite: filtros.limite ?? 40,
  });
  if (error) throw error;
  return (data ?? []) as MaterialBusca[];
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("usuarios").select("*").order("email");
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

export async function anosDisponiveis(): Promise<number[]> {
  const eventos = await listarEventos();
  const anos = new Set<number>();
  for (const e of eventos) if (e.data_evento) anos.add(Number(e.data_evento.slice(0, 4)));
  return [...anos].sort((a, b) => b - a);
}

export async function listarTags(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("materiais").select("tags");
  const tags = new Set<string>();
  for (const l of (data ?? []) as { tags: string[] }[]) for (const t of l.tags ?? []) tags.add(t);
  return [...tags].sort((a, b) => a.localeCompare(b));
}
