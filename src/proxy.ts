import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { defaultLocale, isLocale, routing } from "@/lib/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

/** Rutas accesibles sin sesión, ya sin el prefijo de locale. */
const PUBLIC_PATHS = ["/login", "/revisa-tu-correo"];

function stripLocale(pathname: string): { locale: string; rest: string } {
  const [, maybeLocale, ...segments] = pathname.split("/");
  if (isLocale(maybeLocale)) {
    return { locale: maybeLocale, rest: "/" + segments.join("/") };
  }
  return { locale: defaultLocale, rest: pathname };
}

export async function proxy(request: NextRequest) {
  // 1. Normaliza el locale. Si toca redirigir (/biblioteca -> /es/biblioteca),
  //    se devuelve ya: la siguiente petición pasa por el guard de auth.
  const response = handleI18nRouting(request);
  if (response.headers.get("location")) {
    return response;
  }

  // 2. Refresca la sesión. getUser() valida el token contra el servidor de
  //    Auth, a diferencia de getSession(), que se fía de la cookie.
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Si Auth no responde (red caída, proyecto mal configurado), se trata como
  // sesión ausente y se manda al login, en vez de tirar un 500 en cada página.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  // 3. Guard de sesión. El chequeo de rol NO va aquí: vive en cada página vía
  //    requireRole(), respaldado por RLS en la base de datos.
  const { locale, rest } = stripLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some((path) => rest === path || rest.startsWith(`${path}/`));

  if (!user && !isPublic) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    if (rest !== "/") {
      loginUrl.searchParams.set("next", rest);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL(`/${locale}/biblioteca`, request.url));
  }

  return response;
}

export const config = {
  // Todo menos assets estáticos, el callback de auth y los archivos con extensión.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
