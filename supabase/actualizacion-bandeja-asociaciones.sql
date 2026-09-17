-- ============================================================
--  BANDEJA DE ASOCIACIONES (para tu página /asociaciones)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--  Solo crea una función de lectura para el equipo interno.
-- ============================================================
create or replace function public.asociaciones_admin()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
    select
      a.*,
      jsonb_build_object(
        'id', p.id, 'consecutivo', p.consecutivo, 'titulo', p.titulo,
        'ciudad', p.ciudad, 'precio', p.precio, 'pct_comparte', p.pct_comparte
      ) as propiedad,
      jsonb_build_object(
        'nombre', pf.nombre, 'email', pf.email, 'telefono', pf.telefono,
        'empresa', pf.empresa, 'cierres', pf.cierres, 'estado_agente', pf.estado_agente
      ) as agente
    from asociaciones a
    join propiedades p on p.id = a.propiedad_id
    join profiles pf on pf.id = a.agente_id
    where public.es_equipo_interno() and a.organization_id = public.current_org()
  ) t;
$$;

revoke execute on function public.asociaciones_admin() from anon;
grant execute on function public.asociaciones_admin() to authenticated;
