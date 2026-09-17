-- ============================================================
--  FICHA DEL AGENTE: cambiar estado y strikes desde tu panel (SQL 10)
--  Pegar completo en Supabase → SQL Editor → New query → Run
-- ============================================================
create or replace function public.actualizar_agente(p_id uuid, p_estado text default null, p_strikes int default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.es_equipo_interno() then
    raise exception 'Solo el equipo interno puede actualizar agentes';
  end if;
  if p_estado is not null
     and p_estado not in ('registrado', 'en_videollamada', 'activo', 'inactivo', 'suspendido') then
    raise exception 'Estado no válido';
  end if;
  update profiles
  set estado_agente = coalesce(p_estado, estado_agente),
      strikes = coalesce(p_strikes, strikes)
  where id = p_id and rol = 'broker';
  if not found then
    raise exception 'Agente no encontrado';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.actualizar_agente(uuid, text, int) from anon;
grant execute on function public.actualizar_agente(uuid, text, int) to authenticated;
