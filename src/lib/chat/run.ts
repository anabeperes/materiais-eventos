import Anthropic from "@anthropic-ai/sdk";
import { buscarMateriais } from "@/lib/data";
import type { MaterialBusca } from "@/lib/types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOLS, buscarSchema, responderSchema } from "./tools";

export const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_ITERACOES = 6;

export type MediaTypeImagem = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface MensagemHistorico {
  role: "user" | "assistant";
  /** Texto puro. Imagens de turnos anteriores NÃO entram no histórico (PRD, seção 11). */
  content: string;
}

export interface EntradaChat {
  historico: MensagemHistorico[];
  texto: string;
  imagem?: { data: string; mediaType: MediaTypeImagem } | null;
}

export type EventoChat =
  | { type: "status"; texto: string }
  | { type: "texto"; delta: string }
  | {
      type: "resposta";
      mensagem: string;
      materiais: MaterialBusca[];
      eventos_candidatos: { evento_id: string; nome: string }[];
      termo_lido: string | null;
    }
  | { type: "erro"; mensagem: string };

const URL_REGEX = /https?:\/\/[^\s)>\]]+/gi;

/**
 * Executa um turno do chat: monta as mensagens, roda o loop de tool calling
 * e valida a resposta contra os resultados devolvidos pela busca NESTE turno.
 */
export async function* executarTurno(entrada: EntradaChat): AsyncGenerator<EventoChat> {
  const client = new Anthropic();

  const conteudoUsuario: Anthropic.ContentBlockParam[] = [];
  if (entrada.imagem) {
    conteudoUsuario.push({
      type: "image",
      source: { type: "base64", media_type: entrada.imagem.mediaType, data: entrada.imagem.data },
    });
  }
  conteudoUsuario.push({
    type: "text",
    text: entrada.texto.trim() || (entrada.imagem ? "Encontre os materiais do evento ou palestrante que aparece nesta imagem." : ""),
  });

  const messages: Anthropic.MessageParam[] = [
    ...entrada.historico
      .filter((m) => m.content.trim().length > 0)
      .map<Anthropic.MessageParam>((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: conteudoUsuario },
  ];

  // Tudo que a ferramenta devolveu neste turno. É o universo permitido na resposta.
  const permitidos = new Map<string, MaterialBusca>();
  const eventosVistos = new Map<string, string>();

  if (entrada.imagem) yield { type: "status", texto: "Lendo o print..." };

  for (let i = 0; i < MAX_ITERACOES; i++) {
    const stream = client.messages.stream({
      model: MODELO,
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });

    // Repassa texto solto (se o modelo escrever algo antes de chamar a ferramenta).
    const deltas: string[] = [];
    stream.on("text", (delta) => deltas.push(delta));

    const resposta = await stream.finalMessage();
    for (const d of deltas.splice(0)) yield { type: "texto", delta: d };

    if (resposta.stop_reason === "refusal") {
      yield { type: "erro", mensagem: "Não consegui processar essa mensagem. Tente descrever o evento por texto." };
      return;
    }

    const toolUses = resposta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    // Sem ferramenta: o modelo encerrou com texto. Validamos e usamos como mensagem.
    if (resposta.stop_reason !== "tool_use" || toolUses.length === 0) {
      const texto = resposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      yield {
        type: "resposta",
        mensagem: limparUrls(texto || "Não encontrei nada com esse termo no acervo. Tenta o nome do evento ou do palestrante.", permitidos),
        materiais: [],
        eventos_candidatos: [],
        termo_lido: null,
      };
      return;
    }

    messages.push({ role: "assistant", content: resposta.content });

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    let respostaFinal: EventoChat | null = null;

    for (const tu of toolUses) {
      if (tu.name === "buscar_materiais") {
        const parsed = buscarSchema.safeParse(tu.input);
        if (!parsed.success) {
          resultados.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "Parâmetros inválidos: informe 'termo'." });
          continue;
        }
        const { termo, tipo, ano } = parsed.data;
        yield { type: "status", texto: `Buscando "${termo}"...` };

        let encontrados: MaterialBusca[] = [];
        try {
          encontrados = await buscarMateriais(termo, { tipo: tipo ?? null, ano: ano ?? null });
        } catch (e) {
          console.error("buscar_materiais falhou", e);
          resultados.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "Erro ao consultar o banco." });
          continue;
        }
        for (const m of encontrados) {
          permitidos.set(m.material_id, m);
          eventosVistos.set(m.evento_id, m.evento_nome);
        }
        resultados.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify({
            total: encontrados.length,
            materiais: encontrados.map((m) => ({
              material_id: m.material_id,
              titulo: m.titulo,
              tipo: m.tipo,
              tags: m.tags,
              evento_id: m.evento_id,
              evento: m.evento_nome,
              data_evento: m.data_evento,
              palestrantes: m.palestrantes,
            })),
          }),
        });
      } else if (tu.name === "responder") {
        const parsed = responderSchema.safeParse(tu.input);
        if (!parsed.success) {
          resultados.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "Parâmetros inválidos." });
          continue;
        }
        const r = parsed.data;

        // ---- Validação anti-alucinação (camada de código) ----
        const ids = [...new Set(r.material_ids)].filter((id) => permitidos.has(id));
        const materiais = ids.map((id) => permitidos.get(id)!);
        const candidatos = r.eventos_candidatos
          .filter((c) => eventosVistos.has(c.evento_id))
          .map((c) => ({ evento_id: c.evento_id, nome: eventosVistos.get(c.evento_id)! }));

        respostaFinal = {
          type: "resposta",
          mensagem: limparUrls(r.mensagem, permitidos),
          materiais,
          eventos_candidatos: candidatos,
          termo_lido: r.termo_lido ?? null,
        };
        resultados.push({ type: "tool_result", tool_use_id: tu.id, content: "ok" });
      } else {
        resultados.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: `Ferramenta desconhecida: ${tu.name}` });
      }
    }

    if (respostaFinal) {
      yield respostaFinal;
      return;
    }

    messages.push({ role: "user", content: resultados });
  }

  // Estourou o número de iterações sem resposta final.
  const materiais = [...permitidos.values()].slice(0, 10);
  yield {
    type: "resposta",
    mensagem: materiais.length
      ? "Isso foi o que encontrei no acervo para o seu pedido."
      : "Não encontrei nada com esse termo no acervo. Tenta o nome do evento ou do palestrante.",
    materiais,
    eventos_candidatos: [],
    termo_lido: null,
  };
}

/** Remove da mensagem qualquer URL que não esteja entre os materiais devolvidos pela busca neste turno. */
function limparUrls(texto: string, permitidos: Map<string, MaterialBusca>): string {
  const urlsOk = new Set([...permitidos.values()].map((m) => m.url));
  return texto.replace(URL_REGEX, (url) => (urlsOk.has(url) ? url : "[link removido]")).trim();
}
