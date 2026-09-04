-- Dados de exemplo para desenvolvimento. NÃO rode em produção sem revisar.
-- Troque os e-mails abaixo pelos do time.

insert into public.usuarios (email, nome, papel) values
  ('contas@vtsd.com.br', 'Ana Bê', 'admin')
on conflict (email) do nothing;

insert into public.eventos (nome, slug, data_evento, local, descricao) values
  ('Imersão SP 2026', 'imersao-sp-2026', '2026-03-14', 'São Paulo', 'Imersão presencial de dois dias.'),
  ('Encontro Fluxo #14', 'encontro-fluxo-14', '2026-05-20', 'Online', null),
  ('Workshop de Oferta', 'workshop-de-oferta', '2026-07-12', 'Online', 'Workshop sobre construção de oferta.'),
  ('Live Copy Set/26', 'live-copy-set-26', '2026-09-02', 'Online', null)
on conflict (slug) do nothing;

insert into public.palestrantes (nome, slug, apelidos) values
  ('Felipe', 'felipe', array['Fê', 'Felipe VTSD']),
  ('Ana Bê', 'ana-be', array['Ana', 'Anabê'])
on conflict (slug) do nothing;

with ev as (select id, slug from public.eventos),
     adm as (select id from public.usuarios where papel = 'admin' limit 1)
insert into public.materiais (evento_id, titulo, url, tipo, tags, criado_por)
select ev.id, x.titulo, x.url, x.tipo, x.tags, adm.id
from (values
  ('workshop-de-oferta', 'Slides da apresentação', 'https://docs.google.com/presentation/d/exemplo-oferta', 'slide', array['oferta']),
  ('workshop-de-oferta', 'Gravação completa', 'https://youtube.com/watch?v=exemplo-oferta', 'gravacao', array['oferta']),
  ('imersao-sp-2026', 'Slides — dia 1', 'https://docs.google.com/presentation/d/exemplo-imersao-1', 'slide', array['imersão']),
  ('imersao-sp-2026', 'Gravação — dia 1', 'https://youtube.com/watch?v=exemplo-imersao-1', 'gravacao', array['imersão']),
  ('encontro-fluxo-14', 'Gravação do encontro', 'https://youtube.com/watch?v=exemplo-encontro-14', 'gravacao', array['encontro']),
  ('live-copy-set-26', 'Planilha de headlines', 'https://docs.google.com/spreadsheets/d/exemplo-copy', 'planilha', array['copy'])
) as x(evento_slug, titulo, url, tipo, tags)
join ev on ev.slug = x.evento_slug
cross join adm
on conflict do nothing;

insert into public.materiais_palestrantes (material_id, palestrante_id)
select m.id, p.id
from public.materiais m
cross join public.palestrantes p
where p.slug = 'felipe'
on conflict do nothing;
