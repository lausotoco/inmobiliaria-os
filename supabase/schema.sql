-- ============================================================
--  SABANA OS — Esquema completo de la base de datos
--  Ejecutar UNA VEZ en: Supabase → SQL Editor → New query → Run
--
--  Crea las 14 tablas del sistema, la seguridad por filas (RLS),
--  el bucket de imágenes y el trigger que vincula tu usuario.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "moddatetime";

-- ------------------------------------------------------------
-- 1. ORGANIZACIONES Y PERFILES
--    Hoy solo existe tu organización. Es el seguro del
--    marketplace futuro: nada habrá que migrar.
-- ------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- Tu organización (puedes cambiar el nombre cuando quieras)
insert into public.organizations (id, nombre)
values ('00000000-0000-0000-0000-000000000001', 'Mi Inmobiliaria');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  email text,
  nombre text,
  rol text not null default 'owner', -- futuro: 'inmobiliaria'
  created_at timestamptz not null default now()
);

-- Función central de seguridad: ¿a qué organización pertenece
-- el usuario autenticado? Todas las políticas RLS la usan.
create or replace function public.current_org()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Cada vez que se crea un usuario en Auth, se crea su perfil
-- asignado automáticamente a tu organización.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, organization_id, email)
  values (new.id, '00000000-0000-0000-0000-000000000001', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. EL NÚCLEO: CLIENTES, REQUERIMIENTOS, PROPIEDADES
-- ------------------------------------------------------------

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  nombre text not null,
  whatsapp text,
  email text,
  ciudad text,
  estado text not null default 'activo',          -- activo · en pausa · cerrado · perdido
  urgencia text,                                  -- inmediata · 1-3 meses · +3 meses
  probabilidad_cierre int check (probabilidad_cierre between 0 and 100),
  credito_aprobado boolean not null default false,
  banco text,
  inicial_disponible numeric,
  ultimo_contacto timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requerimientos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  titulo text,                                    -- ej. "Apto para vivir con su familia"
  presupuesto_min numeric,
  presupuesto_max numeric,
  ciudad text,
  zonas text[],                                   -- ej. {Chía, Cajicá}
  barrio text,
  area_min numeric,
  area_max numeric,
  habitaciones int,
  banos int,
  parqueaderos int,
  tipo_inmueble text,                             -- apartamento · casa · lote · ...
  amenidades jsonb not null default '[]',         -- ["piscina", "gimnasio", ...]
  preferencias text,                              -- texto libre: lo que interpreta la IA
  financiacion text,                              -- crédito aprobado · en trámite · recursos propios
  urgencia text,
  observaciones text,
  estado text not null default 'activo',          -- activo · pausado · cumplido · cancelado
  score int check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.propiedades (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  codigo text,                                    -- código del portal o interno
  titulo text,
  precio numeric,
  area numeric,
  habitaciones int,
  banos int,
  parqueaderos int,
  administracion numeric,
  estrato int,
  descripcion text,
  amenidades jsonb not null default '[]',
  barrio text,
  ciudad text,
  direccion text,
  lat double precision,                           -- para el botón "abrir ubicación"
  lng double precision,
  asesor text,
  inmobiliaria text,
  telefono text,
  url_original text,
  estado text not null default 'disponible',      -- disponible · reservada · en negociación · vendida
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Las imágenes se suben UNA vez a Storage y quedan asociadas
-- aquí para siempre. Los portafolios solo las referencian.
create table public.propiedad_imagenes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  propiedad_id uuid not null references public.propiedades (id) on delete cascade,
  ruta_storage text not null,                     -- ej. "<propiedad_id>/foto-1.jpg"
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. LAS RELACIONES DONDE OCURRE EL NEGOCIO
-- ------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  requerimiento_id uuid not null references public.requerimientos (id) on delete cascade,
  propiedad_id uuid not null references public.propiedades (id) on delete cascade,
  score int check (score between 0 and 100),
  explicacion text,                               -- por qué la IA dio ese porcentaje
  estado text not null default 'sugerido',        -- sugerido · aceptado · descartado
  motivo_descarte text,                           -- la memoria de la que aprende la IA
  created_at timestamptz not null default now(),
  unique (requerimiento_id, propiedad_id)
);

create table public.portafolios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  titulo text,
  mensaje_personal text,
  estado text not null default 'borrador',        -- borrador · enviado · visto · respondido
  fecha_envio timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portafolio_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  portafolio_id uuid not null references public.portafolios (id) on delete cascade,
  propiedad_id uuid not null references public.propiedades (id) on delete cascade,
  orden int not null default 0,
  nota text,                                      -- nota personalizada para ese cliente
  unique (portafolio_id, propiedad_id)
);

create table public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  canal text not null default 'whatsapp',
  direccion text not null default 'nota',         -- enviado · recibido · nota
  contenido text not null,
  fecha timestamptz not null default now()
);

