import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/lib/i18n/routing";

/**
 * Destino de los enlaces de correo. Cubre los dos formatos que manda Supabase:
 *  - `code`        → magic link pedido desde la app (flujo PKCE).
 *  - `token_hash`  → invitación creada con auth.admin.inviteUserByEmail.
 *
 * Vive fuera de [locale] porque la URL la construye Supabase, no el router.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const localeParam = searchParams.get("locale");
  const locale = isLocale(localeParam ?? undefined) ? localeParam : defaultLocale;

  const rawNext = searchParams.get("next");
  // Sólo rutas internas: evita que el parámetro se use como redirect abierto.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/biblioteca";

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=link`);
}
