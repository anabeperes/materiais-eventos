import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Acervo de Eventos", template: "%s · Acervo de Eventos" },
  description: "Materiais dos eventos da Mentoria Fluxo, num lugar só.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