create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  propiedad_id uuid references public.propiedades (id) on delete set null,
  fecha timestamptz,
  estado text not null default 'programada',      -- programada · realizada · cancelada
  resultado text,
  notas text,
  created_at timestamptz not null default now()
);

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  propiedad_id uuid references public.propiedades (id) on delete set null,
  monto numeric,
  estado text not null default 'presentada',      -- presentada · contraoferta · aceptada · rechazada
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) default public.current_org(),
  cliente_id uuid references public.clientes (id) on delete cascade,
  descripcion text not null,
  fecha_limite date,
  origen text not null default 'manual',          -- manual · asistente_ia
  estado text not null default 'pendiente',       -- pendiente · completada
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. MARKETPLACE FUTURO (vacía por ahora)
--    Compartir un requerimiento con una inmobiliaria será
--    insertar una fila aquí. Nada más.
-- ------------------------------------------------------------

create table public.requerimiento_shares (
  id uuid primary key default gen_random_uuid(),
  requerimiento_id uuid not null references public.requerimientos (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade, -- la org que RECIBE acceso
  created_at timestamptz not null default now(),
  unique (requerimiento_id, organization_id)
);

-- ------------------------------------------------------------
-- 5. updated_at AUTOMÁTICO
-- ------------------------------------------------------------

create trigger set_updated_at before update on public.clientes
  for each row execute function moddatetime (updated_at);
create trigger set_updated_at before update on public.requerimientos
  for each row execute function moddatetime (updated_at);
create trigger set_updated_at before update on public.propiedades
  for each row execute function moddatetime (updated_at);
create trigger set_updated_at before update on public.portafolios
  for each row execute function moddatetime (updated_at);
create trigger set_updated_at before update on public.ofertas
  for each row execute function moddatetime (updated_at);

-- ------------------------------------------------------------
-- 6. ÍNDICES
-- ------------------------------------------------------------

create index idx_req_cliente on public.requerimientos (cliente_id);
create index idx_img_propiedad on public.propiedad_imagenes (propiedad_id);
create index idx_match_req on public.matches (requerimiento_id);
create index idx_match_prop on public.matches (propiedad_id);
create index idx_port_cliente on public.portafolios (cliente_id);
create index idx_port_token on public.portafolios (token);
create index idx_item_port on public.portafolio_items (portafolio_id);
create index idx_conv_cliente on public.conversaciones (cliente_id, fecha desc);
create index idx_visita_cliente on public.visitas (cliente_id);
create index idx_tarea_estado on public.tareas (estado, fecha_limite);

-- ------------------------------------------------------------
-- 7. SEGURIDAD POR FILAS (RLS)
--    La base de datos misma garantiza que cada organización
--    solo ve sus propios datos. Activa desde el día uno.
-- ------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.requerimientos enable row level security;
alter table public.propiedades enable row level security;
alter table public.propiedad_imagenes enable row level security;
alter table public.matches enable row level security;
alter table public.portafolios enable row level security;
alter table public.portafolio_items enable row level security;
alter table public.conversaciones enable row level security;
alter table public.visitas enable row level security;
alter table public.ofertas enable row level security;
alter table public.tareas enable row level security;
alter table public.requerimiento_shares enable row level security;

create policy "ver mi organizacion" on public.organizations
  for select to authenticated
  using (id = public.current_org());

create policy "ver mi perfil" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Política estándar: acceso total dentro de tu organización.
create policy "mi organizacion" on public.clientes
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.requerimientos
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.propiedades
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.propiedad_imagenes
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.matches
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.portafolios
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.portafolio_items
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.conversaciones
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.visitas
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.ofertas
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

create policy "mi organizacion" on public.tareas
  for all to authenticated
  using (organization_id = public.current_org())
  with check (organization_id = public.current_org());

-- Shares: puede verlos quien es dueño del requerimiento
-- y (en el futuro) la organización con la que se compartió.
create policy "duenio o receptor" on public.requerimiento_shares
  for all to authenticated
  using (
    organization_id = public.current_org()
    or exists (
      select 1 from public.requerimientos r
      where r.id = requerimiento_id
        and r.organization_id = public.current_org()
    )
  )
  with check (
    exists (
      select 1 from public.requerimientos r
      where r.id = requerimiento_id
        and r.organization_id = public.current_org()
    )
  );

-- ------------------------------------------------------------
-- 8. STORAGE: bucket de imágenes de propiedades
--    Público en lectura (las fotos deben verse en los
--    portafolios sin login); escritura solo autenticada.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('propiedades', 'propiedades', true)
on conflict (id) do nothing;

create policy "subir imagenes propiedades" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'propiedades');

create policy "actualizar imagenes propiedades" on storage.objects
  for update to authenticated
  using (bucket_id = 'propiedades');

create policy "borrar imagenes propiedades" on storage.objects
  for delete to authenticated
  using (bucket_id = 'propiedades');

create policy "leer imagenes propiedades" on storage.objects
  for select
  using (bucket_id = 'propiedades');

-- ============================================================
--  FIN. Si todo corrió sin errores, la base está lista.
--  Siguiente paso: crear tu usuario en Authentication → Users.
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
