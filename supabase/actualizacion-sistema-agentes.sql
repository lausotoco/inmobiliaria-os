-- ============================================================
--  NUEVO SISTEMA DE AGENTES (ticket 5, adaptado a la base real)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--  Es seguro correrlo más de una vez. Solo AGREGA columnas, tablas
--  y funciones: no borra ni modifica datos existentes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. AGENTES · se usa la tabla profiles, donde ya viven los brokers
--    (rol = 'broker'). Solo se agregan columnas.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists empresa text,
  add column if not exists telefono text,
  add column if not exists municipios text[],
  add column if not exists anos_experiencia int,
  add column if not exists ventas_12m int,
  add column if not exists como_trabaja text,
  add column if not exists que_menos_le_gusta text,
  add column if not exists estado_agente text not null default 'registrado',
  add column if not exists acuerdo_firmado boolean not null default false,
  add column if not exists acuerdo_url text,
  add column if not exists strikes int not null default 0,
  add column if not exists cierres int not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_estado_agente_check') then
    alter table public.profiles add constraint profiles_estado_agente_check
      check (estado_agente in ('registrado', 'en_videollamada', 'activo', 'inactivo', 'suspendido'));
  end if;
end $$;

-- Los brokers que ya están operando hoy quedan activos.
update public.profiles
set estado_agente = 'activo'
where rol = 'broker' and estado_agente = 'registrado';

