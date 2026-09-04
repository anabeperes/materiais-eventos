import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { TIPOS_MATERIAL } from "@/lib/types";

export const buscarSchema = z.object({
  termo: z.string().min(1),
  tipo: z.enum(TIPOS_MATERIAL).nullable().optional(),
  ano: z.number().int().min(2000).max(2100).nullable().optional(),
});
export type BuscarInput = z.infer<typeof buscarSchema>;

export const responderSchema = z.object({
  mensagem: z.string().min(1),
  material_ids: z.array(z.string()).default([]),
  eventos_candidatos: z.array(z.object({ evento_id: z.string(), nome: z.string() })).default([]),
  termo_lido: z.string().nullable().optional(),
});
export type ResponderInput = z.infer<typeof responderSchema>;

export const FUNCOES: FunctionDeclaration[] = [
  {
    name: "buscar_materiais",
    description:
      "Busca materiais no acervo interno por nome do evento, nome/apelido do palestrante, título ou tag. A busca é tolerante a erros de digitação e acentos. Retorna apenas o que existe no banco.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        termo: { type: Type.STRING, description: "Nome do evento, do palestrante ou tema. Ex.: 'workshop de oferta', 'Felipe', 'black friday'." },
        tipo: { type: Type.STRING, enum: [...TIPOS_MATERIAL], nullable: true, description: "Filtro opcional por tipo de material." },
        ano: { type: Type.INTEGER, nullable: true, description: "Filtro opcional pelo ano do evento." },
      },
      required: ["termo"],
    },
  },
  {
    name: "responder",
    description:
      "Entrega a resposta final ao usuário. A interface renderiza os cards dos materiais a partir dos IDs; a mensagem deve ser uma frase curta de contexto, sem URLs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        mensagem: { type: Type.STRING, description: "Frase curta de contexto, sem URLs." },
        material_ids: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "IDs (material_id) dos materiais retornados pela busca que respondem ao pedido, em ordem de relevância. Vazio se não achou.",
        },
        eventos_candidatos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { evento_id: { type: Type.STRING }, nome: { type: Type.STRING } },
            required: ["evento_id", "nome"],
          },
          description: "Só quando for preciso perguntar de qual evento a pessoa está falando.",
        },
        termo_lido: { type: Type.STRING, nullable: true, description: "Termo lido do print, quando houve imagem." },
      },
      required: ["mensagem", "material_ids", "eventos_candidatos"],
    },
  },
];
