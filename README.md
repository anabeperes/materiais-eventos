# Acervo de Eventos — Mentoria Fluxo

Site interno que centraliza os materiais dos eventos da mentoria (slides, gravações, PDFs, planilhas, links) e permite recuperá-los por conversa com uma IA, por texto ou por print. A IA **só busca no banco do próprio site** e devolve o link.

PRD completo em [`docs/PRD.md`](docs/PRD.md).

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Hospedagem | Vercel |
| Banco + Auth | Supabase (Postgres com full-text em português + `pg_trgm`, magic link com allowlist, RLS) |
| IA | Claude via SDK oficial `@anthropic-ai/sdk` (visão nativa para ler o print, tool calling) |
| UI | Tailwind v4 + componentes próprios, `lucide-react` |

## Como rodar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/migrations/0001_schema.sql` inteiro. Ele cria tabelas, índices, extensões (`pg_trgm`, `unaccent`), RLS, a função de busca `buscar_materiais` e o trigger que impede login de e-mails fora da allowlist.
3. Cadastre o primeiro admin (troque pelo seu e-mail):
   ```sql
   insert into public.usuarios (email, nome, papel) values ('voce@exemplo.com', 'Seu nome', 'admin');
   ```
   Se quiser dados de exemplo para testar, rode `supabase/seed.sql` (edite o e-mail antes).
4. Em **Authentication → Providers → Email**: deixe o provedor habilitado. Senha não é usada.
5. Em **Authentication → URL Configuration**: defina o *Site URL* (ex.: `https://seu-projeto.vercel.app`) e adicione em *Redirect URLs*:
   - `http://localhost:3000/auth/callback`
   - `https://seu-projeto.vercel.app/auth/callback`
6. (Recomendado) Em **Authentication → Email Templates → Magic Link**, troque o link do template para funcionar mesmo abrindo o e-mail em outro aparelho:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">Entrar no acervo</a>
   ```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | O que é |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave `anon` pública |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic. Só existe no servidor |
| `ANTHROPIC_MODEL` | Modelo do chat. Padrão `claude-sonnet-5`; `claude-haiku-4-5` para custo menor |
| `NEXT_PUBLIC_SITE_URL` | URL pública, usada no link mágico. Na Vercel pode ficar vazio |
| `CHAT_RATE_LIMIT_PER_HOUR` | Limite de mensagens de chat por usuário por hora (padrão 60) |

### 3. Local

```bash
pnpm install
pnpm dev
```

Abra http://localhost:3000, entre com o e-mail cadastrado e clique no link que chegar.

Checagens rápidas: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### 4. Vercel

Importe o repositório na Vercel, cole as mesmas variáveis de ambiente e faça o deploy. Não precisa de configuração extra. Depois, confira que a URL da Vercel está nas *Redirect URLs* do Supabase.

## Como a IA funciona

- O modelo recebe duas ferramentas: `buscar_materiais(termo, tipo?, ano?)`, que consulta a função SQL de mesmo nome (full-text em português + similaridade por trigrama, tolerante a acentos e erros de digitação), e `responder`, que entrega a frase final e os **IDs** dos materiais.
- **Validação anti-alucinação em código** (`src/lib/chat/run.ts`): só entram na resposta IDs que a busca devolveu naquele turno. Qualquer URL escrita na mensagem que não pertença a esses resultados é removida. Os cards são renderizados pelo front a partir dos dados do banco, nunca do texto do modelo.
- O print é enviado ao modelo e **não é armazenado**. No histórico da conversa entra só o termo que foi lido, e ele é mostrado na tela para a pessoa corrigir se a leitura errou.
- O endpoint (`/api/chat`) exige sessão válida, tem rate limit por usuário e faz streaming de status (`Lendo o print...`, `Buscando "..."`) antes da resposta.

## Estrutura

```
supabase/migrations/0001_schema.sql   schema, RLS, busca, allowlist
supabase/seed.sql                     dados de exemplo
src/proxy.ts                          renova sessão e bloqueia rotas sem login
src/lib/supabase/                     clientes (browser, server, proxy)
src/lib/auth.ts                       usuário atual, exigirUsuario / exigirAdmin
src/lib/data.ts                       consultas ao banco
src/lib/chat/                         prompt, ferramentas e loop do chat com validação
src/app/(auth)/login                  login por magic link (allowlist)
src/app/auth/callback                 troca o link por sessão
src/app/(app)/                        dashboard: chat, eventos, palestrantes, busca, admin
src/app/api/chat/route.ts             endpoint do chat (NDJSON streaming)
public/template-importacao.csv        template da importação em lote
```

## Permissões

| Papel | Pode |
|---|---|
| admin | Tudo: cadastrar, editar, excluir, importar CSV, gerenciar usuários, usar o chat |
| membro | Chat, navegar por eventos e palestrantes, busca manual |

A allowlist é a tabela `usuarios`. Quem não está lá (ou está com `ativo = false`) não recebe o link mágico, não consegue criar conta no Auth e, se já tinha sessão, é derrubado na próxima navegação.

## Importação em lote (CSV)

Admin → Importar CSV. Colunas: `evento_nome, data_evento, material_titulo, url, tipo, palestrante_nome, tags, descricao`. Vários palestrantes ou tags na mesma célula separados por `;`. Eventos e palestrantes que não existem são criados automaticamente, deduplicando por nome normalizado. A tela mostra um preview do que vai ser criado, vinculado ou ignorado por erro antes de confirmar.

## Decisões de implementação (vs. PRD)

- **Next.js 16** em vez de 15: é a versão atual do `create-next-app`; a arquitetura é a mesma (App Router, Server Actions, `proxy.ts` no lugar de `middleware.ts`).
- **SDK oficial da Anthropic** em vez do Vercel AI SDK: o loop de tool calling é curto e o controle direto facilita a validação de IDs/URLs. Streaming é feito como NDJSON de eventos.
- **Rate limit em memória**: por instância. Suficiente para uso interno; se precisar de limite exato entre instâncias, troque por Upstash/Vercel KV.

## Estado das fases do PRD

- Fase 1 (fundação): feita.
- Fase 2 (CRUD, página de evento, importação CSV com preview, busca manual): feita.
- Fase 3 (chat com tool calling, validação anti-alucinação, cards): feita.
- Fase 4 (print por anexo e Ctrl+V, termo lido, filtros na sidebar, responsivo): feita na base. Ajuste fino da busca e do visual depende de uso real.

Próximos passos práticos: rodar a migration no Supabase, cadastrar o time em `usuarios`, fazer a carga inicial pelo CSV e afinar o limiar de similaridade (`score >= 0.35` em `buscar_materiais`) com dados reais.
