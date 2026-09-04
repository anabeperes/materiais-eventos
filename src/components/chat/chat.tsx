"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import { MaterialCard } from "@/components/material-card";
import { usePerguntaContext } from "@/components/chat/pergunta-context";
import type { EventoComContagem, MaterialBusca } from "@/lib/types";
import { cn } from "@/lib/utils";

type MediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

interface Anexo {
  data: string; // base64 sem prefixo
  mediaType: MediaType;
  preview: string; // data URL
}

interface MsgUsuario {
  id: string;
  role: "user";
  texto: string;
  imagemPreview?: string;
}

interface MsgAssistente {
  id: string;
  role: "assistant";
  status?: string;
  textoParcial: string;
  mensagem?: string;
  materiais: MaterialBusca[];
  eventosCandidatos: { evento_id: string; nome: string }[];
  termoLido?: string | null;
  erro?: string;
  carregando: boolean;
}

type Msg = MsgUsuario | MsgAssistente;

const SUGESTOES = [
  "materiais da Imersão SP",
  "o que o Felipe apresentou em julho",
  "gravação do último encontro",
  "slides do workshop de oferta",
];

const MEDIA_OK: MediaType[] = ["image/png", "image/jpeg", "image/gif", "image/webp"];

function uid() {
  return Math.random().toString(36).slice(2);
}

/** Texto que entra no histórico para um turno da IA (só o termo extraído e a frase, nunca a imagem). */
function textoHistoricoAssistente(m: MsgAssistente): string {
  const partes: string[] = [];
  if (m.termoLido) partes.push(`Li no print: "${m.termoLido}".`);
  if (m.mensagem) partes.push(m.mensagem);
  if (m.materiais.length) {
    partes.push(
      "Materiais mostrados: " +
        m.materiais.map((x) => `${x.titulo} (${x.evento_nome}, id ${x.material_id})`).join("; "),
    );
  }
  if (m.eventosCandidatos.length) {
    partes.push("Eventos candidatos: " + m.eventosCandidatos.map((e) => e.nome).join("; "));
  }
  return partes.join(" ") || m.erro || "";
}

