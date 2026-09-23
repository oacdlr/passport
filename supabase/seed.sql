-- ===========================================================================
-- Seed de Biblioteca: los cafés que aparecen en design/biblioteca.png.
-- Sirve para que la app no arranque vacía y para probar filtros y búsqueda.
--
-- No crea usuarios: ésos nacen de una invitación real desde /admin/usuarios.
-- created_by queda en NULL, que es válido (on delete set null).
-- ===========================================================================

with nuevos as (
  insert into public.coffees
    (slug, name, kind, roast, process, body, acidity, story, tasting_notes, complementary_flavors, extra)
  values
    (
      'finca-la-esperanza', 'Finca La Esperanza', 'single_origin', 'medium', 'washed', 3, 5,
      'Cultivado por la familia Restrepo a más de 1.700 msnm en Huila. Un café que sorprende por su viveza cítrica y un final achocolatado que se queda largo en el paladar.',
      array['cítrico', 'jazmín', 'mandarina', 'chocolate'],
      array['chocolate 70%', 'queso de cabra'],
      '{"variedad": "Caturra", "lote": "2026-04"}'::jsonb
    ),
    (
      'yirgacheffe-kochere', 'Yirgacheffe Kochere', 'single_origin', 'light', 'washed', 2, 5,
      'Clásico de Yirgacheffe: floral, delicado y de acidez alta. Ideal en métodos de filtrado.',
      array['flor de azahar', 'bergamota', 'durazno'],
      array['tarta de limón'],
      '{"altura": "1900-2100 msnm"}'::jsonb
    ),
    (
      'casa-blend-no-4', 'Casa Blend No. 4', 'blend', 'medium_dark', 'natural', 4, 2,
      'Nuestra mezcla de casa para espresso. Cuerpo alto y dulzor de caramelo que aguanta bien la leche.',
      array['nuez', 'caramelo', 'cacao'],
      array['leche entera', 'croissant'],
      '{"uso": "espresso"}'::jsonb
    ),
    (
      'cerro-azul', 'Cerro Azul', 'single_origin', 'light', 'honey', 2, 3,
      'Proceso honey de Cajamarca. Dulce, limpio y con una acidez suave tipo manzana.',
      array['manzana verde', 'miel', 'almendra'],
      array['galleta de mantequilla'],
      '{}'::jsonb
    ),
    (
      'volcan-rojo', 'Volcán Rojo', 'single_origin', 'medium', 'natural', 4, 3,
      'De la región de Antigua, en suelo volcánico. Cuerpo denso y notas de fruta madura.',
      array['fresa', 'panela', 'cacao'],
      array['chocolate con leche'],
      '{"variedad": "Bourbon"}'::jsonb
    ),
    (
      'mezcla-otono', 'Mezcla Otoño', 'blend', 'medium', 'washed', 3, 4,
      'Mezcla de temporada: la estructura de Colombia con el perfil floral de Etiopía.',
      array['durazno', 'caramelo', 'flores'],
      array['pan de plátano'],
      '{"temporada": "otoño 2026"}'::jsonb
    )
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.coffee_origins (coffee_id, position, country_code, region, producer, altitude_masl)
select n.id, o.position, o.country_code, o.region, o.producer, o.altitude_masl
from nuevos n
join (
  values
    ('finca-la-esperanza', 0::smallint, 'CO', 'Huila',    'Familia Restrepo', 1750),
    ('yirgacheffe-kochere', 0::smallint, 'ET', 'Kochere', null,               2000),
    ('casa-blend-no-4',    0::smallint, 'BR', 'Cerrado',  null,               null),
    ('casa-blend-no-4',    1::smallint, 'GT', 'Antigua',  null,               null),
    ('cerro-azul',         0::smallint, 'PE', 'Cajamarca', null,              1800),
    ('volcan-rojo',        0::smallint, 'GT', 'Antigua',  null,               1600),
    ('mezcla-otono',       0::smallint, 'ET', null,        null,              null),
    ('mezcla-otono',       1::smallint, 'CO', null,        null,              null)
) as o (slug, position, country_code, region, producer, altitude_masl)
  on o.slug = n.slug;
