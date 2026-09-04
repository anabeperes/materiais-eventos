import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@google/genai";
import { z } from "zod";
import { getUsuarioAtual } from "@/lib/auth";
import { permitir } from "@/lib/rate-limit";
import { executarTurno, type EventoChat } from "@/lib/chat/run";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGEM_BYTES = 5 * 1024 * 1024; // ~5 MB decodificado (limite da API: 5 MB por imagem)

const corpoSchema = z.object({
  historico: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(30)
    .default([]),
  texto: z.string().max(2000).default(""),
  imagem: z
    .object({
      data: z.string(),
      mediaType: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
    })
    .nullable()
    .optional(),
});

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ erro: "GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
  }

  // Valor vazio ou inválido na variável cai no padrão, em vez de bloquear tudo.
  const limiteEnv = Number(process.env.CHAT_RATE_LIMIT_PER_HOUR);
  const limite = Number.isFinite(limiteEnv) && limiteEnv > 0 ? limiteEnv : 120;
  if (!permitir(`chat:${usuario.id}`, limite, 60 * 60 * 1000)) {
    return NextResponse.json({ erro: "Muitas mensagens em pouco tempo. Espere um pouco." }, { status: 429 });
  }

  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  const { historico, texto, imagem } = parsed.data;

  if (!texto.trim() && !imagem) return NextResponse.json({ erro: "Mande um texto ou uma imagem." }, { status: 400 });
  if (imagem && imagem.data.length * 0.75 > MAX_IMAGEM_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande (máx. 5 MB)." }, { status: 413 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (ev: EventoChat) => controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      try {
        for await (const ev of executarTurno({ historico, texto, imagem: imagem ?? null })) enviar(ev);
      } catch (e) {
        console.error("chat falhou", e);
        enviar({ type: "erro", mensagem: mensagemDeErro(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401 || e.status === 403) return "Chave da API de IA inválida.";
    if (e.status === 429 || e.status === 503) return "A API de IA está ocupada. Tente de novo em instantes.";
    if (e.status === 400) return "A IA não aceitou essa mensagem. Tente com outro texto ou imagem.";
    return `Erro na API de IA (${e.status}).`;
  }
  return "Erro inesperado ao consultar a IA.";
}