-- Regla de reparto en un solo lugar: KYRELO se queda con 60% en los tres
-- primeros cierres del agente y 50% desde el cuarto.
create or replace function public.pct_kyrelo_para(p_agente uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
  select case when coalesce(cierres, 0) < 3 then 0.60 else 0.50 end
  from profiles where id = p_agente;
$$;

-- ------------------------------------------------------------
-- 2. POSTULACIONES · la tabla viva es marketplace_postulaciones.
--    Se agregan los datos nuevos del formulario del agente.
-- ------------------------------------------------------------
alter table public.marketplace_postulaciones
  add column if not exists matricula_inmobiliaria text,
  add column if not exists link_fotos text,
  add column if not exists tiene_certificado boolean not null default false,
  add column if not exists exclusividad text,
  add column if not exists municipio text,
  add column if not exists conjunto text,
  add column if not exists area_lote numeric,
  add column if not exists motivo_rechazo text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'marketplace_postulaciones_exclusividad_check') then
    alter table public.marketplace_postulaciones add constraint marketplace_postulaciones_exclusividad_check
      check (exclusividad is null or exclusividad in ('propia', 'compartida', 'sin_exclusividad'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. INMUEBLES DE KYRELO · son tus captaciones (propiedades con
--    es_captacion = true). Se agregan los datos para ofrecerlos a agentes.
-- ------------------------------------------------------------
alter table public.propiedades
  add column if not exists tipo text,
  add column if not exists matricula_inmobiliaria text,
  add column if not exists area_lote numeric,
  add column if not exists sector text,
  add column if not exists conjunto text,
  add column if not exists pct_comparte numeric not null default 0.50,
  add column if not exists tiene_mandato boolean not null default false,
  add column if not exists tiene_exclusividad boolean not null default false,
  add column if not exists kit_url text,
  add column if not exists foto_brokers_ruta text,
  add column if not exists publicada_brokers boolean not null default false,
  add column if not exists estado_captacion text not null default 'captado_sin_mandato';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'propiedades_estado_captacion_check') then
    alter table public.propiedades add constraint propiedades_estado_captacion_check
      check (estado_captacion in ('captado_sin_mandato', 'en_produccion', 'publicado',
                                  'con_asociacion', 'en_visita', 'vendido', 'retirado'));
  end if;
  -- Regla del brief, garantizada por la base: sin mandato NO se publica.
  if not exists (select 1 from pg_constraint where conname = 'propiedades_publicar_requiere_mandato') then
    alter table public.propiedades add constraint propiedades_publicar_requiere_mandato
      check (publicada_brokers = false or tiene_mandato = true);
  end if;
end $$;

-- ------------------------------------------------------------
-- 4. ASOCIACIONES · un agente pide comercializar un inmueble de KYRELO
-- ------------------------------------------------------------
create table if not exists public.asociaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  propiedad_id uuid not null references public.propiedades (id) on delete cascade,
  agente_id uuid not null references public.profiles (id),
  presupuesto_comprador numeric,
  plazo_comprador text,
  forma_pago_comprador text,
  comprador_verificado boolean not null default false,
  pct_propuesto numeric,                              -- null = acepta el publicado
  estado text not null default 'solicitada'
    check (estado in ('solicitada', 'aceptada', 'rechazada', 'vencida', 'cerrada')),
  cupo_portales boolean not null default false,
  acuerdo_url text,
  fecha_aceptacion timestamptz,
  fecha_vence timestamptz,                            -- aceptación + 30 días
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Solo UN agente por inmueble puede tener el cupo de portales.
create unique index if not exists asociaciones_un_cupo_portales
  on public.asociaciones (propiedad_id) where cupo_portales;
create index if not exists asociaciones_agente_idx on public.asociaciones (agente_id);

-- Al crear: hereda la organización del inmueble. Al aceptar: arranca la vigencia de 30 días.
create or replace function public.asociaciones_preparar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id from propiedades where id = new.propiedad_id;
  end if;
  if new.estado = 'aceptada' and (tg_op = 'INSERT' or old.estado is distinct from 'aceptada') then
    new.fecha_aceptacion := now();
    new.fecha_vence := now() + interval '30 days';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists asociaciones_preparar on public.asociaciones;
create trigger asociaciones_preparar
  before insert or update on public.asociaciones
  for each row execute function public.asociaciones_preparar();

alter table public.asociaciones enable row level security;

drop policy if exists "agente ve sus asociaciones" on public.asociaciones;
create policy "agente ve sus asociaciones" on public.asociaciones
  for select to authenticated
  using (agente_id = auth.uid());

-- ¿El inmueble está abierto a agentes? (con permisos propios, para que la
-- regla funcione aunque el agente no pueda leer la tabla propiedades)
create or replace function public.inmueble_abierto_a_agentes(p_propiedad_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from propiedades p
    where p.id = p_propiedad_id and p.publicada_brokers and p.tiene_mandato
  );
$$;

drop policy if exists "agente solicita asociacion" on public.asociaciones;
create policy "agente solicita asociacion" on public.asociaciones
  for insert to authenticated
  with check (
    agente_id = auth.uid()
    and public.inmueble_abierto_a_agentes(propiedad_id)
  );

drop policy if exists "equipo interno asociaciones" on public.asociaciones;
create policy "equipo interno asociaciones" on public.asociaciones
  for all to authenticated
  using (public.es_equipo_interno() and organization_id = public.current_org())
  with check (public.es_equipo_interno() and organization_id = public.current_org());

-- ------------------------------------------------------------
-- 5. NEGOCIOS · lo que el brief llama "matches". La tabla matches ya
--    existe para las sugerencias de la IA, así que esta se llama negocios.
-- ------------------------------------------------------------
create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  agente_id uuid not null references public.profiles (id),
  requerimiento_id uuid references public.requerimientos (id) on delete set null,
  postulacion_id uuid references public.marketplace_postulaciones (id) on delete set null,
  propiedad_id uuid references public.propiedades (id) on delete set null,
  asociacion_id uuid references public.asociaciones (id) on delete set null,
  acuerdo_comision_url text,
  estado text not null default 'conectado'
    check (estado in ('conectado', 'visita_agendada', 'visitado', 'oferta',
                      'promesa', 'escriturado', 'perdido')),
  motivo_perdida text,
  fecha_ultimo_movimiento timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Regla del brief: sin acuerdo de comisión no se agenda visita.
  constraint negocios_visita_requiere_acuerdo
    check (estado in ('conectado', 'perdido') or acuerdo_comision_url is not null)
);
create index if not exists negocios_agente_idx on public.negocios (agente_id);

-- Cada escritura suma un cierre al agente (define si va en 40% o en 50%).
create or replace function public.negocios_registrar_movimiento()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'escriturado' and (tg_op = 'INSERT' or old.estado is distinct from 'escriturado') then
    update profiles set cierres = coalesce(cierres, 0) + 1 where id = new.agente_id;
  end if;
  new.fecha_ultimo_movimiento := now();
  return new;
