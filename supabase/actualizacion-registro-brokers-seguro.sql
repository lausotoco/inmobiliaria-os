-- ============================================================
--  REGISTRO DE BROKERS SEGURO (correr antes de abrir registros masivos)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--
--  Hoy todo usuario nuevo nace con rol 'owner' (interno) y depende de
--  que un paso posterior lo cambie a 'broker'. Si ese paso falla, el
--  broker entraría a tu zona privada. Con esto, todo usuario nuevo nace
--  como broker y su perfil queda completo desde el registro.
-- ============================================================

alter table public.profiles alter column rol set default 'broker';

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, organization_id, email, rol, nombre, empresa, telefono)
  values (
    new.id,
    '00000000-0000-0000-0000-000000000001',
    new.email,
    'broker',   -- nunca se toma del registro: solo tú cambias un rol a 'owner'
    nullif(new.raw_user_meta_data->>'nombre', ''),
    nullif(new.raw_user_meta_data->>'empresa', ''),
    nullif(new.raw_user_meta_data->>'telefono', '')
  )
  on conflict (id) do update
    set nombre   = coalesce(public.profiles.nombre, excluded.nombre),
        empresa  = coalesce(public.profiles.empresa, excluded.empresa),
        telefono = coalesce(public.profiles.telefono, excluded.telefono);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- REVISIÓN (devuelve una tabla corta; toma captura):
-- quiénes son internos hoy. Solo debería salir tu equipo.
-- ------------------------------------------------------------
select email, rol, nombre, created_at
from public.profiles
where rol <> 'broker'
order by created_at;

-- Si en la lista aparece alguien que NO es de tu equipo, conviértelo en broker:
-- update public.profiles set rol = 'broker' where email = 'correo@ejemplo.com';
