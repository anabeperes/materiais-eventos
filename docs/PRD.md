# PRD — Acervo de Materiais dos Eventos (Mentoria Fluxo)

**Versão:** 1.0
**Data:** 04/09/2026
**Responsável:** Ana Bê
**Status:** Draft para aprovação

---

## 1. Problema

Hoje os materiais dos eventos da mentoria (slides, gravações, PDFs, planilhas, links de apresentação) ficam espalhados: WhatsApp, Drive, e-mail, mensagens soltas. Não existe um lugar único onde alguém do time consiga responder "cadê o material do evento X?" ou "o que o palestrante Y apresentou?" sem caçar em três lugares diferentes.

O custo disso é tempo do time e material que simplesmente some — evento aconteceu, o link existiu, mas ninguém acha mais.

## 2. Objetivo

Um site interno, hospedado na Vercel, que centraliza os materiais dos eventos e permite recuperá-los por **conversa com uma IA**, mandando o nome do evento ou do palestrante **por texto ou por print**.

A IA não é um assistente genérico. Ela é um localizador: busca **exclusivamente** no banco de materiais do próprio site e devolve o link.

## 3. Métricas de sucesso

| Métrica | Meta |
|---|---|
| Tempo pra achar um material | Menos de 30 segundos |
| Materiais de eventos passados cadastrados | 100% dos eventos dos últimos 12 meses na carga inicial |
| Taxa de acerto da IA (material certo na 1ª resposta) | ≥ 90% quando o material existe no banco |
| Falso positivo (IA inventa material que não existe) | 0% — requisito duro, ver seção 8 |

## 4. Usuários e permissões

Escopo fechado: **só Felipe e o time interno**. Não há acesso de mentorado nesta versão.

| Papel | Pode |
|---|---|
| **Admin** | Tudo: cadastrar, editar, excluir material e evento, importar CSV, usar o chat |
| **Membro** | Usar o chat, navegar por eventos, ver links. Não edita nem exclui |

**Autenticação:** login por e-mail com link mágico (magic link), restrito a uma allowlist de e-mails cadastrada no banco. Sem senha, sem cadastro aberto. Quem não está na lista não entra, mesmo com o link do site.

## 5. Escopo da V1

### Dentro do escopo

- Cadastro de eventos, palestrantes e materiais
- Material = **link externo** (Drive, YouTube, Notion, Canva, o que for). O site guarda a URL e os metadados, não o arquivo
- Cadastro por formulário no site **e** importação em lote via CSV (pra carga inicial)
- Dashboard com sidebar de eventos à esquerda e chat de IA no centro
- Chat aceita **texto** e **imagem colada/anexada** (print do nome do evento ou do palestrante)
- IA busca só no banco do site e devolve o link direto
- Busca manual por texto (fallback sem IA)

### Fora do escopo da V1

- Upload de arquivos para dentro do site (fica pra V2)
- Acesso de mentorados
- Transcrição de vídeos / busca dentro do conteúdo dos materiais
- App mobile nativo (o site é responsivo, isso basta)
- Comentários, favoritos, notificações
- Analytics de uso

## 6. Layout

