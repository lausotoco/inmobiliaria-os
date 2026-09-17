-- ============================================================
--  NEGOCIOS AUTOMÁTICOS · AGENTES ALIADOS · ACUERDOS EN LÍNEA (fase 2)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--  Es seguro correrlo más de una vez. Solo agrega: no borra datos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ACUERDOS · el documento generado con los datos del agente,
--    que él acepta en línea desde un enlace (firma electrónica simple,
--    Ley 527 de 1999 art. 7 y Decreto 2364 de 2012).
-- ------------------------------------------------------------
create table if not exists public.acuerdos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  tipo text not null default 'comprador_kyrelo'
    check (tipo in ('comprador_kyrelo', 'inmueble_kyrelo', 'alianza_general')),
  agente_id uuid not null references public.profiles (id),
  negocio_id uuid references public.negocios (id) on delete set null,
  requerimiento_id uuid references public.requerimientos (id) on delete set null,
  postulacion_id uuid references public.marketplace_postulaciones (id) on delete set null,
  propiedad_id uuid references public.propiedades (id) on delete set null,
  asociacion_id uuid references public.asociaciones (id) on delete set null,
  pct_comision numeric not null default 0.03,      -- comisión total sobre el precio
  pct_kyrelo numeric not null default 0.60,        -- parte de KYRELO en este acuerdo
  datos jsonb not null default '{}'::jsonb,        -- foto de los datos al generarlo
  estado text not null default 'enviado'
    check (estado in ('borrador', 'enviado', 'aceptado', 'anulado')),
  aceptado_at timestamptz,
  aceptado_nombre text,
  aceptado_documento text,
  aceptado_usuario uuid,
  created_at timestamptz not null default now()
);
create index if not exists acuerdos_agente_idx on public.acuerdos (agente_id);

alter table public.acuerdos enable row level security;

drop policy if exists "equipo interno acuerdos" on public.acuerdos;
create policy "equipo interno acuerdos" on public.acuerdos
  for all to authenticated
  using (public.es_equipo_interno() and organization_id = public.current_org())
  with check (public.es_equipo_interno() and organization_id = public.current_org());

drop policy if exists "agente ve sus acuerdos" on public.acuerdos;
create policy "agente ve sus acuerdos" on public.acuerdos
  for select to authenticated
  using (agente_id = auth.uid());

-- Lectura pública por enlace (sin login): solo lo necesario para mostrar el documento.
create or replace function public.acuerdo_publico(p_token text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'tipo', a.tipo,
    'estado', a.estado,
    'pct_comision', a.pct_comision,
    'pct_kyrelo', a.pct_kyrelo,
    'datos', a.datos,
    'created_at', a.created_at,
    'aceptado_at', a.aceptado_at,
    'aceptado_nombre', a.aceptado_nombre,
    'aceptado_documento', a.aceptado_documento,
    'agente', jsonb_build_object(
      'nombre', pf.nombre, 'empresa', pf.empresa, 'telefono', pf.telefono, 'email', pf.email
    ),
    'requerimiento', (
      select jsonb_build_object('codigo', r.codigo, 'ciudad', r.ciudad, 'tipo', r.tipo_inmueble,
                                'presupuesto_max', r.presupuesto_max)
      from requerimientos r where r.id = a.requerimiento_id
    ),
    'propiedad', (
      select jsonb_build_object('consecutivo', p.consecutivo, 'titulo', p.titulo, 'ciudad', p.ciudad,
                                'precio', p.precio, 'pct_comparte', p.pct_comparte)
      from propiedades p where p.id = a.propiedad_id
    )
  )
  from acuerdos a
  join profiles pf on pf.id = a.agente_id
  where a.token = p_token;
$$;
grant execute on function public.acuerdo_publico(text) to anon;
grant execute on function public.acuerdo_publico(text) to authenticated;

