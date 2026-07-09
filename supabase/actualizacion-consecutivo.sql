-- ============================================================
-- PASO 1 · CÓDIGO CONSECUTIVO AUTOMÁTICO DE PROPIEDADES
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- ============================================================

-- 1. Nueva columna (el código del portal en "codigo" no se toca)
alter table public.propiedades
  add column if not exists consecutivo int;

-- 2. Numerar retroactivamente las propiedades existentes
--    (por organización, en orden de creación: la más antigua = 1)
with numeradas as (
  select id,
         row_number() over (
           partition by organization_id
           order by created_at asc
         ) as rn
  from public.propiedades
  where consecutivo is null
)
update public.propiedades p
set consecutivo = n.rn + coalesce(
  (select max(consecutivo) from public.propiedades m
   where m.organization_id = p.organization_id
     and m.consecutivo is not null), 0)
from numeradas n
where n.id = p.id;

-- 3. Función que asigna el siguiente número al crear una propiedad
create or replace function public.asignar_consecutivo_propiedad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.consecutivo is null then
    select coalesce(max(consecutivo), 0) + 1
      into new.consecutivo
      from public.propiedades
     where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

-- 4. Trigger (se recrea limpio si ya existía)
drop trigger if exists trg_consecutivo_propiedad on public.propiedades;
create trigger trg_consecutivo_propiedad
  before insert on public.propiedades
  for each row
  execute function public.asignar_consecutivo_propiedad();

-- 5. Índice único: garantiza que nunca haya dos propiedades
--    con el mismo número dentro de la misma organización
create unique index if not exists propiedades_org_consecutivo_uidx
  on public.propiedades (organization_id, consecutivo);
