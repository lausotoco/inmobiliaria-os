-- ============================================================
--  SQL 15 · VIDEO POR INMUEBLE: EMPEZAR SIN CREAR CUENTA
--  Pegar completo en Supabase → SQL Editor → New query → Run.
--  Seguro de correr más de una vez. No borra datos.
--
--  Qué cambia:
--   · Un video puede existir sin agente mientras es BORRADOR: el agente
--     llena la ficha y sube su video sin registrarse, y crea la cuenta
--     cuando pide su vista previa. En ese momento el video queda a su nombre.
--   · invitado_hash: la huella (cifrada) del navegador que empezó el video.
--     Solo ese navegador puede seguir llenándolo.
--   · invitado_red: la huella (cifrada) de la conexión, para frenar a quien
--     abra muchos borradores seguidos.
--   · Regla de seguridad: ningún video puede salir de borrador sin agente.
--
--  Los permisos no cambian: el agente sigue viendo solo lo suyo y los
--  borradores sin cuenta solo los maneja el servidor.
-- ============================================================

alter table public.videos_inmueble alter column agente_id drop not null;
alter table public.videos_inmueble add column if not exists invitado_hash text;
alter table public.videos_inmueble add column if not exists invitado_red text;

create index if not exists videos_inmueble_invitado_idx
  on public.videos_inmueble (invitado_hash) where invitado_hash is not null;

alter table public.videos_inmueble drop constraint if exists videos_inmueble_con_agente;
alter table public.videos_inmueble add constraint videos_inmueble_con_agente
  check (agente_id is not null or estado in ('borrador', 'descartado'));

-- Verificación: debe mostrar 2 columnas nuevas y la regla
select 'columna' as que, column_name as nombre
from information_schema.columns
where table_schema = 'public' and table_name = 'videos_inmueble'
  and column_name in ('invitado_hash', 'invitado_red')
union all
select 'regla', conname
from pg_constraint
where conname = 'videos_inmueble_con_agente';