-- Aceptación en línea. Deja rastro (nombre, documento, fecha) y dispara los
-- efectos automáticos: agente con acuerdo firmado, negocio con acuerdo,
-- postulación a "acuerdo firmado", asociación con acuerdo.
create or replace function public.aceptar_acuerdo(p_token text, p_nombre text, p_documento text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v acuerdos%rowtype;
  v_url text;
begin
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_documento), '') = '' then
    raise exception 'Nombre y documento son obligatorios';
  end if;

  update acuerdos
  set estado = 'aceptado',
      aceptado_at = now(),
      aceptado_nombre = trim(p_nombre),
      aceptado_documento = trim(p_documento),
      aceptado_usuario = auth.uid()
  where token = p_token and estado in ('borrador', 'enviado')
  returning * into v;

  if v.id is null then
    raise exception 'Este acuerdo no está disponible o ya fue aceptado';
  end if;

  v_url := '/acuerdo/' || p_token;

  update profiles
  set acuerdo_firmado = true,
      acuerdo_url = coalesce(acuerdo_url, v_url)
  where id = v.agente_id;

  if v.negocio_id is not null then
    update negocios set acuerdo_comision_url = v_url
    where id = v.negocio_id and acuerdo_comision_url is null;
  end if;

  if v.postulacion_id is not null then
    update marketplace_postulaciones
    set estado = 'acuerdo_firmado', updated_at = now()
    where id = v.postulacion_id and estado in ('postulado', 'validado');
  end if;

  if v.asociacion_id is not null then
    update asociaciones set acuerdo_url = v_url
    where id = v.asociacion_id and acuerdo_url is null;
  end if;

  return jsonb_build_object('ok', true, 'aceptado_at', v.aceptado_at);
