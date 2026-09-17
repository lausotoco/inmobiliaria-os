-- ============================================================
--  SQL 12 · LO QUE EL BROKER NECESITA PARA DECIDIR
--  Pegar completo en Supabase → SQL Editor → New query → Run.
--  Seguro de correr más de una vez. Solo agrega columnas y
--  actualiza funciones de lectura. No borra datos.
-- ============================================================

-- ── 1. Datos del inmueble captado que el broker necesita ver ──
alter table public.propiedades
  add column if not exists fotos_brokers_rutas text[],       -- hasta 3 fotos visibles sin asociación
  add column if not exists precio_negociable boolean not null default false,
  add column if not exists margen_negociacion text,          -- "hasta $30M", "5%"
  add column if not exists acepta_permuta boolean not null default false,
  add column if not exists acepta_credito boolean not null default true,
  add column if not exists acepta_subsidio boolean not null default false,
  add column if not exists libre_gravamenes boolean not null default false,
  add column if not exists nota_juridica text,               -- "escritura al día, sin embargos"
  add column if not exists ocupacion text,                   -- habitada · desocupada · arrendada
  add column if not exists entrega text,                     -- inmediata · 30 días · a convenir
  add column if not exists anio_construccion int,
  add column if not exists descripcion_brokers text;         -- descripción sin identificar el conjunto

-- La foto única que ya habías elegido pasa a la lista de hasta 3
update public.propiedades
set fotos_brokers_rutas = array[foto_brokers_ruta]
where foto_brokers_ruta is not null
  and (fotos_brokers_rutas is null or cardinality(fotos_brokers_rutas) = 0);

-- ── 2. Inmuebles de KYRELO para agentes: ficha completa ──
create or replace function public.inmuebles_kyrelo()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select
      p.id, p.consecutivo, p.titulo, p.tipo, p.ciudad as municipio, p.sector,
      p.area, p.area_lote, p.habitaciones, p.banos, p.parqueaderos, p.estrato,
      p.precio, p.administracion, p.pct_comparte, p.tiene_exclusividad,
      coalesce(p.comision_pct, 3) as comision_pct,
      p.precio_negociable, p.margen_negociacion, p.acepta_permuta, p.acepta_credito,
      p.acepta_subsidio, p.libre_gravamenes, p.nota_juridica, p.ocupacion, p.entrega,
      p.anio_construccion, p.amenidades,
      coalesce(p.descripcion_brokers, p.descripcion_publica) as descripcion_brokers,
      p.descripcion_publica,
      -- Hasta 3 fotos SIEMPRE visibles (las que Laura eligió: interior o detalle)
      coalesce(
        (select jsonb_agg(f) from (
           select unnest(coalesce(p.fotos_brokers_rutas, array[]::text[])) as f limit 3
         ) x),
        '[]'::jsonb
      ) as fotos_preview,
      a.id as asociacion_id, a.estado as asociacion_estado, a.fecha_vence,
      (a.estado = 'aceptada' and (a.fecha_vence is null or a.fecha_vence > now())) as acceso_completo,
      case when a.estado = 'aceptada' and (a.fecha_vence is null or a.fecha_vence > now()) then p.direccion end as direccion,
      case when a.estado = 'aceptada' and (a.fecha_vence is null or a.fecha_vence > now()) then p.conjunto end as conjunto,
      case when a.estado = 'aceptada' and (a.fecha_vence is null or a.fecha_vence > now()) then p.kit_url end as kit_url,
      case when a.estado = 'aceptada' and (a.fecha_vence is null or a.fecha_vence > now()) then (
        select coalesce(jsonb_agg(im.ruta_storage order by im.orden), '[]'::jsonb)
        from propiedad_imagenes im where im.propiedad_id = p.id
      ) else '[]'::jsonb end as imagenes
    from propiedades p
    left join lateral (
      select * from asociaciones a
      where a.propiedad_id = p.id and a.agente_id = auth.uid()
      order by a.created_at desc
      limit 1
    ) a on true
    where p.es_captacion
      and p.publicada_brokers
      and p.tiene_mandato
      and p.estado_captacion not in ('vendido', 'retirado')
      and exists (
        select 1 from profiles pf
        where pf.id = auth.uid() and coalesce(pf.estado_agente, 'activo') <> 'suspendido'
      )
    order by p.updated_at desc
  ) t;
