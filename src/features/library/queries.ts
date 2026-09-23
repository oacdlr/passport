import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveCountryCode } from "@/lib/countries";
import { COFFEE_KINDS, PROCESS_METHODS, ROAST_LEVELS } from "./schema";
import type { CoffeeKind, CoffeeListItem, CoffeeOrigin, ProcessMethod, RoastLevel } from "@/types/database";

export type LibraryFilters = {
  q?: string;
  country?: string;
  roast?: string;
  process?: string;
  kind?: string;
};

function isOneOf(value: string | undefined, allowed: readonly string[]): value is string {
  return !!value && allowed.includes(value);
}

/** PostgREST separa los filtros de `or` por comas: hay que neutralizarlas. */
function sanitizeForOr(value: string): string {
  return value
    .replace(/[,()]/g, " ")
    .replace(/\\/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listCoffees(filters: LibraryFilters): Promise<CoffeeListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("coffees_with_origins")
    .select("*")
    .order("created_at", { ascending: false });

  // Los filtros llegan de la query string, así que se estrechan a los enums
  // reales antes de tocar la base.
  if (isOneOf(filters.kind, COFFEE_KINDS)) query = query.eq("kind", filters.kind as CoffeeKind);
  if (isOneOf(filters.roast, ROAST_LEVELS)) query = query.eq("roast", filters.roast as RoastLevel);
  if (isOneOf(filters.process, PROCESS_METHODS))
    query = query.eq("process", filters.process as ProcessMethod);
  if (filters.country) query = query.contains("country_codes", [filters.country]);

  const q = filters.q ? sanitizeForOr(filters.q) : "";
  if (q) {
    const conditions = [`name.ilike.%${q}%`, `origins_search.ilike.%${q}%`, `story.ilike.%${q}%`];

    // "Colombia" no está en la base (allí vive "CO"), así que se traduce el
    // término a código ISO antes de buscar.
    const code = resolveCountryCode(q);
    if (code) conditions.push(`country_codes.cs.{${code}}`);

    query = query.or(conditions.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(`No se pudo cargar la Biblioteca: ${error.message}`);
  return data ?? [];
}

export async function countCoffees(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("coffees")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export const getCoffeeBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coffees_with_origins")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el café: ${error.message}`);
  return data as CoffeeListItem | null;
});

/** Códigos de país presentes en la Biblioteca, para poblar el filtro de Origen. */
export async function listUsedCountryCodes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("coffee_origins").select("country_code");
  if (error || !data) return [];
  return [...new Set(data.map((row) => row.country_code))];
}

/**
 * El bucket es privado: la URL se firma en el servidor y caduca. Nunca se
 * guarda una URL en la base, sólo la key del objeto.
 */
export async function signedPhotoUrl(path: string | null, expiresIn = 3600) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("coffee-photos").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export function originsOf(coffee: CoffeeListItem): CoffeeOrigin[] {
  return Array.isArray(coffee.origins) ? coffee.origins : [];
}