end;
$$;
grant execute on function public.aceptar_acuerdo(text, text, text) to anon;
grant execute on function public.aceptar_acuerdo(text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 2. NEGOCIOS AUTOMÁTICOS
-- ------------------------------------------------------------
alter table public.negocios
  add column if not exists pct_kyrelo numeric,
  add column if not exists precio_estimado numeric,
  add column if not exists titulo text;

-- 2a. Postulación que llega a "acuerdo firmado" o "presentado" → nace el negocio
create or replace function public.postulacion_crea_negocio()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado in ('acuerdo_firmado', 'presentado', 'visita', 'negociacion', 'cierre')
     and not exists (select 1 from negocios n where n.postulacion_id = new.id) then
    insert into negocios (organization_id, agente_id, requerimiento_id, postulacion_id,
                          estado, titulo, precio_estimado, acuerdo_comision_url)
    values (
      (select organization_id from requerimientos where id = new.requerimiento_id),
      new.broker_profile_id,
      new.requerimiento_id,
      new.id,
      'conectado',
      new.titulo,
      new.precio,
      (select '/acuerdo/' || a.token from acuerdos a
        where a.postulacion_id = new.id and a.estado = 'aceptado'
        order by a.aceptado_at desc limit 1)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists postulacion_crea_negocio on public.marketplace_postulaciones;
create trigger postulacion_crea_negocio
  after insert or update of estado on public.marketplace_postulaciones
  for each row execute function public.postulacion_crea_negocio();

-- 2b. Asociación aceptada → nace el negocio (inmueble KYRELO, reparto 50/50)
create or replace function public.asociacion_crea_negocio()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'aceptada'
     and not exists (select 1 from negocios n where n.asociacion_id = new.id) then
    insert into negocios (organization_id, agente_id, propiedad_id, asociacion_id,
                          estado, titulo, precio_estimado, pct_kyrelo, acuerdo_comision_url)
    select new.organization_id, new.agente_id, new.propiedad_id, new.id,
           'conectado', p.titulo, p.precio, 1 - coalesce(p.pct_comparte, 0.5),
           coalesce(new.acuerdo_url, (select '/acuerdo/' || a.token from acuerdos a
             where a.asociacion_id = new.id and a.estado = 'aceptado'
             order by a.aceptado_at desc limit 1))
    from propiedades p where p.id = new.propiedad_id;
  end if;
  return new;
end;
$$;

drop trigger if exists asociacion_crea_negocio on public.asociaciones;
create trigger asociacion_crea_negocio
  after insert or update of estado on public.asociaciones
  for each row execute function public.asociacion_crea_negocio();

-- 2c. Al escriturar: fija el reparto del agente ANTES de contar el cierre
--     (reemplaza la función de la fase 1).
create or replace function public.negocios_registrar_movimiento()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'escriturado' and (tg_op = 'INSERT' or old.estado is distinct from 'escriturado') then
    if new.pct_kyrelo is null then
      new.pct_kyrelo := case
        when new.propiedad_id is not null then 0.50
        else public.pct_kyrelo_para(new.agente_id)
      end;
    end if;
    update profiles set cierres = coalesce(cierres, 0) + 1 where id = new.agente_id;
  end if;
  new.fecha_ultimo_movimiento := now();
  return new;
end;
$$;

-- 2d. Escriturado → comisión creada sola (precio editable después)
create or replace function public.negocio_crea_comision()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'escriturado'
     and not exists (select 1 from comisiones c where c.negocio_id = new.id) then
    insert into comisiones (organization_id, negocio_id, precio_venta, pct_comision, pct_kyrelo)
    values (new.organization_id, new.id, coalesce(new.precio_estimado, 0), 0.03,
            coalesce(new.pct_kyrelo, 0.50));
  end if;

  -- El seguimiento de 8 etapas que ve el agente se mueve solo
  if new.postulacion_id is not null then
    update marketplace_postulaciones
    set estado = case new.estado
                   when 'visita_agendada' then 'visita'
                   when 'visitado' then 'visita'
                   when 'oferta' then 'negociacion'
                   when 'promesa' then 'negociacion'
                   when 'escriturado' then 'cierre'
                   else estado
                 end,
        updated_at = now()
    where id = new.postulacion_id
      and new.estado in ('visita_agendada', 'visitado', 'oferta', 'promesa', 'escriturado');
  end if;
  return new;
end;
$$;

drop trigger if exists negocio_crea_comision on public.negocios;
create trigger negocio_crea_comision
  after update of estado on public.negocios
  for each row execute function public.negocio_crea_comision();

-- 2e. Comisión pagada → la postulación termina en "comisión repartida"
create or replace function public.comision_pagada_cierra()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'pagada' then
    update marketplace_postulaciones mp
    set estado = 'comision_repartida', updated_at = now()
    from negocios n
    where n.id = new.negocio_id and mp.id = n.postulacion_id;
  end if;
  return new;
end;
$$;

drop trigger if exists comision_pagada_cierra on public.comisiones;
create trigger comision_pagada_cierra
  after update of estado on public.comisiones
  for each row execute function public.comision_pagada_cierra();

-- ------------------------------------------------------------
-- 3. LECTURAS PARA TU PANEL (equipo interno)
-- ------------------------------------------------------------
create or replace function public.negocios_admin()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t order by t.fecha_ultimo_movimiento desc), '[]'::jsonb) from (
    select n.*,
      jsonb_build_object('id', pf.id, 'nombre', pf.nombre, 'empresa', pf.empresa,
                         'telefono', pf.telefono, 'cierres', pf.cierres) as agente,
      (select jsonb_build_object('codigo', r.codigo, 'ciudad', r.ciudad, 'cliente_id', r.cliente_id,
                                 'cliente_nombre', c.nombre)
         from requerimientos r left join clientes c on c.id = r.cliente_id
         where r.id = n.requerimiento_id) as requerimiento,
      (select jsonb_build_object('consecutivo', p.consecutivo, 'titulo', p.titulo, 'ciudad', p.ciudad)
         from propiedades p where p.id = n.propiedad_id) as propiedad,
      (select jsonb_build_object('id', co.id, 'precio_venta', co.precio_venta, 'pct_comision', co.pct_comision,
                                 'pct_kyrelo', co.pct_kyrelo, 'monto_total', co.monto_total,
                                 'monto_kyrelo', co.monto_kyrelo, 'monto_agente', co.monto_agente,
                                 'estado', co.estado, 'fecha_escritura', co.fecha_escritura,
                                 'fecha_pago_kyrelo', co.fecha_pago_kyrelo, 'fecha_pago_agente', co.fecha_pago_agente)
         from comisiones co where co.negocio_id = n.id limit 1) as comision
    from negocios n
    join profiles pf on pf.id = n.agente_id
    where public.es_equipo_interno() and n.organization_id = public.current_org()
  ) t;
