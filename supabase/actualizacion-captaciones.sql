-- ============================================================
--  ACTUALIZACIÓN: MÓDULO CAPTACIONES + PORTAL PÚBLICO /inmuebles
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Es seguro correrlo más de una vez.
--
--  1. Columnas nuevas en propiedades
--  2. Slug automático al marcar una propiedad como captación
--  3. RPC captaciones_publicas()  → catálogo público
--  4. RPC captacion_publica(slug) → ficha pública individual
--  Nunca se exponen: url_original, asesor, inmobiliaria,
--  teléfono del propietario ni dirección exacta.
-- ============================================================

-- 1 · Columnas nuevas
alter table public.propiedades
  add column if not exists es_captacion boolean not null default false,
  add column if not exists publicada_web boolean not null default false,
  add column if not exists destacada boolean not null default false,
  add column if not exists slug text,
  add column if not exists descripcion_publica text;

create unique index if not exists propiedades_slug_unico
  on public.propiedades (slug)
  where slug is not null;

-- 2 · Slug automático (ej: "apartamento-en-chia-sab-011")
create or replace function public.slug_limpio(t text)
returns text
language sql immutable
as $$
  select trim(both '-' from
    regexp_replace(
      lower(translate(coalesce(t, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

create or replace function public.asignar_slug_captacion()
returns trigger
language plpgsql
as $$
begin
  if new.es_captacion and (new.slug is null or new.slug = '') then
    new.slug :=
      coalesce(nullif(public.slug_limpio(new.titulo), ''), 'inmueble')
      || '-' ||
      coalesce('sab-' || lpad(new.consecutivo::text, 3, '0'),
               substr(new.id::text, 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_slug_captacion on public.propiedades;
create trigger trigger_slug_captacion
  before insert or update of es_captacion, titulo
  on public.propiedades
  for each row
  execute function public.asignar_slug_captacion();

-- Generar slug retroactivo para captaciones ya marcadas sin slug
update public.propiedades
set slug =
  coalesce(nullif(public.slug_limpio(titulo), ''), 'inmueble')
  || '-' ||
  coalesce('sab-' || lpad(consecutivo::text, 3, '0'), substr(id::text, 1, 8))
where es_captacion and (slug is null or slug = '');

-- 3 · Catálogo público (solo captaciones publicadas y disponibles)
create or replace function public.captaciones_publicas()
returns jsonb
language sql security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', p.slug,
        'titulo', p.titulo,
        'precio', p.precio,
        'area', p.area,
        'habitaciones', p.habitaciones,
        'banos', p.banos,
        'parqueaderos', p.parqueaderos,
        'estrato', p.estrato,
        'barrio', p.barrio,
        'ciudad', p.ciudad,
        'destacada', p.destacada,
        'imagen', (
          select im.ruta_storage
          from propiedad_imagenes im
          where im.propiedad_id = p.id
          order by im.orden
          limit 1
        )
      )
      order by p.destacada desc, p.updated_at desc
    ),
    '[]'::jsonb
  )
  from propiedades p
  where p.es_captacion
    and p.publicada_web
    and p.estado = 'disponible'
    and p.slug is not null;
$$;

-- 4 · Ficha pública individual (por slug)
create or replace function public.captacion_publica(p_slug text)
returns jsonb
language sql security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'titulo', p.titulo,
    'precio', p.precio,
    'area', p.area,
    'habitaciones', p.habitaciones,
    'banos', p.banos,
    'parqueaderos', p.parqueaderos,
    'administracion', p.administracion,
    'estrato', p.estrato,
    'descripcion', coalesce(p.descripcion_publica, p.descripcion),
    'amenidades', p.amenidades,
    'barrio', p.barrio,
    'ciudad', p.ciudad,
    'lat', p.lat,
    'lng', p.lng,
    'estado', p.estado,
    'imagenes', (
      select coalesce(jsonb_agg(im.ruta_storage order by im.orden), '[]'::jsonb)
      from propiedad_imagenes im
      where im.propiedad_id = p.id
    )
  )
  from propiedades p
  where p.slug = p_slug
    and p.es_captacion
    and p.publicada_web;
$$;

grant execute on function public.captaciones_publicas() to anon, authenticated;
grant execute on function public.captacion_publica(text) to anon, authenticated;
