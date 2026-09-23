/**
 * Tipos del esquema de Postgres.
 *
 * Escrito a mano para que coincida con supabase/migrations/*.sql, porque el
 * proyecto todavía no está linkeado. En cuanto lo esté, se regenera con:
 *
 *   npm run db:types
 *
 * que lo sobrescribe con la salida de `supabase gen types typescript`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "editor" | "viewer";
export type CoffeeKind = "single_origin" | "blend";
export type RoastLevel = "light" | "medium_light" | "medium" | "medium_dark" | "dark";
export type ProcessMethod = "washed" | "honey" | "natural" | "anaerobic" | "other";

export type CoffeeOrigin = {
  position: number;
  country_code: string;
  region: string | null;
  producer: string | null;
  farm: string | null;
  altitude_masl: number | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  locale: string;
  created_at: string;
  updated_at: string;
};

type CoffeeRow = {
  id: string;
  slug: string;
  name: string;
  kind: CoffeeKind;
  roast: RoastLevel | null;
  process: ProcessMethod | null;
  body: number | null;
  acidity: number | null;
  story: string | null;
  tasting_notes: string[];
  complementary_flavors: string[];
  extra: Json;
  photo_path: string | null;
  source_locale: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CoffeeOriginRow = {
  id: string;
  coffee_id: string;
  position: number;
  country_code: string;
  region: string | null;
  producer: string | null;
  farm: string | null;
  altitude_masl: number | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at" | "role" | "locale"> &
          Partial<Pick<ProfileRow, "role" | "locale">>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      coffees: {
        Row: CoffeeRow;
        Insert: Omit<CoffeeRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<CoffeeRow, "id">>;
        Update: Partial<CoffeeRow>;
        Relationships: [];
      };
      coffee_origins: {
        Row: CoffeeOriginRow;
        Insert: Omit<CoffeeOriginRow, "id"> & Partial<Pick<CoffeeOriginRow, "id">>;
        Update: Partial<CoffeeOriginRow>;
        Relationships: [];
      };
    };
    Views: {
      coffees_with_origins: {
        Row: CoffeeRow & {
          origins: CoffeeOrigin[];
          country_codes: string[];
          origins_search: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_editor: { Args: Record<string, never>; Returns: boolean };
      import_coffees: {
        Args: { payload: Json; mode?: "skip" | "update" };
        Returns: { inserted: number; updated: number; skipped: number };
      };
    };
    Enums: {
      app_role: AppRole;
      coffee_kind: CoffeeKind;
      roast_level: RoastLevel;
      process_method: ProcessMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = ProfileRow;
export type Coffee = CoffeeRow;
export type CoffeeListItem = Database["public"]["Views"]["coffees_with_origins"]["Row"];
