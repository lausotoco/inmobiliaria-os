-- ============================================================
-- PASO 3 · ESTATUS DE PROPIEDADES ENVIADAS POR CLIENTE
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- ============================================================

-- 1. Estatus por propiedad enviada
--    enviada · vista · le gustó · no le gustó · descartada
alter table public.portafolio_items
  add column if not exists estatus text not null default 'enviada';

alter table public.portafolio_items
  add column if not exists estatus_updated_at timestamptz;

-- 2. RPC del portafolio público, actualizada:
--    · Excluye las propiedades descartadas (desaparecen del enlace del cliente)
--    · Devuelve el estatus y el consecutivo de cada propiedad
--    · Las "le gustó" van primero (la página las agrupa en
--      "Propiedades con visita agendada")
create or replace function public.portafolio_publico(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  resultado jsonb;
begin
  select jsonb_build_object(
    'id', po.id,
    'titulo', po.titulo,
    'mensaje_personal', po.mensaje_personal,
    'estado', po.estado,
    'cliente_nombre', c.nombre,
    'propiedades', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'consecutivo', pr.consecutivo,
            'estatus', pi.estatus,
            'titulo', pr.titulo,
            'precio', pr.precio,
            'area', pr.area,
            'habitaciones', pr.habitaciones,
            'banos', pr.banos,
            'parqueaderos', pr.parqueaderos,
            'administracion', pr.administracion,
            'estrato', pr.estrato,
            'descripcion', pr.descripcion,
            'amenidades', pr.amenidades,
            'barrio', pr.barrio,
            'ciudad', pr.ciudad,
            'direccion', pr.direccion,
            'url_original', pr.url_original,
            'nota', pi.nota,
            'imagenes', (
              select coalesce(jsonb_agg(im.ruta_storage order by im.orden), '[]'::jsonb)
              from propiedad_imagenes im
              where im.propiedad_id = pr.id
            )
          )
          order by (pi.estatus = 'le gustó') desc, pi.orden
        ),
        '[]'::jsonb
      )
      from portafolio_items pi
      join propiedades pr on pr.id = pi.propiedad_id
      where pi.portafolio_id = po.id
        and pi.estatus is distinct from 'descartada'
    )
  )
  into resultado
  from portafolios po
  join clientes c on c.id = po.cliente_id
  where po.token = p_token;

  -- Marcar como visto cuando el cliente lo abre
  if resultado is not null then
    update portafolios
    set estado = 'visto'
    where token = p_token and estado = 'enviado';
  end if;

  return resultado;
end;
$$;

grant execute on function public.portafolio_publico(text) to anon;
grant execute on function public.portafolio_publico(text) to authenticated;
