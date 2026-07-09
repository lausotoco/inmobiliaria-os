-- ============================================================
--  ACTUALIZACIÓN: función para la página pública de portafolios
--  Ejecutar UNA VEZ en: Supabase → SQL Editor → New query → Run
--
--  Permite que el enlace privado /p/<token> funcione sin login
--  y sin exponer ninguna otra información de tu base.
-- ============================================================

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
          order by pi.orden
        ),
        '[]'::jsonb
      )
      from portafolio_items pi
      join propiedades pr on pr.id = pi.propiedad_id
      where pi.portafolio_id = po.id
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