$$;
revoke execute on function public.negocios_admin() from anon;
grant execute on function public.negocios_admin() to authenticated;

create or replace function public.agentes_admin()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
    select pf.id, pf.nombre, pf.email, pf.empresa, pf.telefono, pf.municipios, pf.anos_experiencia,
           pf.ventas_12m, pf.estado_agente, pf.acuerdo_firmado, pf.acuerdo_url, pf.strikes, pf.cierres,
           pf.created_at,
           (select count(*) from marketplace_postulaciones mp where mp.broker_profile_id = pf.id) as postulaciones,
           (select count(*) from asociaciones a where a.agente_id = pf.id) as asociaciones,
           (select count(*) from negocios n where n.agente_id = pf.id
              and n.estado not in ('escriturado', 'perdido')) as negocios_activos
    from profiles pf
    where pf.rol = 'broker' and public.es_equipo_interno()
  ) t;
$$;
revoke execute on function public.agentes_admin() from anon;
grant execute on function public.agentes_admin() to authenticated;

create or replace function public.agente_detalle(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select case when public.es_equipo_interno() then jsonb_build_object(
    'perfil', (select to_jsonb(pf) from profiles pf where pf.id = p_id),
    'postulaciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', mp.id, 'titulo', mp.titulo, 'estado', mp.estado, 'precio', mp.precio,
        'motivo_rechazo', mp.motivo_rechazo, 'created_at', mp.created_at,
        'codigo', r.codigo, 'requerimiento_id', r.id
      ) order by mp.created_at desc), '[]'::jsonb)
      from marketplace_postulaciones mp
      left join requerimientos r on r.id = mp.requerimiento_id
      where mp.broker_profile_id = p_id
    ),
    'asociaciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'estado', a.estado, 'fecha_vence', a.fecha_vence, 'cupo_portales', a.cupo_portales,
        'created_at', a.created_at, 'propiedad_id', p.id, 'consecutivo', p.consecutivo, 'titulo', p.titulo
      ) order by a.created_at desc), '[]'::jsonb)
      from asociaciones a join propiedades p on p.id = a.propiedad_id
      where a.agente_id = p_id
    ),
    'negocios', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'estado', n.estado, 'titulo', n.titulo, 'fecha_ultimo_movimiento', n.fecha_ultimo_movimiento,
        'acuerdo_comision_url', n.acuerdo_comision_url
      ) order by n.fecha_ultimo_movimiento desc), '[]'::jsonb)
      from negocios n where n.agente_id = p_id
    ),
    'acuerdos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ac.id, 'token', ac.token, 'tipo', ac.tipo, 'estado', ac.estado,
        'created_at', ac.created_at, 'aceptado_at', ac.aceptado_at, 'aceptado_nombre', ac.aceptado_nombre
      ) order by ac.created_at desc), '[]'::jsonb)
      from acuerdos ac where ac.agente_id = p_id
    )
  ) end;
$$;
revoke execute on function public.agente_detalle(uuid) from anon;
grant execute on function public.agente_detalle(uuid) to authenticated;

create or replace function public.acuerdos_admin()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
    select ac.*,
      jsonb_build_object('id', pf.id, 'nombre', pf.nombre, 'empresa', pf.empresa,
                         'telefono', pf.telefono, 'email', pf.email) as agente
    from acuerdos ac
    join profiles pf on pf.id = ac.agente_id
    where public.es_equipo_interno() and ac.organization_id = public.current_org()
  ) t;
$$;
revoke execute on function public.acuerdos_admin() from anon;
grant execute on function public.acuerdos_admin() to authenticated;
