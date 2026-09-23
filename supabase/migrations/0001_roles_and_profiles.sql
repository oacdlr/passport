-- ===========================================================================
-- 0001 — Roles del equipo y perfil de usuario
-- ===========================================================================

create type public.app_role as enum ('admin', 'editor', 'viewer');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  role       public.app_role not null default 'viewer',
  locale     text not null default 'es' check (locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Un perfil por usuario de auth.users. El rol vive aquí, no en el JWT.';
comment on column public.profiles.role is
  'admin = todo + gestión de usuarios; editor = crea/edita/importa Biblioteca y Academy; viewer = sólo lectura.';

-- --- helper reutilizable de updated_at -------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --- perfil automático al darse de alta en auth ----------------------------
-- El rol NO se lee de raw_user_meta_data: ese campo lo puede controlar el
-- cliente. Todo usuario nuevo nace 'viewer' y un admin lo promueve después.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- helpers de rol --------------------------------------------------------
-- security definer + search_path vacío: evita la recursión infinita de RLS
-- cuando una policy sobre profiles necesita consultar profiles.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'editor')
  );
$$;

comment on function public.is_editor() is
  'true para admin y editor. Editor importa y edita Biblioteca, pero no borra.';

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_editor() from anon;

-- --- candado anti escalada de privilegios ----------------------------------
-- Deja que la policy de profiles sea un simple "edita tu propio perfil" sin
-- abrir la puerta a que un viewer se ascienda a admin.
create function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    -- Sin JWT = operación de backend de confianza (service role, seed, consola
    -- SQL). El service role key nunca sale del servidor.
    if (select auth.uid()) is null then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'Sólo un admin puede cambiar el rol de un usuario'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
