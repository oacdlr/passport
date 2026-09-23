import { resolveCountryCode } from "@/lib/countries";
import { slugify } from "@/lib/utils";
import {
  COFFEE_KINDS,
  PROCESS_METHODS,
  ROAST_LEVELS,
  coffeeInputSchema,
  type CoffeeInput,
} from "../schema";

/**
 * Núcleo del import de Biblioteca, agnóstico al formato del archivo.
 *
 * Los lectores (`readers.ts`) se encargan de convertir un CSV o un XLSX en
 * `RawRow[]`; a partir de ahí CSV y Excel recorren exactamente el mismo camino,
 * así que las reglas de negocio no pueden divergir entre formatos.
 */

export type ImportError = { key: string; values?: Record<string, string> };

export type ImportRow = {
  row: number;
  name: string;
  slug: string;
  data: CoffeeInput | null;
  errors: ImportError[];
};

export type ImportPreview = {
  rows: ImportRow[];
  validCount: number;
  invalidCount: number;
};

/** Encabezados aceptados, en español y en inglés. */
export const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["nombre", "name", "cafe", "café", "coffee"],
  kind: ["tipo", "kind", "type"],
  countries: ["paises", "países", "pais", "país", "countries", "country", "origen", "origin"],
  regions: ["regiones", "region", "región", "regions"],
  producers: ["productores", "productor", "producers", "producer"],
  farms: ["fincas", "finca", "farms", "farm"],
  altitudes: ["altitudes", "altitud", "altitude", "msnm", "masl"],
  roast: ["tueste", "nivel de tueste", "roast", "roast level"],
  process: ["proceso", "procesamiento", "process"],
  body: ["cuerpo", "body"],
  acidity: ["acidez", "acidity"],
  story: ["historia", "descripcion", "descripción", "story", "description"],
  tasting_notes: ["notas_cata", "notas de cata", "notas", "tasting_notes", "tasting notes"],
  complementary_flavors: [
    "sabores_complementarios",
    "sabores complementarios",
    "complementary_flavors",
    "complementary flavours",
    "complementary flavors",
  ],
  extra: ["extra", "datos extra", "extra_data", "extra data"],
};

const KIND_ALIASES: Record<string, (typeof COFFEE_KINDS)[number]> = {
  "single origin": "single_origin",
  single_origin: "single_origin",
  singleorigin: "single_origin",
  single: "single_origin",
  "origen unico": "single_origin",
  "origen único": "single_origin",
  mezcla: "blend",
  blend: "blend",
};

const ROAST_ALIASES: Record<string, (typeof ROAST_LEVELS)[number]> = {
  claro: "light",
  light: "light",
  "tueste claro": "light",
  "light roast": "light",
  "medio claro": "medium_light",
  "medio-claro": "medium_light",
  medium_light: "medium_light",
  "medium light": "medium_light",
  medio: "medium",
  medium: "medium",
  "tueste medio": "medium",
  "medium roast": "medium",
  "medio oscuro": "medium_dark",
  "medio-oscuro": "medium_dark",
  medium_dark: "medium_dark",
  "medium dark": "medium_dark",
  oscuro: "dark",
  dark: "dark",
  "tueste oscuro": "dark",
};

const PROCESS_ALIASES: Record<string, (typeof PROCESS_METHODS)[number]> = {
  lavado: "washed",
  washed: "washed",
  honey: "honey",
  miel: "honey",
  natural: "natural",
  seco: "natural",
  anaerobico: "anaerobic",
  "anaeróbico": "anaerobic",
  anaerobic: "anaerobic",
  otro: "other",
  other: "other",
};

export function normalizeHeader(header: string): string {
  const cleaned = header.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(cleaned)) return canonical;
  }
  return cleaned;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** JSON, o pares "clave: valor; otra: cosa" -> objeto plano de strings. */
function parseExtra(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};

  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        );
      }
    } catch {
      // No era JSON: cae al formato "clave: valor".
    }
  }

  const result: Record<string, string> = {};
  for (const pair of trimmed.split(";")) {
    const [key, ...rest] = pair.split(":");
    const cleanKey = key?.trim();
    if (cleanKey && rest.length > 0) result[cleanKey] = rest.join(":").trim();
  }
  return result;
}

function lookup<T extends string>(
  table: Record<string, T>,
  raw: string | undefined,
): T | null | "invalid" {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  return table[value] ?? "invalid";
}

