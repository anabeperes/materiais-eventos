import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies), então o RLS do banco se aplica.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component: o proxy já renova a sessão.
          }
        },
      },
    },
  );
}
