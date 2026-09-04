/**
 * Rate limit simples em memória (por instância). Suficiente para uso interno
 * e para evitar consumo acidental da API. Em produção com várias instâncias,
 * cada uma tem o próprio contador — o limite efetivo é aproximado.
 */
const janelas = new Map<string, number[]>();

export function permitir(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now();
  const hits = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (hits.length >= limite) {
    janelas.set(chave, hits);
    return false;
  }
  hits.push(agora);
  janelas.set(chave, hits);
  return true;
}
