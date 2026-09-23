"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { getSessionUser, requireRole } from "./guards";
import { isLocale } from "@/lib/i18n/routing";
import type { AppRole } from "@/types/database";

export type ActionState = { error?: string; ok?: boolean };

const emailSchema = z.email().trim();
const roleSchema = z.enum(["admin", "editor", "viewer"]);

/**
 * Magic link. `shouldCreateUser: false` es lo que mantiene cerrado el equipo:
 * un email no invitado pide el enlace y no se crea ninguna cuenta.
 */
export async function signInWithMagicLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: t("errors.invalidEmail") };
  }

  const next = String(formData.get("next") ?? "");
  const redirectTo = new URL("/auth/callback", publicEnv.siteUrl);
  redirectTo.searchParams.set("locale", locale);
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirectTo.searchParams.set("next", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo.toString() },
  });

  if (error) {
    return { error: t("errors.magicLinkFailed") };
  }

  redirect(`/${locale}/revisa-tu-correo?email=${encodeURIComponent(parsed.data)}`);
}

export async function signOut() {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}

/** Guarda el idioma elegido para que siga al usuario entre dispositivos. */
export async function setPreferredLocale(locale: string) {
  if (!isLocale(locale)) return;
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("id", user.id);
}

/**
 * Invita a un email nuevo. Requiere el service role key (auth.admin.*), así que
 * corre sólo en el servidor y sólo después de requireRole('admin').
 */
export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    return { error: t("errors.invalidEmail") };
  }

  const role = roleSchema.safeParse(formData.get("role") ?? "viewer");
  if (!role.success) {
    return { error: t("errors.invalidRole") };
  }

  const admin = createAdminClient();
  const redirectTo = new URL("/auth/callback", publicEnv.siteUrl);
  redirectTo.searchParams.set("locale", locale);

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.data, {
    redirectTo: redirectTo.toString(),
  });

  if (error) {
    return { error: error.message };
  }

  // El trigger crea el perfil como 'viewer'. Si el admin pidió otro rol, se
  // aplica aquí, en un paso aparte y explícito.
  if (data.user && role.data !== "viewer") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: role.data })
      .eq("id", data.user.id);
    if (roleError) {
      return { error: t("errors.invitedButRoleFailed") };
    }
  }

  revalidatePath(`/${locale}/admin/usuarios`);
  return { ok: true };
}

/** Cambia el rol de un usuario. Va con la sesión del admin, no con service role,
 *  para que el trigger prevent_role_escalation vea quién lo está pidiendo. */
export async function changeUserRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const userId = z.uuid().safeParse(formData.get("userId"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!userId.success || !role.success) {
    return { error: t("errors.invalidRole") };
  }

  if (userId.data === admin.id && role.data !== "admin") {
    return { error: t("errors.cannotDemoteSelf") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: role.data })
    .eq("id", userId.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/${locale}/admin/usuarios`);
  return { ok: true };
}

export type { AppRole };