export function Chat({ eventos = [] }: { eventos?: EventoComContagem[] }) {
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { registrar } = usePerguntaContext();

  const enviar = useCallback(
    async (textoEnviado: string, anexoEnviado: Anexo | null) => {
      const t = textoEnviado.trim();
      if ((!t && !anexoEnviado) || enviando) return;

      const historico = mensagens.map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.imagemPreview && !m.texto ? "(enviou um print)" : m.texto }
          : { role: "assistant" as const, content: textoHistoricoAssistente(m) },
      );

      const idAssistente = uid();
      setMensagens((prev) => [
        ...prev,
        { id: uid(), role: "user", texto: t, imagemPreview: anexoEnviado?.preview },
        {
          id: idAssistente,
          role: "assistant",
          status: "Pensando...",
          textoParcial: "",
          materiais: [],
          eventosCandidatos: [],
          carregando: true,
        },
      ]);
      setTexto("");
      setAnexo(null);
      setEnviando(true);

      const atualizar = (patch: Partial<MsgAssistente>) =>
        setMensagens((prev) =>
          prev.map((m): Msg => (m.id === idAssistente && m.role === "assistant" ? { ...m, ...patch } : m)),
        );

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            historico,
            texto: t,
            imagem: anexoEnviado ? { data: anexoEnviado.data, mediaType: anexoEnviado.mediaType } : null,
          }),
        });

        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          atualizar({ erro: j.erro ?? `Erro ${res.status}`, carregando: false, status: undefined });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const linha = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!linha) continue;
            const ev = JSON.parse(linha);
            if (ev.type === "status") atualizar({ status: ev.texto });
            else if (ev.type === "texto")
              setMensagens((prev) =>
                prev.map((m): Msg =>
                  m.id === idAssistente && m.role === "assistant" ? { ...m, textoParcial: m.textoParcial + ev.delta } : m,
                ),
              );
            else if (ev.type === "resposta")
              atualizar({
                mensagem: ev.mensagem,
                materiais: ev.materiais,
                eventosCandidatos: ev.eventos_candidatos,
                termoLido: ev.termo_lido,
                status: undefined,
                carregando: false,
              });
            else if (ev.type === "erro") atualizar({ erro: ev.mensagem, status: undefined, carregando: false });
          }
        }
        atualizar({ carregando: false, status: undefined });
      } catch {
        atualizar({ erro: "Falha de conexão. Tente de novo.", carregando: false, status: undefined });
      } finally {
        setEnviando(false);
        inputRef.current?.focus();
      }
    },
    [enviando, mensagens],
  );

  // A sidebar injeta perguntas aqui.
  useEffect(() => {
    registrar((pergunta) => void enviar(pergunta, null));
    return () => registrar(null);
  }, [registrar, enviar]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  const carregarArquivo = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!MEDIA_OK.includes(file.type as MediaType)) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande (máx. 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAnexo({ data: dataUrl.split(",")[1] ?? "", mediaType: file.type as MediaType, preview: dataUrl });
      inputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  }, []);

  // Ctrl+V com imagem em qualquer lugar da tela do chat
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        carregarArquivo(item.getAsFile());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [carregarArquivo]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void enviar(texto, anexo);
  };

  const vazio = mensagens.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-suave flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {vazio ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pergunte pelo material</h1>
              <p className="mt-1 text-texto-suave">
                Digite o nome do evento ou do palestrante, cole um print, ou abra um evento abaixo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void enviar(s, null)}
                    className="rounded-full border border-borda bg-superficie px-3 py-1.5 text-sm text-texto hover:border-marca hover:bg-marca-clara"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {eventos.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-3 text-base font-bold">Eventos</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {eventos.map((e) => (
                      <Link
                        key={e.id}
                        href={`/eventos/${e.slug}`}
                        className="group flex flex-col justify-between rounded-xl border border-borda bg-superficie p-4 transition-colors hover:border-marca hover:bg-marca-clara"
                      >
                        <span className="font-medium leading-snug">{e.nome}</span>
                        <span className="mt-3 flex items-center justify-between text-xs text-texto-suave">
                          <span>{e.data_evento ? e.data_evento.slice(0, 4) : "sem data"}</span>
                          <span>
                            {e.total_materiais} {e.total_materiais === 1 ? "material" : "materiais"}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {mensagens.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-marca px-4 py-2.5 text-sm text-texto">
                      {m.imagemPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imagemPreview} alt="Print enviado" className="mb-2 max-h-48 rounded-lg" />
                      )}
                      {m.texto && <p className="whitespace-pre-wrap">{m.texto}</p>}
                    </div>
                  </div>
                ) : (
                  <BolhaAssistente key={m.id} m={m} onEscolherEvento={(nome) => void enviar(`materiais do evento ${nome}`, null)} />
                ),
              )}
              <div ref={fimRef} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-borda bg-superficie/80 backdrop-blur">
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl px-4 py-3">
          {anexo && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-borda bg-fundo p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anexo.preview} alt="Print anexado" className="h-12 rounded" />
              <span className="text-xs text-texto-suave">Print anexado</span>
              <button type="button" onClick={() => setAnexo(null)} className="rounded p-1 text-texto-suave hover:bg-borda" aria-label="Remover imagem">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-borda bg-superficie p-2 focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/20">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                carregarArquivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg p-2 text-texto-suave hover:bg-fundo hover:text-texto"
              title="Anexar print"
              aria-label="Anexar print"
            >
              <ImagePlus size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto, anexo);
                }
              }}
              rows={1}
              placeholder="Pergunte ou cole um print..."
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-texto-suave/70"
              autoFocus
            />
            <button
              type="submit"
              disabled={enviando || (!texto.trim() && !anexo)}
              className={cn(
                "rounded-lg p-2 transition-colors",
                enviando || (!texto.trim() && !anexo) ? "bg-borda text-texto-suave" : "bg-marca text-texto hover:bg-marca-escura",
              )}
              aria-label="Enviar"
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-texto-suave">
            A IA só responde com o que está cadastrado no acervo. O print não é armazenado.
          </p>
        </form>
      </div>
    </div>
  );
}

function BolhaAssistente({ m, onEscolherEvento }: { m: MsgAssistente; onEscolherEvento: (nome: string) => void }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] space-y-2">
        {m.termoLido && (
          <p className="text-xs text-texto-suave">
            Li no print: <span className="font-medium text-texto">“{m.termoLido}”</span>
          </p>
        )}
        {(m.mensagem || m.textoParcial) && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.mensagem ?? m.textoParcial}</p>
        )}
        {m.carregando && (
          <p className="flex items-center gap-2 text-sm text-texto-suave">
            <Loader2 size={14} className="animate-spin" /> {m.status ?? "Pensando..."}
          </p>
        )}
        {m.erro && <p className="rounded-lg border border-borda bg-fundo px-3 py-2 text-sm font-medium text-texto">{m.erro}</p>}
        {m.eventosCandidatos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {m.eventosCandidatos.map((e) => (
              <button
                key={e.evento_id}
                type="button"
                onClick={() => onEscolherEvento(e.nome)}
                className="rounded-full border border-borda bg-superficie px-3 py-1.5 text-sm hover:border-marca hover:bg-marca-clara"
              >
                {e.nome}
              </button>
            ))}
          </div>
        )}
        {m.materiais.length > 0 && (
          <div className="space-y-2">
            {m.materiais.map((x) => (
              <MaterialCard
                key={x.material_id}
                id={x.material_id}
                titulo={x.titulo}
                url={x.url}
                tipo={x.tipo}
                descricao={x.descricao}
                tags={x.tags}
                eventoNome={x.evento_nome}
                eventoSlug={x.evento_slug}
                dataEvento={x.data_evento}
                palestrantes={x.palestrantes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
