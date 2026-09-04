-- =============================================================================
-- Acervo de Materiais dos Eventos (Mentoria Fluxo) — schema inicial
-- Rode no SQL Editor do Supabase ou via `supabase db push`.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

-- As extensões podem estar em `public` ou `extensions` dependendo de como foram habilitadas.
set search_path = public, extensions;
grant usage on schema extensions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

create table if not exists public.usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  nome        text,
  papel       text not null default 'membro' check (papel in ('admin', 'membro')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists public.eventos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  slug         text not null unique,
  data_evento  date,
  local        text,
  descricao    text,
  criado_em    timestamptz not null default now()
);

create table if not exists public.palestrantes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  slug       text not null unique,
  apelidos   text[] not null default '{}',
  criado_em  timestamptz not null default now()
);

create table if not exists public.materiais (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  titulo      text not null,
  url         text not null,
  tipo        text not null default 'link'
              check (tipo in ('slide', 'gravacao', 'pdf', 'planilha', 'link', 'outro')),
  descricao   text,
  tags        text[] not null default '{}',
  criado_por  uuid references public.usuarios(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create table if not exists public.materiais_palestrantes (
  material_id     uuid not null references public.materiais(id) on delete cascade,
  palestrante_id  uuid not null references public.palestrantes(id) on delete cascade,
  primary key (material_id, palestrante_id)
);

-- -----------------------------------------------------------------------------
-- Normalização e índices de busca
-- -----------------------------------------------------------------------------

-- Texto normalizado para busca: minúsculo e sem acento. IMMUTABLE para poder indexar.
create or replace function public.normalizar(t text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(unaccent('unaccent', coalesce(t, '')));
$$;

create index if not exists eventos_nome_trgm_idx
  on public.eventos using gin (public.normalizar(nome) gin_trgm_ops);
create index if not exists eventos_data_idx
  on public.eventos (data_evento desc);

create index if not exists palestrantes_nome_trgm_idx
  on public.palestrantes using gin (public.normalizar(nome) gin_trgm_ops);

create index if not exists materiais_titulo_trgm_idx
  on public.materiais using gin (public.normalizar(titulo) gin_trgm_ops);
create index if not exists materiais_evento_idx
  on public.materiais (evento_id);
create index if not exists materiais_tags_idx
  on public.materiais using gin (tags);

create index if not exists eventos_fts_idx
  on public.eventos using gin (to_tsvector('portuguese', coalesce(nome, '') || ' ' || coalesce(descricao, '')));
-- array_to_string é STABLE, então o índice precisa de um wrapper IMMUTABLE (seguro para text[]).
create or replace function public.tags_texto(t text[])
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(array_to_string(t, ' '), '');
$$;

create index if not exists materiais_fts_idx
  on public.materiais using gin (to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(descricao, '') || ' ' || public.tags_texto(tags)));

-- -----------------------------------------------------------------------------
-- Usuário atual (pelo e-mail do JWT) e allowlist
-- -----------------------------------------------------------------------------

create or replace function public.usuario_atual()
returns public.usuarios
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.*
  from public.usuarios u
  where u.ativo
    and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce((select papel = 'admin' from public.usuario_atual()), false);
$$;

create or replace function public.eh_membro()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select (select id from public.usuario_atual()) is not null;
$$;

-- Usada pela tela de login ANTES de mandar o link mágico. Pode ser chamada anônima.
create or replace function public.email_permitido(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.usuarios u
    where u.ativo and lower(u.email) = lower(trim(p_email))
  );
$$;

grant execute on function public.email_permitido(text) to anon, authenticated;
grant execute on function public.usuario_atual() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_membro() to authenticated;

-- Rede de segurança: bloqueia a criação de usuário no Auth se o e-mail não está na allowlist.
create or replace function public.bloquear_email_fora_da_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.email_permitido(new.email) then
    raise exception 'E-mail não autorizado a acessar o acervo: %', new.email
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_allowlist on auth.users;
create trigger usuarios_allowlist
  before insert on auth.users
  for each row execute function public.bloquear_email_fora_da_allowlist();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.usuarios enable row level security;
alter table public.eventos enable row level security;
alter table public.palestrantes enable row level security;
alter table public.materiais enable row level security;
alter table public.materiais_palestrantes enable row level security;

-- usuarios: membro vê a lista (para saber quem tem acesso); admin gerencia.
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated using (public.eh_membro());
drop policy if exists usuarios_admin_write on public.usuarios;
create policy usuarios_admin_write on public.usuarios
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- eventos / palestrantes / materiais / vínculo: membro lê, admin escreve.
drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos
  for select to authenticated using (public.eh_membro());
drop policy if exists eventos_admin_write on public.eventos;
create policy eventos_admin_write on public.eventos
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists palestrantes_select on public.palestrantes;
create policy palestrantes_select on public.palestrantes
  for select to authenticated using (public.eh_membro());
drop policy if exists palestrantes_admin_write on public.palestrantes;
create policy palestrantes_admin_write on public.palestrantes
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists materiais_select on public.materiais;
create policy materiais_select on public.materiais
  for select to authenticated using (public.eh_membro());
drop policy if exists materiais_admin_write on public.materiais;
create policy materiais_admin_write on public.materiais
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists mp_select on public.materiais_palestrantes;
create policy mp_select on public.materiais_palestrantes
  for select to authenticated using (public.eh_membro());
drop policy if exists mp_admin_write on public.materiais_palestrantes;
create policy mp_admin_write on public.materiais_palestrantes
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- -----------------------------------------------------------------------------
-- Busca: full-text (português) + trigrama (fuzzy). É a única fonte da IA.
-- -----------------------------------------------------------------------------

create or replace function public.buscar_materiais(
  termo     text,
  p_tipo    text default null,
  p_ano     int  default null,
  p_limite  int  default 40
)
returns table (
  material_id    uuid,
  titulo         text,
  url            text,
  tipo           text,
  descricao      text,
  tags           text[],
  evento_id      uuid,
  evento_nome    text,
  evento_slug    text,
  data_evento    date,
  evento_local   text,
  palestrantes   text[],
  score          real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select public.normalizar(termo) as t,
           websearch_to_tsquery('portuguese', coalesce(termo, '')) as tsq
  ),
  base as (
    select
      m.id            as material_id,
      m.titulo,
      m.url,
      m.tipo,
      m.descricao,
      m.tags,
      e.id            as evento_id,
      e.nome          as evento_nome,
      e.slug          as evento_slug,
      e.data_evento,
      e.local         as evento_local,
      coalesce(array_agg(distinct p.nome) filter (where p.nome is not null), '{}'::text[]) as palestrantes,
      public.normalizar(e.nome)                       as n_evento,
      public.normalizar(m.titulo)                     as n_titulo,
      public.normalizar(array_to_string(m.tags, ' ')) as n_tags,
      public.normalizar(
        coalesce(string_agg(p.nome || ' ' || array_to_string(p.apelidos, ' '), ' '), '')
      )                                               as n_palestrantes,
      (to_tsvector('portuguese', coalesce(e.nome, '') || ' ' || coalesce(e.descricao, ''))
        || to_tsvector('portuguese', coalesce(m.titulo, '') || ' ' || coalesce(m.descricao, '') || ' ' || array_to_string(m.tags, ' '))
        || to_tsvector('portuguese', coalesce(string_agg(p.nome || ' ' || array_to_string(p.apelidos, ' '), ' '), ''))
      )                                               as fts
    from public.materiais m
    join public.eventos e on e.id = m.evento_id
    left join public.materiais_palestrantes mp on mp.material_id = m.id
    left join public.palestrantes p on p.id = mp.palestrante_id
    where (p_tipo is null or m.tipo = p_tipo)
      and (p_ano is null or extract(year from e.data_evento)::int = p_ano)
    group by m.id, e.id
  ),
  pontuado as (
    select
      b.*,
      greatest(
        word_similarity(q.t, b.n_evento),
        similarity(q.t, b.n_evento),
        word_similarity(q.t, b.n_titulo) * 0.9,
        word_similarity(q.t, b.n_palestrantes),
        similarity(q.t, b.n_palestrantes),
        word_similarity(q.t, b.n_tags) * 0.8,
        case when q.tsq::text <> '' and b.fts @@ q.tsq then 0.75 else 0 end
      )::real as score
    from base b, q
  )
  select
    material_id, titulo, url, tipo, descricao, tags,
    evento_id, evento_nome, evento_slug, data_evento, evento_local,
    palestrantes, score
  from pontuado
  where score >= 0.35
  order by score desc, data_evento desc nulls last, titulo
  limit p_limite;
$$;

grant execute on function public.buscar_materiais(text, text, int, int) to authenticated;

-- Contagem de materiais por evento (sidebar)
create or replace view public.eventos_com_contagem
with (security_invoker = true) as
  select e.*, count(m.id)::int as total_materiais
  from public.eventos e
  left join public.materiais m on m.evento_id = e.id
  group by e.id;
