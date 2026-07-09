-- ============================================================
-- PASO 5 · TAREAS AUTOMÁTICAS + MEJORAS A LA TABLA TAREAS
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- ============================================================

-- 1. Columna para identificar y deduplicar tareas automáticas
alter table public.tareas
  add column if not exists tipo_auto text;

-- 2. Función que genera (y auto-completa) las tareas automáticas.
--    La app la llama cada vez que abres el Dashboard o Tareas.
--
--    Reglas:
--    a) Cliente ACTIVO sin ningún portafolio → "Crear portafolio para X"
--    b) Cliente ACTIVO de prioridad ALTA sin contacto en 7 días
--       (mira ultimo_contacto y la última nota/conversación)
--       → "Hacer seguimiento a X (prioridad alta)"
--    c) Si la condición deja de cumplirse (ya tiene portafolio /
--       ya hubo contacto), la tarea automática se completa sola.
create or replace function public.generar_tareas_automaticas()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- a) Clientes activos sin portafolio
  insert into public.tareas (cliente_id, descripcion, fecha_limite, origen, tipo_auto)
  select c.id,
         'Crear portafolio para ' || c.nombre,
         (current_date + 3),
         'automatica',
         'crear_portafolio'
  from public.clientes c
  where c.estado = 'activo'
    and not exists (
      select 1 from public.portafolios po where po.cliente_id = c.id
    )
    and not exists (
      select 1 from public.tareas t
      where t.cliente_id = c.id
        and t.tipo_auto = 'crear_portafolio'
        and t.estado = 'pendiente'
    );

  -- b) Prioridad alta sin seguimiento en los últimos 7 días
  insert into public.tareas (cliente_id, descripcion, fecha_limite, origen, tipo_auto)
  select c.id,
         'Hacer seguimiento a ' || c.nombre || ' (prioridad alta)',
         (current_date + 1),
         'automatica',
         'seguimiento_alta'
  from public.clientes c
  where c.estado = 'activo'
    and c.prioridad = 'alta'
    and coalesce(
          greatest(
            c.ultimo_contacto,
            (select max(cv.fecha) from public.conversaciones cv
              where cv.cliente_id = c.id)
          ),
          c.created_at
        ) < now() - interval '7 days'
    and not exists (
      select 1 from public.tareas t
      where t.cliente_id = c.id
        and t.tipo_auto = 'seguimiento_alta'
        and t.estado = 'pendiente'
    );

  -- c1) Auto-completar "crear portafolio" si el cliente ya tiene uno
  update public.tareas t
  set estado = 'completada'
  where t.estado = 'pendiente'
    and t.tipo_auto = 'crear_portafolio'
    and exists (
      select 1 from public.portafolios po where po.cliente_id = t.cliente_id
    );

  -- c2) Auto-completar "seguimiento" si ya hubo contacto reciente
  update public.tareas t
  set estado = 'completada'
  from public.clientes c
  where t.cliente_id = c.id
    and t.estado = 'pendiente'
    and t.tipo_auto = 'seguimiento_alta'
    and coalesce(
          greatest(
            c.ultimo_contacto,
            (select max(cv.fecha) from public.conversaciones cv
              where cv.cliente_id = c.id)
          ),
          c.created_at
        ) >= now() - interval '7 days';
end;
$$;

grant execute on function public.generar_tareas_automaticas() to authenticated;
