import { AppShell } from "@/components/app-shell";
import { exigirUsuario } from "@/lib/auth";
import { anosDisponiveis, listarEventosComContagem, listarPalestrantes, listarTags } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const [eventos, palestrantes, anos, tags] = await Promise.all([
    listarEventosComContagem(),
    listarPalestrantes(),
    anosDisponiveis(),
    listarTags(),
  ]);

  return (
    <AppShell usuario={usuario} sidebar={{ eventos, palestrantes, anos, tags }}>
      {children}
    </AppShell>
  );
}
