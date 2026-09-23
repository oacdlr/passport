-- ===========================================================================
-- 0004 — Storage: fotos de bolsa de la Biblioteca
-- Bucket privado. Las imágenes se sirven con signed URLs generadas en el
-- servidor, nunca con una URL pública permanente.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coffee-photos',
  'coffee-photos',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "equipo ve fotos de café"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'coffee-photos');

create policy "editor sube fotos de café"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'coffee-photos' and public.is_editor());

create policy "editor reemplaza fotos de café"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'coffee-photos' and public.is_editor())
  with check (bucket_id = 'coffee-photos' and public.is_editor());

create policy "editor borra fotos de café"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'coffee-photos' and public.is_editor());
