import { z } from "zod";

export const COFFEE_KINDS = ["single_origin", "blend"] as const;
export const ROAST_LEVELS = ["light", "medium_light", "medium", "medium_dark", "dark"] as const;
export const PROCESS_METHODS = ["washed", "honey", "natural", "anaerobic", "other"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null);

const scale = z
  .union([z.coerce.number().int().min(1).max(5), z.literal("")])
  .transform((value) => (value === "" ? null : (value as number)))
  .nullable()
  .default(null);

export const originSchema = z.object({
  country_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "country_code debe ser ISO 3166-1 alpha-2")
    .transform((value) => value.toUpperCase()),
  region: optionalText(120),
  producer: optionalText(120),
  farm: optionalText(120),
  altitude_masl: z
    .union([z.coerce.number().int().min(0).max(4000), z.literal("")])
    .transform((value) => (value === "" ? null : (value as number)))
    .nullable()
    .default(null),
});

export const coffeeInputSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(160),
    kind: z.enum(COFFEE_KINDS),
    roast: z.enum(ROAST_LEVELS).nullable().default(null),
    process: z.enum(PROCESS_METHODS).nullable().default(null),
    body: scale,
    acidity: scale,
    story: optionalText(8000),
    tasting_notes: z.array(z.string().trim().min(1)).max(40).default([]),
    complementary_flavors: z.array(z.string().trim().min(1)).max(40).default([]),
    extra: z.record(z.string(), z.string()).default({}),
    origins: z.array(originSchema).min(1, "noCountry").max(12),
  })
  .refine((value) => value.kind === "blend" || value.origins.length === 1, {
    message: "singleOriginOneCountry",
    path: ["origins"],
  });

export type CoffeeInput = z.infer<typeof coffeeInputSchema>;
export type OriginInput = z.infer<typeof originSchema>;

/**
 * Lee el formulario de café desde un FormData. Los orígenes llegan como campos
 * indexados (origins.0.country_code, origins.1.region, …) porque así el form
 * funciona con Server Actions sin serializar JSON a mano.
 */
export function coffeeInputFromFormData(formData: FormData) {
  const originIndexes = new Set<number>();
  for (const key of formData.keys()) {
    const match = /^origins\.(\d+)\./.exec(key);
    if (match) originIndexes.add(Number(match[1]));
  }

  const origins = [...originIndexes]
    .sort((a, b) => a - b)
    .map((i) => ({
      country_code: String(formData.get(`origins.${i}.country_code`) ?? ""),
      region: String(formData.get(`origins.${i}.region`) ?? ""),
      producer: String(formData.get(`origins.${i}.producer`) ?? ""),
      farm: String(formData.get(`origins.${i}.farm`) ?? ""),
      altitude_masl: String(formData.get(`origins.${i}.altitude_masl`) ?? ""),
    }))
    .filter((origin) => origin.country_code !== "");

  const extraKeys = formData.getAll("extra.key").map(String);
  const extraValues = formData.getAll("extra.value").map(String);
  const extra: Record<string, string> = {};
  extraKeys.forEach((key, i) => {
    const trimmed = key.trim();
    if (trimmed) extra[trimmed] = (extraValues[i] ?? "").trim();
  });

  return coffeeInputSchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind") ?? "single_origin",
    roast: formData.get("roast") || null,
    process: formData.get("process") || null,
    body: formData.get("body") ?? "",
    acidity: formData.get("acidity") ?? "",
    story: formData.get("story") ?? "",
    tasting_notes: formData.getAll("tasting_notes").map(String).filter(Boolean),
    complementary_flavors: formData.getAll("complementary_flavors").map(String).filter(Boolean),
    extra,
    origins,
  });
}