Referência visual: o print do "Acervo do Fluxo" — mesma estrutura de header, sidebar e área central, mas **o centro é o chat, não o grid de pastas**.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [logo] Acervo de Eventos   Eventos  Palestrantes  Admin      + Novo   sair│
├──────────────────┬─────────────────────────────────────────────────────────┤
│ EVENTOS          │                                                          │
│                  │   ┌───────────────────────────────────────────────────┐  │
│ ▸ Imersão SP     │   │  Pergunte pelo material                           │  │
│   2026      12   │   │  Digite o nome do evento ou do palestrante,       │  │
│ ▸ Encontro Fluxo │   │  ou cole um print.                                 │  │
│   #14        8   │   └───────────────────────────────────────────────────┘  │
│ ▸ Workshop de    │                                                          │
│   Oferta     5   │   [ histórico da conversa ]                              │
│ ▸ Live Copy      │                                                          │
│   Set/26     3   │   > material do workshop de oferta                       │
│                  │                                                          │
│ ─────────────    │   ┌─ Workshop de Oferta — 12/07/2026 ────────────────┐   │
│ REFINAR          │   │  Palestrante: Felipe                              │   │
│ ▸ Palestrante    │   │  Slides da apresentação          [Abrir →]        │   │
│ ▸ Ano            │   │  Gravação completa               [Abrir →]        │   │
│ ▸ Tipo           │   └───────────────────────────────────────────────────┘   │
│ ▸ Tag            │                                                          │
│                  │   ┌──────────────────────────────────────┐ [📎] [enviar]│
│                  │   │ Pergunte ou cole um print...          │              │
└──────────────────┴───┴──────────────────────────────────────┴──────────────┘
```

### Componentes

**Header**
Logo + navegação (Eventos, Palestrantes, Admin) + botão "Novo material" + usuário/sair.

**Sidebar esquerda**
- Lista de eventos com contagem de materiais, ordenada por data (mais recente primeiro)
- Bloco "Refinar" com filtros: palestrante, ano, tipo de material, tag
- Clicar num evento **não sai do chat** — injeta a pergunta "materiais do evento X" no chat e a resposta aparece no centro. A conversa continua sendo o eixo da tela

**Centro — chat**
- Estado vazio: título curto + 3 a 4 sugestões clicáveis ("materiais da Imersão SP", "o que o Felipe apresentou em julho")
- Mensagem do usuário: texto e/ou miniatura da imagem anexada
- Resposta da IA: frase curta + **cards de material** (nome do evento, data, palestrante, tipo, botão "Abrir →" que abre a URL em nova aba)
- Campo de input fixo no rodapé, com botão de anexo e suporte a **colar imagem direto com Ctrl+V**

**Página de evento** (rota secundária, acessível pelo card)
Lista completa dos materiais daquele evento, sem IA. Serve pra quando a pessoa quer só navegar.

**Admin**
Formulário de novo material, lista editável, importação de CSV.

## 7. Modelo de dados

```
eventos
  id                uuid pk
  nome              text        -- "Imersão SP 2026"
  slug              text unique
  data_evento       date
  local             text        -- opcional: "São Paulo", "Online"
  descricao         text        -- opcional
  criado_em         timestamptz

palestrantes
  id                uuid pk
  nome              text
  slug              text unique
  apelidos          text[]      -- variações de nome pra busca: ["Felipe", "Fê", "Felipe VTSD"]
  criado_em         timestamptz

materiais
  id                uuid pk
  evento_id         uuid fk -> eventos
  titulo            text        -- "Slides da apresentação"
  url               text        -- o link. É isso que o usuário quer
  tipo              text        -- enum: slide | gravacao | pdf | planilha | link | outro
  descricao         text        -- opcional
  tags              text[]
  criado_por        uuid fk -> usuarios
  criado_em         timestamptz

materiais_palestrantes           -- N:N, um material pode ter mais de um palestrante
  material_id       uuid fk
  palestrante_id    uuid fk

usuarios
  id                uuid pk
  email             text unique
  nome              text
  papel             text        -- admin | membro
  ativo             boolean
