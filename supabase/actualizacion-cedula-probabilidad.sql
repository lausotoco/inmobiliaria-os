-- ============================================================
--  ACTUALIZACIÓN: cédula del cliente + probabilidad de cierre
--  Ejecutar UNA VEZ en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Cédula del cliente (opcional)
alter table public.clientes
  add column if not exists cedula text;

-- Probabilidad de cierre por inmueble (la calcula la IA en el matching)
alter table public.matches
  add column if not exists probabilidad_cierre int
  check (probabilidad_cierre between 0 and 100);
