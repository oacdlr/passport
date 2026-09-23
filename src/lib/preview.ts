/**
 * ⚠️ MODO PREVIEW — ANDAMIO TEMPORAL, BORRAR ANTES DE DESPLEGAR ⚠️
 *
 * Sirve para ver las pantallas sin base de datos: salta el login y devuelve
 * datos de mentira. Existe sólo porque las migraciones todavía no se han
 * ejecutado (ver TODO.md § Bloqueador actual).
 *
 * Doble candado, a propósito:
 *   1. Nunca se activa si NODE_ENV === "production".
 *   2. Además hay que pedirlo explícitamente con PREVIEW_MODE=1.
 *
 * Todo el andamio vive en este archivo. Para quitarlo: borrar `preview.ts` y
 * seguir los errores de compilación — son exactamente los cuatro puntos donde
 * se engancha (proxy, guards, queries de Biblioteca y la página de usuarios).
 */

import type { AppRole, CoffeeListItem, Profile } from "@/types/database";

export function isPreviewMode(): boolean {
  // El build de producción nunca puede entrar aquí, pidan lo que pidan las env.
  if (process.env.NODE_ENV === "production") return false;
  return process.env.PREVIEW_MODE === "1";
}

/** Usuario ficticio. Se le da rol admin para poder ver TODAS las pantallas. */
export const PREVIEW_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "preview@pasaporte.local",
  full_name: "María Preview",
  avatar_url: null,
  role: "admin" as AppRole,
  locale: "es",
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
};

export const PREVIEW_TEAM: Profile[] = [
  PREVIEW_PROFILE,
  {
    ...PREVIEW_PROFILE,
    id: "00000000-0000-0000-0000-000000000001",
    email: "editor@pasaporte.local",
    full_name: "Bruno Editor",
    role: "editor" as AppRole,
  },
  {
    ...PREVIEW_PROFILE,
    id: "00000000-0000-0000-0000-000000000002",
    email: "viewer@pasaporte.local",
    full_name: "Carla Viewer",
    role: "viewer" as AppRole,
  },
];

type Origin = CoffeeListItem["origins"][number];

function origin(
  position: number,
  country_code: string,
  region: string | null = null,
  producer: string | null = null,
  altitude_masl: number | null = null,
): Origin {
  return { position, country_code, region, producer, farm: null, altitude_masl };
}

function coffee(
  index: number,
  slug: string,
  name: string,
  kind: CoffeeListItem["kind"],
  roast: CoffeeListItem["roast"],
  process: CoffeeListItem["process"],
  body: number,
  acidity: number,
  story: string,
  tasting_notes: string[],
  complementary_flavors: string[],
  origins: Origin[],
  extra: Record<string, string> = {},
): CoffeeListItem {
  return {
    id: `0000000a-0000-0000-0000-00000000000${index}`,
    slug,
    name,
    kind,
    roast,
    process,
    body,
    acidity,
    story,
    tasting_notes,
    complementary_flavors,
    extra,
    photo_path: null,
    source_locale: "es",
    created_by: PREVIEW_PROFILE.id,
    created_at: `2026-09-${String(20 - index).padStart(2, "0")}T10:00:00.000Z`,
    updated_at: `2026-09-${String(20 - index).padStart(2, "0")}T10:00:00.000Z`,
    origins,
    country_codes: [...new Set(origins.map((o) => o.country_code))],
    origins_search: origins
      .map((o) => [o.region, o.producer].filter(Boolean).join(" "))
      .join(" "),
  };
}

/** Los seis cafés de los mockups, iguales que supabase/seed.sql. */
export const PREVIEW_COFFEES: CoffeeListItem[] = [
  coffee(
    1, "finca-la-esperanza", "Finca La Esperanza", "single_origin", "medium", "washed", 3, 5,
    "Cultivado por la familia Restrepo a más de 1.700 msnm en Huila. Un café que sorprende por su viveza cítrica y un final achocolatado que se queda largo en el paladar.",
    ["cítrico", "jazmín", "mandarina", "chocolate"],
    ["chocolate 70%", "queso de cabra"],
    [origin(0, "CO", "Huila", "Familia Restrepo", 1750)],
    { variedad: "Caturra", lote: "2026-04" },
  ),
  coffee(
    2, "yirgacheffe-kochere", "Yirgacheffe Kochere", "single_origin", "light", "washed", 2, 5,
    "Clásico de Yirgacheffe: floral, delicado y de acidez alta. Ideal en métodos de filtrado.",
    ["flor de azahar", "bergamota", "durazno"],
    ["tarta de limón"],
    [origin(0, "ET", "Kochere", null, 2000)],
    { altura: "1900-2100 msnm" },
  ),
  coffee(
    3, "casa-blend-no-4", "Casa Blend No. 4", "blend", "medium_dark", "natural", 4, 2,
    "Nuestra mezcla de casa para espresso. Cuerpo alto y dulzor de caramelo que aguanta bien la leche.",
    ["nuez", "caramelo", "cacao"],
    ["leche entera", "croissant"],
    [origin(0, "BR", "Cerrado"), origin(1, "GT", "Antigua")],
    { uso: "espresso" },
  ),
  coffee(
    4, "cerro-azul", "Cerro Azul", "single_origin", "light", "honey", 2, 3,
    "Proceso honey de Cajamarca. Dulce, limpio y con una acidez suave tipo manzana.",
    ["manzana verde", "miel", "almendra"],
    ["galleta de mantequilla"],
    [origin(0, "PE", "Cajamarca", null, 1800)],
  ),
  coffee(
    5, "volcan-rojo", "Volcán Rojo", "single_origin", "medium", "natural", 4, 3,
    "De la región de Antigua, en suelo volcánico. Cuerpo denso y notas de fruta madura.",
    ["fresa", "panela", "cacao"],
    ["chocolate con leche"],
    [origin(0, "GT", "Antigua", null, 1600)],
    { variedad: "Bourbon" },
  ),
  coffee(
    6, "mezcla-otono", "Mezcla Otoño", "blend", "medium", "washed", 3, 4,
    "Mezcla de temporada: la estructura de Colombia con el perfil floral de Etiopía.",
    ["durazno", "caramelo", "flores"],
    ["pan de plátano"],
    [origin(0, "ET"), origin(1, "CO")],
    { temporada: "otoño 2026" },
  ),
];
