-- ============================================================
--  SQL 16 · VIDEO POR INMUEBLE: SIN REGISTRO EN NINGÚN PASO
--  Pegar completo en Supabase → SQL Editor → New query → Run.
--  Seguro de correr más de una vez. No borra datos.
--
--  Qué cambia:
--   · Antes, un video sin agente solo podía ser borrador: para pedir la
--     vista previa había que crear la cuenta. Ahora el agente pide su vista
--     previa sin cuenta (deja su nombre y su WhatsApp) y el video sigue
--     todo el camino: recibido, en edición, vista previa y desbloqueado.
--   · La regla nueva: todo video tiene agente o la huella del navegador
--     que lo empezó. Nunca queda un video sin dueño.
--
--  Los permisos no cambian: los videos sin cuenta solo los maneja el servidor.
-- ============================================================

alter table public.videos_inmueble drop constraint if exists videos_inmueble_con_agente;
alter table public.videos_inmueble add constraint videos_inmueble_con_agente
  check (agente_id is not null or invitado_hash is not null);

-- Verificación: debe mostrar la regla nueva
select conname as regla, pg_get_constraintdef(oid) as condicion
from pg_constraint
where conname = 'videos_inmueble_con_agente';
