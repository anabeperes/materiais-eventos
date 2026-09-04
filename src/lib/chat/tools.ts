import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { TIPOS_MATERIAL } from "@/lib/types";

export const buscarSchema = z.object({
  termo: z.string().min(1).describe("Nome do evento, do palestrante ou tema. Ex.: 'workshop de oferta', 'Felipe', 'imersão sp'"),
  tipo: z.enum(TIPOS_MATERIAL).nullable().optional().describe("Filtro opcional por tipo de material"),
  ano: z.number().int().min(2000).max(2100).nullable().optional().describe("Filtro opcional pelo ano do evento"),
});
export type BuscarInput = z.infer<typeof buscarSchema>;

export const responderSchema = z.object({
  mensagem: z.string().min(1),
  material_ids: z.array(z.string()).default([]),
  eventos_candidatos: z
    .array(z.object({ evento_id: z.string(), nome: z.string() }))
    .default([]),
  termo_lido: z.string().nullable().optional(),
});
export type ResponderInput = z.infer<typeof responderSchema>;

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_materiais",
    description:
      "Busca materiais no acervo interno por nome do evento, nome/apelido do palestrante, título ou tag. A busca é tolerante a erros de digitação e acentos. Retorna apenas o que existe no banco.",
    input_schema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Nome do evento, do palestrante ou tema." },
        tipo: {
          type: ["string", "null"],
          enum: [...TIPOS_MATERIAL, null],
          description: "Filtro opcional por tipo de material.",
        },
        ano: { type: ["integer", "null"], description: "Filtro opcional pelo ano do evento." },
      },
      required: ["termo"],
      additionalProperties: false,
    },
  },
  {
    name: "responder",
    description:
      "Entrega a resposta final ao usuário. A interface renderiza os cards dos materiais a partir dos IDs; a mensagem deve ser uma frase curta de contexto.",
    input_schema: {
      type: "object",
      properties: {
        mensagem: { type: "string", description: "Frase curta de contexto, sem URLs." },
        material_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs (material_id) dos materiais retornados pela busca que respondem ao pedido, em ordem de relevância.",
        },
        eventos_candidatos: {
          type: "array",
          items: {
            type: "object",
            properties: { evento_id: { type: "string" }, nome: { type: "string" } },
            required: ["evento_id", "nome"],
            additionalProperties: false,
          },
          description: "Só quando for preciso perguntar de qual evento a pessoa está falando.",
        },
        termo_lido: { type: ["string", "null"], description: "Termo lido do print, quando houve imagem." },
      },
      required: ["mensagem", "material_ids", "eventos_candidatos"],
      additionalProperties: false,
    },
  },
];