export type RawRow = Record<string, string>;

export function buildRow(raw: RawRow, rowNumber: number, knownColumns: Set<string>): ImportRow {
  const errors: ImportError[] = [];
  const name = (raw.name ?? "").trim();

  const kind = lookup(KIND_ALIASES, raw.kind);
  if (kind === "invalid") errors.push({ key: "invalidKind" });

  const roast = lookup(ROAST_ALIASES, raw.roast);
  if (roast === "invalid") errors.push({ key: "invalidRoast" });

  const process = lookup(PROCESS_ALIASES, raw.process);
  if (process === "invalid") errors.push({ key: "invalidProcess" });

  const countries = splitList(raw.countries);
  const regions = splitList(raw.regions);
  const producers = splitList(raw.producers);
  const farms = splitList(raw.farms);
  const altitudes = splitList(raw.altitudes);

  if (countries.length === 0) errors.push({ key: "noCountry" });

  const origins = countries.map((country, index) => {
    const code = resolveCountryCode(country);
    if (!code) errors.push({ key: "unknownCountry", values: { value: country } });
    return {
      country_code: code ?? "ZZ",
      region: regions[index] ?? "",
      producer: producers[index] ?? "",
      farm: farms[index] ?? "",
      altitude_masl: altitudes[index] ?? "",
    };
  });

  // Toda columna que el CSV traiga y no reconozcamos se guarda en `extra`
  // en vez de perderse por el camino.
  const extra = parseExtra(raw.extra);
  for (const [key, value] of Object.entries(raw)) {
    if (key && !knownColumns.has(key) && value?.trim()) extra[key] = value.trim();
  }

  const parsed = coffeeInputSchema.safeParse({
    name,
    kind: kind === "invalid" || kind === null ? undefined : kind,
    roast: roast === "invalid" ? null : roast,
    process: process === "invalid" ? null : process,
    body: (raw.body ?? "").trim(),
    acidity: (raw.acidity ?? "").trim(),
    story: raw.story ?? "",
    tasting_notes: splitList(raw.tasting_notes),
    complementary_flavors: splitList(raw.complementary_flavors),
    extra,
    origins,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.map(String).join(".");
      if (field === "name") {
        errors.push({ key: "required", values: { field: "nombre" } });
      } else if (field === "kind") {
        errors.push({ key: "invalidKind" });
      } else if (field === "body") {
        errors.push({ key: "invalidScale", values: { field: "cuerpo" } });
      } else if (field === "acidity") {
        errors.push({ key: "invalidScale", values: { field: "acidez" } });
      } else if (issue.message === "singleOriginOneCountry") {
        errors.push({ key: "singleOriginOneCountry" });
      } else if (field.startsWith("origins")) {
        if (!errors.some((e) => e.key === "noCountry" || e.key === "unknownCountry")) {
          errors.push({ key: "noCountry" });
        }
      } else {
        errors.push({ key: "required", values: { field } });
      }
    }
  }

  const unique = errors.filter(
    (error, index) =>
      errors.findIndex(
        (other) => other.key === error.key && other.values?.value === error.values?.value,
      ) === index,
  );

  return {
    row: rowNumber,
    name,
    slug: slugify(name),
    data: unique.length === 0 && parsed.success ? parsed.data : null,
    errors: unique,
  };
}

/**
 * Convierte filas ya leídas del archivo en el preview del wizard.
 *
 * Punto de encuentro de CSV y Excel: los dos formatos llegan aquí como
 * `RawRow[]` y de aquí en adelante se comportan igual.
 */
export function rowsToPreview(rows: RawRow[]): ImportPreview {
  const knownColumns = new Set(Object.keys(COLUMN_ALIASES));
  const seenSlugs = new Set<string>();

  const built = rows.map((raw, index) => {
    // +2: la fila 1 es el encabezado y las hojas de cálculo cuentan desde 1.
    const row = buildRow(raw, index + 2, knownColumns);
    if (row.slug) {
      if (seenSlugs.has(row.slug)) {
        row.errors.push({ key: "duplicateInFile" });
        row.data = null;
      } else {
        seenSlugs.add(row.slug);
      }
    }
    return row;
  });

  return {
    rows: built,
    validCount: built.filter((row) => row.data !== null).length,
    invalidCount: built.filter((row) => row.data === null).length,
  };
}
