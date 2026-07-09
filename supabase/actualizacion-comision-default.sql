-- ============================================================
-- AJUSTE · COMISIÓN POR DEFECTO 1.5% (comisión compartida)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- ============================================================

-- 1. Las propiedades nuevas nacen con 1.5%
alter table public.propiedades
  alter column comision_pct set default 1.5;

-- 2. Las que quedaron con el 3% por defecto del paso anterior
--    pasan a 1.5%. (Si ya personalizaste algún porcentaje distinto
--    de 3, ese no se toca.)
update public.propiedades
set comision_pct = 1.5
where comision_pct = 3;
