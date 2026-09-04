"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Usuario } from "@/lib/types";
import { Logo } from "@/components/logo";

export function Header({ usuario, onAbrirMenu }: { usuario: Usuario; onAbrirMenu?: () => void }) {
  const pathname = usePathname();
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const admin = usuario.papel === "admin";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-borda bg-superficie px-3 sm:px-4">
      <button
        type="button"
        onClick={onAbrirMenu}
        className="rounded-lg p-2 text-texto-suave hover:bg-fundo md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <Link href="/" className="flex items-center gap-2">
        <Logo tamanho={30} />
        <span className="hidden font-semibold tracking-tight sm:inline">Materiais Eventos</span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {admin && (
          <Link
            href="/admin"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              ativo("/admin") ? "bg-fundo font-medium text-texto" : "text-texto-suave hover:bg-fundo hover:text-texto",
            )}
          >
            Admin
          </Link>
        )}
        <span className="hidden max-w-40 truncate text-sm text-texto-suave lg:inline" title={usuario.email}>
          {usuario.nome ?? usuario.email}
        </span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-texto-suave hover:bg-fundo hover:text-texto"
            title="Sair"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}
