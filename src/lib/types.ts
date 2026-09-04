export const TIPOS_MATERIAL = ["slide", "gravacao", "pdf", "planilha", "link", "outro"] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

export const TIPO_LABEL: Record<TipoMaterial, string> = {
  slide: "Slides",
  gravacao: "Gravação",
  pdf: "PDF",
  planilha: "Planilha",
  link: "Link",
  outro: "Outro",
};

export type Papel = "admin" | "membro";

export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
}

export interface Evento {
  id: string;
  nome: string;
  slug: string;
  data_evento: string | null;
  local: string | null;
  descricao: string | null;
  criado_em: string;
}

export interface EventoComContagem extends Evento {
  total_materiais: number;
}

export interface Palestrante {
  id: string;
  nome: string;
  slug: string;
  apelidos: string[];
  criado_em: string;
}

export interface Material {
  id: string;
  evento_id: string;
  titulo: string;
  url: string;
  tipo: TipoMaterial;
  descricao: string | null;
  tags: string[];
  criado_por: string | null;
  criado_em: string;
}

/** Linha devolvida pela função SQL `buscar_materiais` e usada nos cards. */
export interface MaterialBusca {
  material_id: string;
  titulo: string;
  url: string;
  tipo: TipoMaterial;
  descricao: string | null;
  tags: string[];
  evento_id: string;
  evento_nome: string;
  evento_slug: string;
  data_evento: string | null;
  evento_local: string | null;
  palestrantes: string[];
  score: number;
}

/** Material com evento e palestrantes já resolvidos (listagens e página de evento). */
export interface MaterialCompleto extends Material {
  evento: Pick<Evento, "id" | "nome" | "slug" | "data_evento" | "local">;
  palestrantes: Pick<Palestrante, "id" | "nome" | "slug">[];
}
