"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_MATERIAL, type Evento, type Palestrante, type TipoMaterial } from "@/lib/types";
import { normalizarNome, slugify } from "@/lib/utils";

export interface EstadoForm {
  erro?: string;
  ok?: boolean;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function separarLista(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function slugUnico(tabela: "eventos" | "palestrantes", base: string): Promise<string> {
  const supabase = await createClient();
  const raiz = slugify(base);
  let slug = raiz;
  for (let i = 2; i < 100; i++) {
    const { data } = await supabase.from(tabela).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${raiz}-${i}`;
  }
  return `${raiz}-${Date.now()}`;
}

/** Acha um evento pelo nome normalizado ou cria. */
async function obterOuCriarEvento(nome: string, dataEvento: string | null): Promise<Evento> {
  const supabase = await createClient();
  const alvo = normalizarNome(nome);
  const { data: todos } = await supabase.from("eventos").select("*");
  const existente = (todos as Evento[] | null)?.find((e) => normalizarNome(e.nome) === alvo);
  if (existente) return existente;

  const { data, error } = await supabase
    .from("eventos")
    .insert({ nome: nome.trim(), slug: await slugUnico("eventos", nome), data_evento: dataEvento })
    .select("*")
    .single();
  if (error) throw error;
  return data as Evento;
}

/** Acha palestrante pelo nome ou apelido normalizado, ou cria. */
async function obterOuCriarPalestrante(nome: string): Promise<Palestrante> {
  const supabase = await createClient();
  const alvo = normalizarNome(nome);
  const { data: todos } = await supabase.from("palestrantes").select("*");
  const existente = (todos as Palestrante[] | null)?.find(
    (p) => normalizarNome(p.nome) === alvo || p.apelidos.some((a) => normalizarNome(a) === alvo),
  );
  if (existente) return existente;

  const { data, error } = await supabase
    .from("palestrantes")
    .insert({ nome: nome.trim(), slug: await slugUnico("palestrantes", nome) })
    .select("*")
    .single();
  if (error) throw error;
  return data as Palestrante;
}

async function vincularPalestrantes(materialId: string, palestranteIds: string[]) {
  const supabase = await createClient();
  await supabase.from("materiais_palestrantes").delete().eq("material_id", materialId);
  if (palestranteIds.length) {
    const { error } = await supabase
      .from("materiais_palestrantes")
      .insert(palestranteIds.map((palestrante_id) => ({ material_id: materialId, palestrante_id })));
    if (error) throw error;
  }
}

function revalidarTudo() {
  revalidatePath("/", "layout");
}

// -----------------------------------------------------------------------------
// Material
// -----------------------------------------------------------------------------

const materialSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título."),
  url: z.string().trim().url("Informe uma URL válida (com https://)."),
  tipo: z.enum(TIPOS_MATERIAL),
  descricao: z.string().trim().optional(),
  evento_id: z.string().optional(),
  evento_novo_nome: z.string().trim().optional(),
  evento_novo_data: z.string().trim().optional(),
});

async function resolverEventoDoForm(fd: FormData): Promise<{ eventoId?: string; erro?: string }> {
  const eventoId = String(fd.get("evento_id") ?? "");
  const novoNome = String(fd.get("evento_novo_nome") ?? "").trim();
  if (eventoId && eventoId !== "__novo__") return { eventoId };
  if (!novoNome) return { erro: "Escolha um evento ou informe o nome de um novo." };
  const data = String(fd.get("evento_novo_data") ?? "").trim() || null;
  const evento = await obterOuCriarEvento(novoNome, data);
  return { eventoId: evento.id };
}

async function resolverPalestrantesDoForm(fd: FormData): Promise<string[]> {
  const ids = fd.getAll("palestrante_ids").map(String).filter(Boolean);
  const novos = separarLista(fd.get("palestrantes_novos"));
  for (const nome of novos) ids.push((await obterOuCriarPalestrante(nome)).id);
  return [...new Set(ids)];
}

export async function criarMaterial(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const usuario = await exigirAdmin();
  const parsed = materialSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  try {
    const { eventoId, erro } = await resolverEventoDoForm(fd);
    if (erro || !eventoId) return { erro };
    const palestrantes = await resolverPalestrantesDoForm(fd);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("materiais")
      .insert({
        evento_id: eventoId,
        titulo: parsed.data.titulo,
        url: parsed.data.url,
        tipo: parsed.data.tipo,
        descricao: parsed.data.descricao || null,
        tags: separarLista(fd.get("tags")).map((t) => t.toLowerCase()),
        criado_por: usuario.id,
      })
      .select("id, evento:eventos(slug)")
      .single();
    if (error) throw error;
    await vincularPalestrantes(data.id, palestrantes);
    revalidarTudo();
    const ev = Array.isArray(data.evento) ? data.evento[0] : data.evento;
    redirect(`/eventos/${(ev as { slug: string } | null)?.slug ?? ""}`);
  } catch (e) {
    if (isRedirect(e)) throw e;
    console.error(e);
    return { erro: "Não foi possível salvar. Verifique os dados e tente de novo." };
  }
}

export async function atualizarMaterial(id: string, _prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const parsed = materialSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  try {
    const { eventoId, erro } = await resolverEventoDoForm(fd);
    if (erro || !eventoId) return { erro };
    const palestrantes = await resolverPalestrantesDoForm(fd);

    const supabase = await createClient();
    const { error } = await supabase
      .from("materiais")
      .update({
        evento_id: eventoId,
        titulo: parsed.data.titulo,
        url: parsed.data.url,
        tipo: parsed.data.tipo,
        descricao: parsed.data.descricao || null,
        tags: separarLista(fd.get("tags")).map((t) => t.toLowerCase()),
      })
      .eq("id", id);
    if (error) throw error;
    await vincularPalestrantes(id, palestrantes);
    revalidarTudo();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar. Verifique os dados e tente de novo." };
  }
}

export async function excluirMaterial(id: string): Promise<void> {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("materiais").delete().eq("id", id);
  if (error) throw error;
  revalidarTudo();
  redirect("/admin");
}

export async function excluirEvento(id: string): Promise<void> {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) throw error;
  revalidarTudo();
  redirect("/admin");
}

// -----------------------------------------------------------------------------
// Importação CSV
// -----------------------------------------------------------------------------

export interface LinhaCsv {
  evento_nome: string;
  data_evento: string;
  material_titulo: string;
  url: string;
  tipo: string;
  palestrante_nome: string;
  tags: string;
  descricao: string;
}

export interface LinhaPreview {
  linha: number;
  dados: LinhaCsv;
  status: "criar" | "vincular" | "erro";
  detalhes: string[];
  erro?: string;
}

const linhaSchema = z.object({
  evento_nome: z.string().trim().min(1, "evento_nome vazio"),
  data_evento: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{2}\/\d{2}\/\d{4}$/.test(v), "data_evento deve ser AAAA-MM-DD ou DD/MM/AAAA"),
  material_titulo: z.string().trim().min(1, "material_titulo vazio"),
  url: z.string().trim().url("url inválida"),
  tipo: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? "link" : v))
    .refine((v): v is TipoMaterial => (TIPOS_MATERIAL as readonly string[]).includes(v), `tipo deve ser um de: ${TIPOS_MATERIAL.join(", ")}`),
  palestrante_nome: z.string().trim(),
  tags: z.string().trim(),
  descricao: z.string().trim(),
});

function normalizarData(v: string): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return v;
}

export async function previewImportacao(linhas: LinhaCsv[]): Promise<LinhaPreview[]> {
  await exigirAdmin();
  const supabase = await createClient();
  const [{ data: eventos }, { data: palestrantes }, { data: materiais }] = await Promise.all([
    supabase.from("eventos").select("id, nome"),
    supabase.from("palestrantes").select("id, nome, apelidos"),
    supabase.from("materiais").select("url"),
  ]);
  const eventosNorm = new Set((eventos ?? []).map((e) => normalizarNome(e.nome)));
  const palNorm = new Set(
    (palestrantes ?? []).flatMap((p) => [normalizarNome(p.nome), ...(p.apelidos as string[]).map(normalizarNome)]),
  );
  const urlsExistentes = new Set((materiais ?? []).map((m) => m.url));
  const eventosNovosNoArquivo = new Set<string>();
  const palNovosNoArquivo = new Set<string>();

  return linhas.map((dados, i) => {
    const parsed = linhaSchema.safeParse(dados);
    if (!parsed.success) {
      return { linha: i + 2, dados, status: "erro", detalhes: [], erro: parsed.error.issues.map((x) => x.message).join("; ") };
    }
    const d = parsed.data;
    const detalhes: string[] = [];
    const evNorm = normalizarNome(d.evento_nome);
    let status: LinhaPreview["status"] = "vincular";
    if (!eventosNorm.has(evNorm) && !eventosNovosNoArquivo.has(evNorm)) {
      detalhes.push(`Cria o evento "${d.evento_nome}"`);
      eventosNovosNoArquivo.add(evNorm);
      status = "criar";
    } else if (eventosNorm.has(evNorm)) {
      detalhes.push("Vincula a evento existente");
    } else {
      detalhes.push("Vincula ao evento criado acima");
    }
    for (const nome of separarLista(d.palestrante_nome)) {
      const n = normalizarNome(nome);
      if (!palNorm.has(n) && !palNovosNoArquivo.has(n)) {
        detalhes.push(`Cria o palestrante "${nome}"`);
        palNovosNoArquivo.add(n);
      }
    }
    if (urlsExistentes.has(d.url)) detalhes.push("Atenção: já existe um material com esta URL");
    return { linha: i + 2, dados, status, detalhes };
  });
}

export async function confirmarImportacao(linhas: LinhaCsv[]): Promise<{ importados: number; erros: string[] }> {
  const usuario = await exigirAdmin();
  const supabase = await createClient();
  let importados = 0;
  const erros: string[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const parsed = linhaSchema.safeParse(linhas[i]);
    if (!parsed.success) {
      erros.push(`Linha ${i + 2}: ${parsed.error.issues.map((x) => x.message).join("; ")}`);
      continue;
    }
    const d = parsed.data;
    try {
      const evento = await obterOuCriarEvento(d.evento_nome, normalizarData(d.data_evento));
      const palestranteIds: string[] = [];
      for (const nome of separarLista(d.palestrante_nome)) palestranteIds.push((await obterOuCriarPalestrante(nome)).id);

      const { data, error } = await supabase
        .from("materiais")
        .insert({
          evento_id: evento.id,
          titulo: d.material_titulo,
          url: d.url,
          tipo: d.tipo,
          descricao: d.descricao || null,
          tags: separarLista(d.tags).map((t) => t.toLowerCase()),
          criado_por: usuario.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await vincularPalestrantes(data.id, [...new Set(palestranteIds)]);
      importados++;
    } catch (e) {
      console.error(e);
      erros.push(`Linha ${i + 2}: falha ao salvar`);
    }
  }

  revalidarTudo();
  return { importados, erros };
}

// -----------------------------------------------------------------------------
// Usuários (allowlist)
// -----------------------------------------------------------------------------

const usuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  nome: z.string().trim().optional(),
  papel: z.enum(["admin", "membro"]),
});

export async function adicionarUsuario(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const parsed = usuarioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .upsert({ email: parsed.data.email, nome: parsed.data.nome || null, papel: parsed.data.papel, ativo: true }, { onConflict: "email" });
  if (error) return { erro: "Não foi possível salvar o usuário." };
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function alternarUsuarioAtivo(id: string, ativo: boolean): Promise<void> {
  const atual = await exigirAdmin();
  if (atual.id === id && !ativo) return; // não se desativa
  const supabase = await createClient();
  await supabase.from("usuarios").update({ ativo }).eq("id", id);
  revalidatePath("/admin/usuarios");
}

export async function alterarPapel(id: string, papel: "admin" | "membro"): Promise<void> {
  const atual = await exigirAdmin();
  if (atual.id === id && papel !== "admin") return; // não se rebaixa
  const supabase = await createClient();
  await supabase.from("usuarios").update({ papel }).eq("id", id);
  revalidatePath("/admin/usuarios");
}

function isRedirect(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