```

### Índices de busca

Índice de texto full-text (português) sobre `eventos.nome`, `palestrantes.nome`, `palestrantes.apelidos`, `materiais.titulo`, `materiais.tags`. Isso já resolve a maioria das buscas por nome.

**Fuzzy matching:** habilitar `pg_trgm` e usar similaridade por trigrama. É o que salva quando o print vem com o nome levemente errado ou a pessoa digita "imersao sp" sem acento.

## 8. Como a IA funciona (a parte crítica)

**Princípio:** a IA nunca responde de memória e nunca busca na internet. Ela só sabe o que a função de busca devolve.

### Arquitetura: tool calling, não RAG livre

O modelo recebe **uma única ferramenta**:

```
buscar_materiais(
  termo: string,           -- nome do evento, palestrante, ou tema
  tipo?: string,           -- filtro opcional
  ano?: number             -- filtro opcional
) -> lista de materiais com evento, palestrante, tipo e url
```

Fluxo:

1. Usuário manda texto e/ou imagem
2. Se tem imagem: o modelo lê o print com visão nativa e extrai o nome que aparece ali (**não precisa de OCR separado** — o modelo já enxerga a imagem)
3. O modelo chama `buscar_materiais` com o termo extraído
4. A função consulta o Postgres (full-text + trigrama) e devolve **só o que existe no banco**
5. O modelo formata a resposta a partir dos resultados

### Regras duras no system prompt

- Responder **apenas** com materiais retornados pela ferramenta
- **Nunca** inventar título, evento, palestrante ou URL
- Se a busca voltar vazia: dizer que não achou e sugerir outro termo. Nunca improvisar
- Se voltar mais de um evento plausível: listar os candidatos e perguntar qual
- Não responder pergunta que não seja sobre localizar material do acervo

### Validação anti-alucinação (camada de código, não de prompt)

Depois que o modelo responde, o backend valida: **toda URL na resposta tem que existir na lista retornada pela ferramenta naquele turno**. URL que não bate é removida antes de renderizar. Prompt sozinho não é garantia — essa checagem é o que faz a meta de 0% falso positivo ser real.

### Renderização

O modelo não escreve os cards em HTML. Ele devolve os IDs dos materiais; o frontend renderiza os cards a partir do banco. Isso mata a possibilidade de link inventado chegar na tela.

## 9. Fluxos principais

### Fluxo 1 — Pedir material por texto

1. Usuário digita "material do workshop de oferta"
2. IA chama `buscar_materiais("workshop de oferta")`
3. Volta 1 evento com 2 materiais
4. Resposta: frase curta + 2 cards com botão "Abrir →"

### Fluxo 2 — Pedir material por print

1. Usuário cola print (Ctrl+V) de uma mensagem de WhatsApp onde aparece "Encontro Fluxo #14"
2. Modelo lê a imagem, extrai "Encontro Fluxo #14"
3. Mesma busca do fluxo 1
4. Resposta mostra o termo que foi lido do print — **importante**, pra pessoa saber o que a IA entendeu e corrigir se leu errado

### Fluxo 3 — Nome ambíguo

1. "material do Felipe"
2. Busca retorna 9 materiais de 4 eventos
3. Resposta: "Achei materiais do Felipe em 4 eventos. Qual deles?" + lista de eventos clicáveis
4. Usuário clica, chat responde com os materiais daquele evento

### Fluxo 4 — Não achou

1. "material do evento de dezembro"
2. Busca vazia
3. Resposta: "Não achei nada com 'evento de dezembro' no acervo. Tenta o nome do evento ou do palestrante." **Sem sugerir material que não existe.**

### Fluxo 5 — Cadastrar material

1. Admin clica "Novo material"
2. Preenche: evento (select com busca, ou criar novo na hora), título, URL, tipo, palestrante(s), tags
3. Salva. Aparece na sidebar e passa a ser buscável imediatamente

### Fluxo 6 — Importação em lote

1. Admin acessa Admin → Importar
2. Baixa o template CSV
3. Sobe o CSV preenchido
4. Tela de preview mostra o que vai ser criado, o que vai ser vinculado a evento existente e o que está com erro
5. Confirma. Importa

**Colunas do CSV:** `evento_nome, data_evento, material_titulo, url, tipo, palestrante_nome, tags, descricao`
Eventos e palestrantes são criados automaticamente se não existirem (deduplicando por nome normalizado).

## 10. Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Padrão da Vercel, deploy sem configuração, Server Actions resolvem o CRUD sem API separada |
| Hospedagem | **Vercel** | Requisito |
| Banco + Auth | **Supabase** | Postgres gerenciado com full-text em português, `pg_trgm` pronto, Auth com magic link e allowlist, e Storage já incluso pra quando a V2 precisar de upload |
| IA | **Claude (Anthropic API)** | Visão nativa lê o print sem OCR separado, e tool calling é confiável o bastante pra amarrar a busca ao banco. Modelo sugerido: Haiku pro custo, Sonnet se a precisão do print pedir |
| UI | **Tailwind + shadcn/ui** | Chega perto do visual da referência rápido, sem virar projeto de design |
| Chat | **Vercel AI SDK** | Streaming e tool calling prontos, integra com Claude direto |

**Alternativa:** se preferir manter tudo no ecossistema Vercel, Neon ou Vercel Postgres no lugar do Supabase — nesse caso a autenticação vira Auth.js, o que dá um pouco mais de trabalho. Supabase economiza esse passo.

### Custo estimado (mensal)

- Vercel Hobby ou Pro: R$0 a ~R$110
- Supabase Free ou Pro: R$0 a ~R$140
- API de IA: baixo. Uso interno, poucas dezenas de consultas por dia. Estimativa abaixo de R$50/mês

## 11. Requisitos não-funcionais

- **Performance:** dashboard carrega em menos de 2s; resposta da IA começa a aparecer (streaming) em menos de 3s
- **Responsivo:** funciona no celular. No mobile a sidebar vira drawer e o chat ocupa a tela toda
- **Segurança:** Row Level Security no Supabase; nenhuma rota acessível sem sessão válida; chave da API de IA só no servidor, nunca no cliente
- **Imagens:** o print é enviado ao modelo para leitura e **não é armazenado** — só o termo extraído entra no histórico da conversa
- **Rate limit:** limite por usuário no endpoint de chat, pra evitar consumo acidental de API

## 12. Fases

### Fase 1 — Fundação (semana 1)
Setup Next.js + Supabase na Vercel, schema do banco, auth com allowlist, layout base (header, sidebar, área central vazia).
**Entregue:** dá pra logar e ver a casca do site.

### Fase 2 — CRUD e carga (semana 2)
Formulário de material, página de evento, importação CSV com preview, busca manual por texto.
**Entregue:** o acervo já existe e já resolve o problema — mesmo sem IA. Aqui vale fazer a carga inicial dos eventos passados.

### Fase 3 — Chat de IA (semana 3)
Endpoint de chat com tool calling, ferramenta `buscar_materiais`, camada de validação anti-alucinação, UI do chat com streaming e cards.
**Entregue:** o produto do PRD.

### Fase 4 — Print e refino (semana 4)
Anexo e colagem de imagem, leitura do print, feedback do termo extraído, fuzzy matching afinado, filtros da sidebar, ajuste visual.
**Entregue:** V1 fechada.

> A ordem importa: a Fase 2 já entrega valor sozinha. Se o prazo apertar, um acervo com busca manual funcionando é melhor do que um chat de IA sobre um banco vazio.

## 13. Backlog V2

- Upload de arquivo pra dentro do site (Supabase Storage), mantendo o link como opção
- Acesso de mentorados, com controle de qual evento cada um pode ver
- Transcrição das gravações e busca **dentro** do conteúdo (embeddings + pgvector)
- Busca por tema, não só por nome ("material sobre oferta")
- Envio de material direto pro WhatsApp
- Página pública por evento, com link compartilhável

## 14. Decisões em aberto

1. **Nome do produto.** "Acervo de Eventos" é placeholder.
2. **Domínio.** Subdomínio próprio ou o `.vercel.app` mesmo? Uso interno permite começar com o padrão.
3. **Link quebrado.** Vale um verificador que checa periodicamente se as URLs ainda respondem? Materiais no Drive somem. Sugestão: fica na V2, mas é um risco real do modelo "só link".
4. **Carga inicial.** Quantos eventos e materiais existem hoje pra importar? Isso define se o CSV é a prioridade ou o formulário.

---

## Anexo — Prompt do sistema (rascunho)

```
Você é o assistente do Acervo de Eventos da Mentoria Fluxo.
Sua única função é localizar materiais de eventos no acervo interno.

Regras:
- Use SEMPRE a ferramenta buscar_materiais antes de responder.
- Responda apenas com materiais retornados pela ferramenta.
- NUNCA invente evento, palestrante, título ou URL.
- Se a busca voltar vazia, diga que não encontrou e sugira outro termo.
  Não ofereça alternativas que não estejam nos resultados.
- Se houver mais de um evento plausível, liste os candidatos e pergunte qual.
- Se o usuário mandar uma imagem, leia o nome do evento ou do palestrante
  que aparece nela, diga qual termo você leu, e busque por ele.
- Não responda perguntas fora do escopo de localizar material do acervo.

Formato: uma frase curta de contexto, depois os materiais.
Devolva os IDs dos materiais — a interface renderiza os cards.
```
