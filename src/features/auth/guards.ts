import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_PROFILE, isPreviewMode } from "@/lib/preview";
import type { AppRole, Profile } from "@/types/database";

export type SessionUser = {
  id: string;
  email: string;
  profile: Profile;
};

/**
 * Sesión + perfil del usuario actual, o null.
 * `cache` lo deduplica dentro de un mismo render, así que llamarlo desde el
 * layout y desde la página no cuesta dos queries.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // ⚠️ PREVIEW: usuario de mentira con rol admin. Borrar con src/lib/preview.ts.
  if (isPreviewMode()) {
    return { id: PREVIEW_PROFILE.id, email: PREVIEW_PROFILE.email, profile: PREVIEW_PROFILE };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Usuario de auth sin perfil: el trigger no llegó a correr. Sin perfil no hay
  // rol, y sin rol no se puede decidir nada, así que se trata como no autenticado.
  if (!profile) return null;

  return { id: user.id, email: user.email ?? profile.email, profile };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${await getLocale()}/login`);
  }
  return user;
}

/**
 * Exige uno de los roles dados. Es la comodidad de la UI, no la barrera real:
 * la barrera es la RLS de Postgres (ver supabase/migrations/0003_rls.sql).
 */
export async function requireRole(...roles: AppRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.profile.role)) {
    redirect(`/${await getLocale()}/biblioteca`);
  }
  return user;
}

export function canEditLibrary(role: AppRole): boolean {
  return role === "admin" || role === "editor";
}

export function canDeleteLibrary(role: AppRole): boolean {
  return role === "admin";
}

export function canManageUsers(role: AppRole): boolean {
  return role === "admin";
}
