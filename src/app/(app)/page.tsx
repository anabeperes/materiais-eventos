import { Chat } from "@/components/chat/chat";
import { listarEventosComContagem } from "@/lib/data";

export default async function HomePage() {
  const eventos = await listarEventosComContagem();
  return <Chat eventos={eventos} />;
}
