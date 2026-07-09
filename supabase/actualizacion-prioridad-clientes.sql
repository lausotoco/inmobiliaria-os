-- ============================================================
-- PASO 4 · PRIORIDAD POR CLIENTE
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- ============================================================

alter table public.clientes
  add column if not exists prioridad text not null default 'media';

-- Valores permitidos: alta · media · baja
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_prioridad_check'
  ) then
    alter table public.clientes
      add constraint clientes_prioridad_check
      check (prioridad in ('alta', 'media', 'baja'));
  end if;
end $$;
