-- ===========================================================================
-- 0003 — Row Level Security
-- La privacidad y los permisos viven aquí, no en la UI. Sin policy no hay
-- acceso: todo lo que no esté listado abajo queda denegado.
-- ===========================================================================

alter table public.profiles       enable row level security;
alter table public.coffees        enable row level security;
alter table public.coffee_origins enable row level security;

-- --- profiles --------------------------------------------------------------
-- El equipo se ve entre sí: hace falta para el directorio de /admin/usuarios y,
-- más adelante, para compartir degustaciones con personas concretas.
create policy "perfiles visibles para el equipo"
  on public.profiles for select
  to authenticated
  using (true);

-- El cambio de rol lo frena el trigger prevent_role_escalation, no esta policy.
create policy "edita tu propio perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "admin edita cualquier perfil"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin borra perfiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- Sin policy de INSERT a propósito: el perfil sólo nace del trigger
-- on_auth_user_created, que corre como security definer.

-- --- coffees ---------------------------------------------------------------
create policy "biblioteca visible para el equipo"
  on public.coffees for select
  to authenticated
  using (true);

create policy "editor crea cafés"
  on public.coffees for insert
  to authenticated
  with check (public.is_editor());

create policy "editor edita cafés"
  on public.coffees for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Decisión de producto: el editor importa y edita, pero no borra.
create policy "sólo admin borra cafés"
  on public.coffees for delete
  to authenticated
  using (public.is_admin());

-- --- coffee_origins --------------------------------------------------------
create policy "orígenes visibles para el equipo"
  on public.coffee_origins for select
  to authenticated
  using (true);

create policy "editor crea orígenes"
  on public.coffee_origins for insert
  to authenticated
  with check (
    public.is_editor()
    and exists (select 1 from public.coffees c where c.id = coffee_id)
  );

create policy "editor edita orígenes"
  on public.coffee_origins for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Editor sí borra orígenes: quitar una línea de origen es editar el café, no
-- borrarlo. El candado de "sólo admin borra" vive en public.coffees.
create policy "editor borra orígenes"
  on public.coffee_origins for delete
  to authenticated
  using (public.is_editor());
