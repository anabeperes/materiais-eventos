import { ApiError, GoogleGenAI, type Content, type GenerateContentResponse, type Part } from "@google/genai";
import { buscarMateriais } from "@/lib/data";
import type { MaterialBusca, TipoMaterial } from "@/lib/types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { FUNCOES, buscarSchema, responderSchema } from "./tools";

export const MODELO = process.env.GEMINI_MODEL || "gemini-3.5-flash";
/** Usado quando o modelo principal está indisponível (503/429) mesmo após retentativas. */
export const MODELO_RESERVA = process.env.GEMINI_MODEL_FALLBACK || "gemini-3.8-flash";
const MAX_ITERACOES = 6;
const TENTATIVAS = 2;

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

export type FuncaoBusca = (
  termo: string,
  filtros: { tipo?: TipoMaterial | null; ano?: number | null },
) => Promise<MaterialBusca[]>;

const URL_REGEX = /https?:\/\/[^\s)>\]]+/gi;
const NAO_ACHEI = "Não encontrei nada com esse termo no acervo. Tenta o nome do evento ou do palestrante.";

/**
 * Executa um turno do chat: monta o histórico, roda o loop de function calling
 * do Gemini e valida a resposta contra os resultados devolvidos pela busca NESTE turno.
 *
 * `buscar` é injetável para testes; em produção usa a função SQL via Supabase.
 */
export async function* executarTurno(
  entrada: EntradaChat,
  buscar: FuncaoBusca = (termo, f) => buscarMateriais(termo, f),
  client: GoogleGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
): AsyncGenerator<EventoChat> {
  const partesUsuario: Part[] = [];
  if (entrada.imagem) {
    partesUsuario.push({ inlineData: { mimeType: entrada.imagem.mediaType, data: entrada.imagem.data } });
  }
  partesUsuario.push({
    text:
      entrada.texto.trim() ||
      (entrada.imagem ? "Encontre os materiais do evento ou palestrante que aparece nesta imagem." : ""),
  });

  const contents: Content[] = [
    ...entrada.historico
      .filter((m) => m.content.trim().length > 0)
      .map<Content>((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    { role: "user", parts: partesUsuario },
  ];

  // Tudo que a ferramenta devolveu neste turno. É o universo permitido na resposta.
  const permitidos = new Map<string, MaterialBusca>();
  const eventosVistos = new Map<string, string>();

  if (entrada.imagem) yield { type: "status", texto: "Lendo o print..." };

  for (let i = 0; i < MAX_ITERACOES; i++) {
    const resposta = await gerarComRetentativa(client, contents);

    const candidato = resposta.candidates?.[0];
    const partes = candidato?.content?.parts ?? [];
    const chamadas = partes.filter((p) => p.functionCall).map((p) => p.functionCall!);
    const texto = partes
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join("")
      .trim();

    if (candidato?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidato.finishReason) && chamadas.length === 0) {
      yield { type: "erro", mensagem: "Não consegui processar essa mensagem. Tente descrever o evento por texto." };
      return;
    }

    // Sem função: o modelo encerrou com texto. Validamos e usamos como mensagem.
    if (chamadas.length === 0) {
      if (texto) yield { type: "texto", delta: texto };
      yield {
        type: "resposta",
        mensagem: limparUrls(texto || NAO_ACHEI, permitidos),
        materiais: [],
        eventos_candidatos: [],
        termo_lido: null,
      };
      return;
    }

    // Guarda a resposta do modelo como veio (inclui thoughtSignature, exigido pelo Gemini 3).
    contents.push(candidato!.content!);

    const respostasFuncao: Part[] = [];
    let respostaFinal: EventoChat | null = null;

    for (const fc of chamadas) {
      const nome = fc.name ?? "";
      const responder = (response: Record<string, unknown>) =>
        respostasFuncao.push({ functionResponse: { id: fc.id, name: nome, response } });

      if (nome === "buscar_materiais") {
        const parsed = buscarSchema.safeParse(fc.args);
        if (!parsed.success) {
          responder({ error: "Parâmetros inválidos: informe 'termo'." });
          continue;
        }
        const { termo, tipo, ano } = parsed.data;
        yield { type: "status", texto: `Buscando "${termo}"...` };

        let encontrados: MaterialBusca[] = [];
        try {
          encontrados = await buscar(termo, { tipo: tipo ?? null, ano: ano ?? null });
        } catch (e) {
          console.error("buscar_materiais falhou", e);
          responder({ error: "Erro ao consultar o banco." });
          continue;
        }
        for (const m of encontrados) {
          permitidos.set(m.material_id, m);
          eventosVistos.set(m.evento_id, m.evento_nome);
        }
        responder({
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
        });
      } else if (nome === "responder") {
        const parsed = responderSchema.safeParse(fc.args);
        if (!parsed.success) {
          responder({ error: "Parâmetros inválidos." });
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
        responder({ output: "ok" });
      } else {
        responder({ error: `Ferramenta desconhecida: ${nome}` });
      }
    }

    if (respostaFinal) {
      yield respostaFinal;
      return;
    }

    contents.push({ role: "user", parts: respostasFuncao });
  }

  // Estourou o número de iterações sem resposta final.
  const materiais = [...permitidos.values()].slice(0, 10);
  yield {
    type: "resposta",
    mensagem: materiais.length ? "Isso foi o que encontrei no acervo para o seu pedido." : NAO_ACHEI,
    materiais,
    eventos_candidatos: [],
    termo_lido: null,
  };
}

/**
 * Chama o modelo com retentativa em 503/429 e cai para o modelo reserva
 * se o principal continuar indisponível.
 */
async function gerarComRetentativa(client: GoogleGenAI, contents: Content[]): Promise<GenerateContentResponse> {
  const config = {
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: FUNCOES }],
    temperature: 0.2,
  };
  let ultimoErro: unknown;
  for (const model of [MODELO, MODELO_RESERVA]) {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        return await client.models.generateContent({ model, contents, config });
      } catch (e) {
        ultimoErro = e;
        const status = e instanceof ApiError ? e.status : 0;
        if (status !== 503 && status !== 429) throw e;
        if (tentativa < TENTATIVAS) await new Promise((r) => setTimeout(r, 800 * tentativa));
      }
    }
    console.warn(`modelo ${model} indisponível, tentando o reserva`);
  }
  throw ultimoErro;
}

/** Remove da mensagem qualquer URL que não esteja entre os materiais devolvidos pela busca neste turno. */
function limparUrls(texto: string, permitidos: Map<string, MaterialBusca>): string {
  const urlsOk = new Set([...permitidos.values()].map((m) => m.url));
  return texto.replace(URL_REGEX, (url) => (urlsOk.has(url) ? url : "[link removido]")).trim();
}
