-- ============================================================
-- LEADS DE COMPRADORES · landings /casas/*
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- No devuelve ninguna tabla de resultados.
-- ============================================================

-- 1. Consecutivo legible: R-0001, R-0002, …
create sequence if not exists public.leads_compradores_consecutivo;

-- 2. La tabla
create table if not exists public.leads_compradores (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,

  -- ── Lo que llenó el comprador ──
  municipio text not null,
  presupuesto text not null,
  tipo_inmueble text not null,
  plazo text not null,
  telefono_normalizado text not null,
  telefono_original text not null,

  -- ── Evidencia de la autorización (Ley 1581 de 2012) ──
  -- No es opcional: prueba qué texto exacto aceptó cada persona.
  autorizacion_aceptada boolean not null default false,
  autorizacion_texto_version text not null,
  autorizacion_timestamp timestamptz not null,
  ip_origen text,

  -- ── Atribución publicitaria ──
  -- gclid es el que permite devolverle a Google Ads qué leads
  -- se volvieron compradores reales. Sin él, la campaña optimiza
  -- hacia volumen de formularios en vez de hacia negocios.
  gclid text,
  wbraid text,
  gbraid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_url text,
  referrer text,
  user_agent text,
  canal_calculado text,
  ref_code text,

  -- ── Seguimiento comercial ──
  estado text not null default 'nuevo',
  notas text,

  created_at timestamptz not null default now()
);

-- 3. Asignar el código consecutivo al insertar
create or replace function public.asignar_codigo_lead_comprador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null then
    new.codigo := 'R-' || lpad(
      nextval('public.leads_compradores_consecutivo')::text, 4, '0'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_codigo_lead_comprador on public.leads_compradores;
create trigger trg_codigo_lead_comprador
  before insert on public.leads_compradores
  for each row
  execute function public.asignar_codigo_lead_comprador();

-- 4. Índices para consultar por campaña y por fecha
create index if not exists leads_compradores_created_idx
  on public.leads_compradores (created_at desc);
create index if not exists leads_compradores_gclid_idx
  on public.leads_compradores (gclid) where gclid is not null;
create index if not exists leads_compradores_ref_idx
  on public.leads_compradores (ref_code);

-- 5. Seguridad por fila.
--    La landing NO escribe directo: escribe el servidor con la
--    llave de servicio, que salta RLS. Aquí solo se define quién
--    puede LEER desde la aplicación: el equipo interno, nunca un
--    broker ni un visitante anónimo.
alter table public.leads_compradores enable row level security;

drop policy if exists "equipo interno lee leads" on public.leads_compradores;
create policy "equipo interno lee leads" on public.leads_compradores
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol <> 'broker'
    )
  );

drop policy if exists "equipo interno actualiza leads" on public.leads_compradores;
create policy "equipo interno actualiza leads" on public.leads_compradores
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol <> 'broker'
    )
  );
