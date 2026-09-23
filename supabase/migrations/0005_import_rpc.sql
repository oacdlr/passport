-- ===========================================================================
-- 0005 — Import masivo de Biblioteca
-- El cliente JS de Supabase no puede envolver N inserts de coffees +
-- coffee_origins en una transacción. Con esta función el lote entra completo
-- o no entra: si la fila 180 falla, no quedan 179 cafés a medias.
--
-- security invoker (el default de plpgsql, explícito aquí por ser el punto):
-- corre bajo las policies de quien llama, así que un viewer que invoque la RPC
-- a mano sigue rebotando contra la RLS.
-- ===========================================================================

create function public.import_coffees(payload jsonb, mode text default 'skip')
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_data    jsonb;
  origin_data jsonb;
  existing_id uuid;
  target_id   uuid;
  idx         smallint;
  inserted    integer := 0;
  updated     integer := 0;
  skipped     integer := 0;
begin
  if mode not in ('skip', 'update') then
    raise exception 'mode debe ser "skip" o "update", llegó "%"', mode
      using errcode = '22023';
  end if;

  if jsonb_typeof(payload) <> 'array' then
    raise exception 'payload debe ser un array JSON' using errcode = '22023';
  end if;

  for row_data in select * from jsonb_array_elements(payload) loop
    select c.id into existing_id
    from public.coffees c
    where c.slug = row_data ->> 'slug';

    if existing_id is not null and mode = 'skip' then
      skipped := skipped + 1;
      continue;
    end if;

    if existing_id is not null then
      update public.coffees set
        name                  = row_data ->> 'name',
        kind                  = (row_data ->> 'kind')::public.coffee_kind,
        roast                 = nullif(row_data ->> 'roast', '')::public.roast_level,
        process               = nullif(row_data ->> 'process', '')::public.process_method,
        body                  = nullif(row_data ->> 'body', '')::smallint,
        acidity               = nullif(row_data ->> 'acidity', '')::smallint,
        story                 = nullif(row_data ->> 'story', ''),
        tasting_notes         = coalesce(
                                  (select array_agg(value::text)
                                   from jsonb_array_elements_text(row_data -> 'tasting_notes') as value),
                                  '{}'::text[]),
        complementary_flavors = coalesce(
                                  (select array_agg(value::text)
                                   from jsonb_array_elements_text(row_data -> 'complementary_flavors') as value),
                                  '{}'::text[]),
        extra                 = coalesce(row_data -> 'extra', '{}'::jsonb)
      where id = existing_id;

      -- Los orígenes se reemplazan enteros: es más simple y más predecible que
      -- intentar casar líneas entre el CSV y lo que ya había.
      delete from public.coffee_origins where coffee_id = existing_id;

      target_id := existing_id;
      updated := updated + 1;
    else
      insert into public.coffees (
        slug, name, kind, roast, process, body, acidity, story,
        tasting_notes, complementary_flavors, extra, source_locale, created_by
      )
      values (
        row_data ->> 'slug',
        row_data ->> 'name',
        (row_data ->> 'kind')::public.coffee_kind,
        nullif(row_data ->> 'roast', '')::public.roast_level,
        nullif(row_data ->> 'process', '')::public.process_method,
        nullif(row_data ->> 'body', '')::smallint,
        nullif(row_data ->> 'acidity', '')::smallint,
        nullif(row_data ->> 'story', ''),
        coalesce((select array_agg(value::text)
                  from jsonb_array_elements_text(row_data -> 'tasting_notes') as value), '{}'::text[]),
        coalesce((select array_agg(value::text)
                  from jsonb_array_elements_text(row_data -> 'complementary_flavors') as value), '{}'::text[]),
        coalesce(row_data -> 'extra', '{}'::jsonb),
        coalesce(nullif(row_data ->> 'source_locale', ''), 'es'),
        (select auth.uid())
      )
      returning id into target_id;

      inserted := inserted + 1;
    end if;

    idx := 0;
    for origin_data in
      select * from jsonb_array_elements(coalesce(row_data -> 'origins', '[]'::jsonb))
    loop
      insert into public.coffee_origins (
        coffee_id, position, country_code, region, producer, farm, altitude_masl
      )
      values (
        target_id,
        idx,
        upper(origin_data ->> 'country_code'),
        nullif(origin_data ->> 'region', ''),
        nullif(origin_data ->> 'producer', ''),
        nullif(origin_data ->> 'farm', ''),
        nullif(origin_data ->> 'altitude_masl', '')::integer
      );
      idx := idx + 1;
    end loop;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped);
end;
$$;

revoke execute on function public.import_coffees(jsonb, text) from anon;
grant execute on function public.import_coffees(jsonb, text) to authenticated;
