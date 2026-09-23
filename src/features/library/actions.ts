"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/features/auth/guards";
import { slugify } from "@/lib/utils";
import { coffeeInputFromFormData, type CoffeeInput } from "./schema";
import type { Coffee, Json } from "@/types/database";

export type LibraryActionState = { error?: string; fieldErrors?: Record<string, string> };

const PHOTO_BUCKET = "coffee-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Busca un slug libre: "cerro-azul", "cerro-azul-2", … */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = await createClient();
  const root = slugify(base) || "cafe";

  const { data } = await supabase.from("coffees").select("id, slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).filter((row) => row.id !== ignoreId).map((row) => row.slug));

  if (!taken.has(root)) return root;
  for (let i = 2; i < 500; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function uploadPhoto(file: File, slug: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) throw new Error("photoTooLarge");
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error("photoType");

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${slug}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);
  return path;
}

async function writeOrigins(coffeeId: string, origins: CoffeeInput["origins"]) {
  const supabase = await createClient();

  // Se reemplazan enteros en vez de intentar casar líneas una a una.
  const { error: deleteError } = await supabase
    .from("coffee_origins")
    .delete()
    .eq("coffee_id", coffeeId);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabase.from("coffee_origins").insert(
    origins.map((origin, index) => ({
      coffee_id: coffeeId,
      position: index,
      country_code: origin.country_code,
      region: origin.region,
      producer: origin.producer,
      farm: origin.farm,
      altitude_masl: origin.altitude_masl,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function createCoffee(
  _prev: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const author = await requireRole("admin", "editor");
  const t = await getTranslations("common");
  const locale = await getLocale();

  const parsed = coffeeInputFromFormData(formData);
  if (!parsed.success) {
    return { error: t("genericError"), fieldErrors: flattenIssues(parsed.error.issues) };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const slug = await uniqueSlug(input.name);

  let photoPath: string | null = null;
  try {
    photoPath = await uploadPhoto(formData.get("photo") as File, slug);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const { data, error } = await supabase
    .from("coffees")
    .insert({
      slug,
      name: input.name,
      kind: input.kind,
      roast: input.roast,
      process: input.process,
      body: input.body,
      acidity: input.acidity,
      story: input.story,
      tasting_notes: input.tasting_notes,
      complementary_flavors: input.complementary_flavors,
      extra: input.extra as Json,
      photo_path: photoPath,
      source_locale: locale,
      created_by: author.id,
    })
    .select("id, slug")
    .single();

  if (error || !data) return { error: error?.message ?? t("genericError") };

  try {
    await writeOrigins(data.id, input.origins);
  } catch (originError) {
    return { error: (originError as Error).message };
  }

  revalidatePath(`/${locale}/biblioteca`);
  redirect(`/${locale}/biblioteca/${data.slug}`);
}

export async function updateCoffee(
  _prev: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  await requireRole("admin", "editor");
  const t = await getTranslations("common");
  const locale = await getLocale();

  const id = String(formData.get("id") ?? "");
  const currentSlug = String(formData.get("slug") ?? "");
  if (!id || !currentSlug) return { error: t("genericError") };

  const parsed = coffeeInputFromFormData(formData);
  if (!parsed.success) {
    return { error: t("genericError"), fieldErrors: flattenIssues(parsed.error.issues) };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const update: Partial<Coffee> = {
    name: input.name,
    kind: input.kind,
    roast: input.roast,
    process: input.process,
    body: input.body,
    acidity: input.acidity,
    story: input.story,
    tasting_notes: input.tasting_notes,
    complementary_flavors: input.complementary_flavors,
    extra: input.extra as Json,
  };

  if (formData.get("removePhoto") === "on") {
    update.photo_path = null;
  }

  try {
    const uploaded = await uploadPhoto(formData.get("photo") as File, currentSlug);
    if (uploaded) update.photo_path = uploaded;
  } catch (error) {
    return { error: (error as Error).message };
  }

  const { error } = await supabase.from("coffees").update(update).eq("id", id);
  if (error) return { error: error.message };

  try {
    await writeOrigins(id, input.origins);
  } catch (originError) {
    return { error: (originError as Error).message };
  }

  revalidatePath(`/${locale}/biblioteca`);
  revalidatePath(`/${locale}/biblioteca/${currentSlug}`);
  redirect(`/${locale}/biblioteca/${currentSlug}`);
}

/** Sólo admin, reforzado además por la policy "sólo admin borra cafés". */
export async function deleteCoffee(formData: FormData) {
  await requireRole("admin");
  const locale = await getLocale();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: coffee } = await supabase
    .from("coffees")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("coffees").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (coffee?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([coffee.photo_path]);
  }

  revalidatePath(`/${locale}/biblioteca`);
  redirect(`/${locale}/biblioteca`);
}

function flattenIssues(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}
