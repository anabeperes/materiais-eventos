import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-borda pb-3 text-sm">
        <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-fundo">Materiais</Link>
        <Link href="/admin/materiais/novo" className="rounded-md px-3 py-1.5 hover:bg-fundo">Novo material</Link>
        <Link href="/admin/importar" className="rounded-md px-3 py-1.5 hover:bg-fundo">Importar CSV</Link>
        <Link href="/admin/usuarios" className="rounded-md px-3 py-1.5 hover:bg-fundo">Usuários</Link>
      </nav>
      {children}
    </div>
  );
}
