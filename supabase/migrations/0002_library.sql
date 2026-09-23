-- ===========================================================================
-- 0002 — Biblioteca: catálogo de cafés del equipo
-- ===========================================================================

create extension if not exists pg_trgm;

create type public.coffee_kind    as enum ('single_origin', 'blend');
create type public.roast_level    as enum ('light', 'medium_light', 'medium', 'medium_dark', 'dark');
create type public.process_method as enum ('washed', 'honey', 'natural', 'anaerobic', 'other');

create table public.coffees (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null check (length(trim(name)) > 0),
  kind          public.coffee_kind not null,
  roast         public.roast_level,
  process       public.process_method,
  body          smallint check (body between 1 and 5),
  acidity       smallint check (acidity between 1 and 5),
  story         text,
  tasting_notes         text[] not null default '{}',
  complementary_flavors text[] not null default '{}',
  extra         jsonb not null default '{}',
  photo_path    text,
  source_locale text not null default 'es' check (source_locale in ('es', 'en')),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.coffees.body is
  'Escala 1–5 compartida con Degustación: tarjeta la pinta en puntos, la cata en slider.';
comment on column public.coffees.extra is
  'Campo abierto del spec. También absorbe columnas desconocidas de un import CSV en vez de descartarlas.';
comment on column public.coffees.photo_path is
  'Key del objeto en el bucket coffee-photos, no una URL: las URLs se firman al renderizar.';
comment on column public.coffees.source_locale is
  'Idioma en que se escribió el contenido. Lo consumirá la traducción automática (milestone 4).';

create trigger coffees_set_updated_at
  before update on public.coffees
  for each row execute function public.set_updated_at();

-- Un café single origin tiene un origen; una mezcla, varios.
create table public.coffee_origins (
  id            uuid primary key default gen_random_uuid(),
  coffee_id     uuid not null references public.coffees (id) on delete cascade,
  position      smallint not null default 0,
  country_code  char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  region        text,
  producer      text,
  farm          text,
  altitude_masl integer check (altitude_masl between 0 and 4000),
  unique (coffee_id, position)
);

comment on column public.coffee_origins.country_code is
  'ISO 3166-1 alpha-2. Guardar el código y no el nombre hace que el país se traduzca ES/EN con Intl.DisplayNames, sin pasar por el LLM.';

create index coffees_name_trgm_idx      on public.coffees using gin (name gin_trgm_ops);
create index coffees_kind_idx           on public.coffees (kind);
create index coffees_roast_idx          on public.coffees (roast);
create index coffees_process_idx        on public.coffees (process);
create index coffees_created_at_idx     on public.coffees (created_at desc);
create index coffee_origins_coffee_idx  on public.coffee_origins (coffee_id);
create index coffee_origins_country_idx on public.coffee_origins (country_code);

-- --- vista de listado ------------------------------------------------------
-- security_invoker: sin esto la vista correría con los permisos de su dueño y
-- saltaría la RLS de las tablas de abajo.
create view public.coffees_with_origins with (security_invoker = true) as
select
  c.*,
  coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'position', o.position,
                 'country_code', o.country_code,
                 'region', o.region,
                 'producer', o.producer,
                 'farm', o.farm,
                 'altitude_masl', o.altitude_masl
               )
               order by o.position
             )
      from public.coffee_origins o
      where o.coffee_id = c.id
    ),
    '[]'::jsonb
  ) as origins,
  coalesce(
    (
      select array_agg(distinct o.country_code)
      from public.coffee_origins o
      where o.coffee_id = c.id
    ),
    '{}'::text[]
  ) as country_codes,
  -- Texto plano de regiones/productores/fincas para buscar con ILIKE.
  coalesce(
    (
      select string_agg(
               concat_ws(' ', o.region, o.producer, o.farm), ' '
             )
      from public.coffee_origins o
      where o.coffee_id = c.id
    ),
    ''
  ) as origins_search
from public.coffees c;

comment on view public.coffees_with_origins is
  'Listado de Biblioteca en una sola query: agrega los orígenes y evita el N+1 del grid de tarjetas.';
