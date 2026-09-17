-- ============================================================
--  REACCIONES DEL COMPRADOR EN EL PORTAFOLIO (ticket 1)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--  Es seguro correrlo más de una vez. No borra nada.
-- ============================================================

-- 1. Tres columnas nuevas en la tabla que ya guarda los inmuebles
--    enviados a cada cliente (portafolio_items).
alter table public.portafolio_items
  add column if not exists reaccion text
    check (reaccion in ('interesa', 'no_interesa'));

alter table public.portafolio_items
  add column if not exists reaccion_motivo text
    check (reaccion_motivo in ('precio', 'zona', 'tamano', 'estado', 'distribucion'));

alter table public.portafolio_items
  add column if not exists reaccion_at timestamptz;

-- 2. Función segura: guarda la reacción sin login. Solo funciona con el
--    enlace (token) correcto y solo sobre inmuebles de ese portafolio.
create or replace function public.reaccionar_portafolio(
  p_token text,
  p_propiedad_id uuid,
  p_interesa boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_portafolio_id uuid;
  v_motivo text;
begin
  select id into v_portafolio_id from portafolios where token = p_token;
  if v_portafolio_id is null then
    raise exception 'Portafolio no encontrado';
  end if;

  v_motivo := case when p_interesa then null else p_motivo end;
  if v_motivo is not null
     and v_motivo not in ('precio', 'zona', 'tamano', 'estado', 'distribucion') then
    raise exception 'Motivo no válido';
  end if;

  update portafolio_items
  set reaccion = case when p_interesa then 'interesa' else 'no_interesa' end,
      reaccion_motivo = v_motivo,
      reaccion_at = now(),
      -- si estaba "enviada", ya sabemos que la vio
      estatus = case when estatus = 'enviada' then 'vista' else estatus end,
      estatus_updated_at = case when estatus = 'enviada' then now() else estatus_updated_at end
  where portafolio_id = v_portafolio_id
    and propiedad_id = p_propiedad_id;

  if not found then
    raise exception 'El inmueble no pertenece a este portafolio';
  end if;

  update portafolios
  set estado = 'respondido', updated_at = now()
  where id = v_portafolio_id and estado <> 'respondido';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.reaccionar_portafolio(text, uuid, boolean, text) to anon;
grant execute on function public.reaccionar_portafolio(text, uuid, boolean, text) to authenticated;

-- 3. El portafolio público ahora devuelve la reacción guardada de cada
--    inmueble (para que al recargar se vea lo que el comprador marcó).
--    Es la misma función de siempre más dos campos: reaccion y reaccion_motivo.
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
            'reaccion', pi.reaccion,
            'reaccion_motivo', pi.reaccion_motivo,
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