end;
$$;

drop trigger if exists negocios_registrar_movimiento on public.negocios;
create trigger negocios_registrar_movimiento
  before insert or update of estado on public.negocios
  for each row execute function public.negocios_registrar_movimiento();

alter table public.negocios enable row level security;

drop policy if exists "agente ve sus negocios" on public.negocios;
create policy "agente ve sus negocios" on public.negocios
  for select to authenticated
  using (agente_id = auth.uid());

drop policy if exists "equipo interno negocios" on public.negocios;
create policy "equipo interno negocios" on public.negocios
  for all to authenticated
  using (public.es_equipo_interno() and organization_id = public.current_org())
  with check (public.es_equipo_interno() and organization_id = public.current_org());

-- ------------------------------------------------------------
-- 6. COMISIONES · solo las ve el equipo interno
-- ------------------------------------------------------------
create table if not exists public.comisiones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  precio_venta numeric not null,
  pct_comision numeric not null default 0.03,
  pct_kyrelo numeric not null,                        -- 0.60 ó 0.50 (ver pct_kyrelo_para)
  monto_total numeric generated always as (precio_venta * pct_comision) stored,
  monto_kyrelo numeric generated always as (precio_venta * pct_comision * pct_kyrelo) stored,
  monto_agente numeric generated always as (precio_venta * pct_comision * (1 - pct_kyrelo)) stored,
  fecha_escritura date,
  fecha_pago_kyrelo date,
  fecha_pago_agente date,
  estado text not null default 'por_facturar'
    check (estado in ('por_facturar', 'facturada', 'pagada')),
  created_at timestamptz not null default now()
);

alter table public.comisiones enable row level security;

drop policy if exists "equipo interno comisiones" on public.comisiones;
create policy "equipo interno comisiones" on public.comisiones
  for all to authenticated
  using (public.es_equipo_interno() and organization_id = public.current_org())
  with check (public.es_equipo_interno() and organization_id = public.current_org());

-- ------------------------------------------------------------
-- 7. VIGENCIA · fecha en que cada requerimiento se publicó a brokers
--    (para mostrar "Vence en X días"). Todo lo publicado hoy arranca
--    con 30 días desde hoy.
-- ------------------------------------------------------------
alter table public.requerimiento_shares
  add column if not exists publicado_en timestamptz;

create or replace function public.shares_marcar_publicacion()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.publicado and (tg_op = 'INSERT' or old.publicado is distinct from true) then
    new.publicado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists shares_marcar_publicacion on public.requerimiento_shares;
create trigger shares_marcar_publicacion
  before insert or update on public.requerimiento_shares
  for each row execute function public.shares_marcar_publicacion();

update public.requerimiento_shares
set publicado_en = now()
where publicado = true and publicado_en is null;

-- ------------------------------------------------------------
-- 8. BUSCADORES · marketplace_publico (la de siempre, con más campos)
--    y marketplace_buscar_v2 (nombre nuevo para no chocar con la actual).
--    Solo salen compradores banda A. Nunca devuelven nombre ni contacto.
-- ------------------------------------------------------------
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
      r.financiacion, r.urgencia, r.preferencias, r.observaciones, r.updated_at,
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
      r.financiacion, r.urgencia, r.preferencias, r.observaciones, r.updated_at,
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
      -- un agente suspendido no ve nada
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

-- ------------------------------------------------------------
-- 9. INMUEBLES DE KYRELO PARA AGENTES · tarjeta anónima. Dirección,
--    conjunto, fotos completas y kit solo si el agente que consulta
--    tiene una asociación aceptada y vigente con ese inmueble.
-- ------------------------------------------------------------
create or replace function public.inmuebles_kyrelo()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select
      p.id, p.consecutivo, p.titulo, p.tipo, p.ciudad as municipio, p.sector,
      p.area, p.area_lote, p.habitaciones, p.banos, p.parqueaderos,
      p.precio, p.administracion, p.pct_comparte, p.tiene_exclusividad,
      p.foto_brokers_ruta, p.descripcion_publica,
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
