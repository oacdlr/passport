"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/features/auth/guards";
import { parseSpreadsheet } from "./import/server";
import type { ImportError, ImportPreview } from "./import";
import type { Json } from "@/types/database";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type AnalyzeResult = { preview?: ImportPreview; error?: ImportError };
export type ImportResult = {
  error?: ImportError;
  result?: { inserted: number; updated: number; skipped: number };
};

/** Lee el archivo del FormData y lo valida. No escribe nada en la base. */
async function previewFrom(formData: FormData): Promise<AnalyzeResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: { key: "parse" } };
  if (file.size === 0) return { error: { key: "empty" } };
  if (file.size > MAX_UPLOAD_BYTES) return { error: { key: "tooLarge" } };

  return parseSpreadsheet(file.name, await file.arrayBuffer());
}

/** Paso 2 del wizard: sólo analiza. */
export async function analyzeSpreadsheet(formData: FormData): Promise<AnalyzeResult> {
  await requireRole("admin", "editor");
  return previewFrom(formData);
}

/**
 * Paso 3: importa de verdad.
 *
 * Se vuelve a leer el archivo en el servidor en lugar de confiar en las filas
 * que manda el cliente: el preview es ayuda visual, no una fuente de verdad.
 */
export async function importSpreadsheet(formData: FormData): Promise<ImportResult> {
  await requireRole("admin", "editor");
  const locale = await getLocale();

  const mode = formData.get("mode") === "update" ? "update" : "skip";

  const { preview, error } = await previewFrom(formData);
  if (error) return { error };
  if (!preview || preview.validCount === 0) return { error: { key: "noValidRows" } };

  const payload = preview.rows
    .filter((row) => row.data !== null)
    .map((row) => ({
      slug: row.slug,
      name: row.data!.name,
      kind: row.data!.kind,
      roast: row.data!.roast ?? "",
      process: row.data!.process ?? "",
      body: row.data!.body ?? "",
      acidity: row.data!.acidity ?? "",
      story: row.data!.story ?? "",
      tasting_notes: row.data!.tasting_notes,
      complementary_flavors: row.data!.complementary_flavors,
      extra: row.data!.extra,
      source_locale: locale,
      origins: row.data!.origins.map((origin) => ({
        country_code: origin.country_code,
        region: origin.region ?? "",
        producer: origin.producer ?? "",
        farm: origin.farm ?? "",
        altitude_masl: origin.altitude_masl ?? "",
      })),
    }));

  const supabase = await createClient();

  // Una sola llamada: la RPC mete todo el lote en una transacción, así que no
  // quedan cafés a medias si la fila 180 falla.
  const { data, error: rpcError } = await supabase.rpc("import_coffees", {
    payload: payload as unknown as Json,
    mode,
  });

  if (rpcError) return { error: { key: "database", values: { value: rpcError.message } } };

  revalidatePath(`/${locale}/biblioteca`);
  return { result: data as unknown as { inserted: number; updated: number; skipped: number } };
}