$$;
revoke execute on function public.inmuebles_kyrelo() from anon;
grant execute on function public.inmuebles_kyrelo() to authenticated;

-- ── 3. Requerimientos: sale el plazo y la nota para el broker,
--       y dejan de publicarse las observaciones internas ──
drop function if exists public.marketplace_publico();

create function public.marketplace_publico()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select
      r.id, r.codigo, r.tipo_inmueble as tipo, r.habitaciones as alcobas,
      r.banos, r.parqueaderos, r.area_min, r.area_max, r.ciudad, r.barrio,
      r.zonas, r.presupuesto_min, r.presupuesto_max, r.amenidades,
      r.financiacion, r.plazo, r.urgencia, r.preferencias, r.nota_broker, r.updated_at,
      s.publicado_en,
      30 - (current_date - s.publicado_en::date) as dias_restantes,
      cal.banda
    from requerimientos r
    join requerimiento_shares s on s.requerimiento_id = r.id and s.publicado = true
    join lateral (
      select coalesce(c.banda_final, c.banda_calculada) as banda
      from calificaciones c
      where c.cliente_id = r.cliente_id
      order by c.updated_at desc nulls last
      limit 1
    ) cal on cal.banda = 'A'
    where (r.estado is null or lower(r.estado) not in ('cerrado', 'descartado', 'cancelado', 'perdido'))
    order by r.updated_at desc
    limit 100
  ) t;
$$;
grant execute on function public.marketplace_publico() to anon;
grant execute on function public.marketplace_publico() to authenticated;

create or replace function public.marketplace_buscar_v2(
  p_alcobas int default null,
  p_banos int default null,
  p_zona text default null,
  p_precio_max numeric default null
)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select
      r.id, r.codigo, r.tipo_inmueble as tipo, r.habitaciones as alcobas,
      r.banos, r.parqueaderos, r.area_min, r.area_max, r.ciudad, r.barrio,
      r.zonas, r.presupuesto_min, r.presupuesto_max, r.amenidades,
      r.financiacion, r.plazo, r.urgencia, r.preferencias, r.nota_broker, r.updated_at,
      s.publicado_en,
      30 - (current_date - s.publicado_en::date) as dias_restantes,
      cal.banda
    from requerimientos r
    join requerimiento_shares s on s.requerimiento_id = r.id and s.publicado = true
    join lateral (
      select coalesce(c.banda_final, c.banda_calculada) as banda
      from calificaciones c
      where c.cliente_id = r.cliente_id
      order by c.updated_at desc nulls last
      limit 1
    ) cal on cal.banda = 'A'
    where (r.estado is null or lower(r.estado) not in ('cerrado', 'descartado', 'cancelado', 'perdido'))
      and exists (
        select 1 from profiles p
        where p.id = auth.uid() and coalesce(p.estado_agente, 'activo') <> 'suspendido'
      )
      and (p_alcobas is null or r.habitaciones is null or r.habitaciones <= p_alcobas)
      and (p_banos is null or r.banos is null or r.banos <= p_banos)
      and (p_precio_max is null or r.presupuesto_max is null or r.presupuesto_max >= p_precio_max)
      and (
        p_zona is null or p_zona = ''
        or r.ciudad ilike '%' || p_zona || '%'
        or exists (select 1 from unnest(coalesce(r.zonas, '{}')) z where z ilike '%' || p_zona || '%')
      )
    order by r.updated_at desc
    limit 100
  ) t;
$$;
revoke execute on function public.marketplace_buscar_v2(int, int, text, numeric) from anon;
grant execute on function public.marketplace_buscar_v2(int, int, text, numeric) to authenticated;
