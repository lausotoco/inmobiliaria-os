-- ============================================================
--  SQL 14 · VIDEO POR INMUEBLE (KYRELO Marketing)
--  Pegar completo en Supabase → SQL Editor → New query → Run.
--  Seguro de correr más de una vez. Solo agrega: no borra datos.
--
--  Crea:
--   · videos_inmueble: la ficha, el estilo y el estado de cada video
--     (borrador → recibido → en edición → vista previa → desbloqueado).
--   · tomas_inmueble: las tomas que sube el agente, una por casilla.
--   · pagos: los cobros de Wompi (referencia, monto, estado).
--   · Dos carpetas PRIVADAS de archivos: videos-tomas (lo que sube el
--     agente) y videos-entregas (vista previa y video final).
--
--  Seguridad: el agente solo LEE lo suyo. Todo cambio (subir tomas,
--  enviar, pagar) pasa por el servidor de la plataforma, que revisa
--  cada paso. Nadie puede marcarse un video como pagado desde el
--  navegador. Las carpetas no tienen reglas de acceso para usuarios:
--  solo el servidor entrega enlaces firmados que vencen.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VIDEOS
-- ------------------------------------------------------------
create table if not exists public.videos_inmueble (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id)
    default '00000000-0000-0000-0000-000000000001',
  agente_id uuid not null references public.profiles (id) on delete cascade,
  ficha jsonb not null default '{}'::jsonb,          -- tipo, precio, áreas, municipio, barrio, diferenciales, marca…
  estilo text,                                       -- sereno · directo · dinamico
  voz_en_off boolean not null default false,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'recibido', 'en_edicion', 'vista_previa',
                      'desbloqueado', 'rechazado', 'descartado')),
  motivo_rechazo text,                               -- qué regrabar (lo ve el agente)
  enviado_at timestamptz,                            -- material completo: arranca el reloj de 3 horas
  edicion_at timestamptz,
  vista_previa_at timestamptz,
  desbloqueado_en timestamptz,
  rechazado_at timestamptz,
  descartado_at timestamptz,
  metodo text check (metodo in ('pago', 'credito', 'manual')),
  pago_id uuid,
  ruta_vista_previa text,                            -- archivo de baja calidad con marca de agua
  entregas jsonb not null default '{}'::jsonb,       -- vista_previa, final_vertical, final_anuncio, portadas: {ruta, tamano}
  texto_corto text,
  texto_largo text,
  peso_tomas bigint not null default 0,              -- bytes, para cuidar el espacio gratis
  peso_entregas bigint not null default 0,
  tomas_borradas_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists videos_inmueble_agente_idx on public.videos_inmueble (agente_id);
create index if not exists videos_inmueble_estado_idx on public.videos_inmueble (estado);

drop trigger if exists videos_inmueble_updated on public.videos_inmueble;
create trigger videos_inmueble_updated
  before update on public.videos_inmueble
  for each row execute procedure moddatetime (updated_at);

-- ------------------------------------------------------------
-- 2. TOMAS (una por casilla: fachada, sala, cocina…)
-- ------------------------------------------------------------
create table if not exists public.tomas_inmueble (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos_inmueble (id) on delete cascade,
  casilla text not null,
  ruta text not null,
  nombre_archivo text,
  tamano bigint,
  duracion numeric,
  ancho int,
  alto int,
  revision text not null default 'sin_revisar'
    check (revision in ('ok', 'advertencia', 'sin_revisar')),
  observaciones jsonb not null default '[]'::jsonb,  -- lo que encontró la revisión automática
  miniatura text,                                    -- cuadro pequeño (JPG en texto) para ver la toma sin descargarla
  partes int not null default 0,                     -- recorrido completo: se sube en partes de 45 MB (ruta.part001, …)
  created_at timestamptz not null default now(),
  unique (video_id, casilla)
);
alter table public.tomas_inmueble add column if not exists miniatura text;
alter table public.tomas_inmueble add column if not exists partes int not null default 0;
create index if not exists tomas_inmueble_video_idx on public.tomas_inmueble (video_id);

-- ------------------------------------------------------------
-- 3. PAGOS (Wompi)
-- ------------------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id)
    default '00000000-0000-0000-0000-000000000001',
  agente_id uuid references public.profiles (id) on delete set null,
  video_id uuid references public.videos_inmueble (id) on delete set null,
  concepto text not null default 'desbloqueo_video',
  referencia text not null unique,
  proveedor text not null default 'wompi',
  monto bigint not null,                             -- en pesos, sin centavos
  moneda text not null default 'COP',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado', 'anulado', 'error')),
  transaccion_id text,
  medio text,                                        -- tarjeta, PSE, Nequi…
  ambiente text,                                     -- test · prod
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists pagos_video_idx on public.pagos (video_id);
create index if not exists pagos_agente_idx on public.pagos (agente_id);

-- ------------------------------------------------------------
-- 4. PERMISOS (RLS)
-- ------------------------------------------------------------
alter table public.videos_inmueble enable row level security;
alter table public.tomas_inmueble enable row level security;
alter table public.pagos enable row level security;

drop policy if exists "equipo interno videos" on public.videos_inmueble;
create policy "equipo interno videos" on public.videos_inmueble
  for all to authenticated
  using (public.es_equipo_interno())
  with check (public.es_equipo_interno());

drop policy if exists "agente ve sus videos" on public.videos_inmueble;
create policy "agente ve sus videos" on public.videos_inmueble
  for select to authenticated
  using (agente_id = auth.uid());

drop policy if exists "equipo interno tomas" on public.tomas_inmueble;
create policy "equipo interno tomas" on public.tomas_inmueble
  for all to authenticated
  using (public.es_equipo_interno())
  with check (public.es_equipo_interno());

drop policy if exists "agente ve sus tomas" on public.tomas_inmueble;
create policy "agente ve sus tomas" on public.tomas_inmueble
  for select to authenticated
  using (exists (
    select 1 from public.videos_inmueble v
    where v.id = tomas_inmueble.video_id and v.agente_id = auth.uid()
  ));

drop policy if exists "equipo interno pagos" on public.pagos;
create policy "equipo interno pagos" on public.pagos
  for all to authenticated
  using (public.es_equipo_interno())
  with check (public.es_equipo_interno());

drop policy if exists "agente ve sus pagos" on public.pagos;
create policy "agente ve sus pagos" on public.pagos
  for select to authenticated
  using (agente_id = auth.uid());

-- ------------------------------------------------------------
-- 5. CARPETAS PRIVADAS DE ARCHIVOS
--    50 MB por archivo (el máximo del plan gratis de Supabase).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos-tomas', 'videos-tomas', false, 52428800,
  array['video/mp4', 'video/quicktime', 'video/3gpp', 'video/x-m4v', 'video/webm',
        'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos-entregas', 'videos-entregas', false, 52428800,
  array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- REVISIÓN (toma captura de la tabla que sale):
--  · las dos carpetas de video deben decir "privada";
--  · las reglas de archivos que existen hoy: todas deberían nombrar
--    su carpeta (bucket_id = '…'). Si alguna no la nombra, avísale a Claude.
-- ------------------------------------------------------------
select 'carpeta' as que, id as nombre,
       case when public then 'PÚBLICA (revisar)' else 'privada' end as detalle
from storage.buckets
where id in ('videos-tomas', 'videos-entregas')
union all
select 'regla de archivos', policyname,
       cmd || ': ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
