-- ============================================================
--  SQL 13 · INMUEBLES DE KYRELO VISIBLES SIN CUENTA
--  Pegar completo en Supabase → SQL Editor → New query → Run.
--  Seguro de correr más de una vez.
--
--  Devuelve la MISMA tarjeta anónima que ve un agente sin asociación:
--  municipio, sector amplio, áreas, precio, comisión, condiciones y
--  hasta 3 fotos de interior. NUNCA dirección, conjunto, kit de venta
--  ni la galería completa: eso sigue detrás de la asociación aceptada.
-- ============================================================
create or replace function public.inmuebles_kyrelo_publico()
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
      p.acepta_subsidio, p.libre_gravamenes, p.ocupacion, p.entrega,
      p.anio_construccion, p.amenidades,
      coalesce(p.descripcion_brokers, p.descripcion_publica) as descripcion_brokers,
      coalesce(
        (select jsonb_agg(f) from (
           select unnest(coalesce(p.fotos_brokers_rutas, array[]::text[])) as f limit 3
         ) x),
        '[]'::jsonb
      ) as fotos_preview
    from propiedades p
    where p.es_captacion
      and p.publicada_brokers
      and p.tiene_mandato
      and p.estado_captacion not in ('vendido', 'retirado')
    order by p.updated_at desc
    limit 24
  ) t;
$$;

grant execute on function public.inmuebles_kyrelo_publico() to anon;
grant execute on function public.inmuebles_kyrelo_publico() to authenticated;
