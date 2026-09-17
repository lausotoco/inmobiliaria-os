-- ============================================================
--  COMISIÓN REPARTIDA ENTRE VARIAS PARTES (correr DESPUÉS del SQL 8)
--  Pegar completo en Supabase → SQL Editor → New query → Run
--  Es seguro correrlo más de una vez.
--
--  "partes" = entre cuántos se divide la comisión total. KYRELO y el
--  agente cuentan como UNA parte. Ej.: otra inmobiliaria trae el
--  inmueble → partes = 2 → a KYRELO+agente les toca la mitad, y esa
--  mitad se reparte con el 60/40 o 50/50 del agente.
-- ============================================================
alter table public.comisiones
  add column if not exists partes int not null default 1 check (partes >= 1),
  add column if not exists nota_reparto text;   -- ej. "Inmobiliaria Sabana aporta el inmueble"

alter table public.comisiones drop column if exists monto_total;
alter table public.comisiones drop column if exists monto_kyrelo;
alter table public.comisiones drop column if exists monto_agente;
alter table public.comisiones drop column if exists monto_kyrelo_agente;

alter table public.comisiones
  add column monto_total numeric generated always as (precio_venta * pct_comision) stored,
  add column monto_kyrelo_agente numeric generated always as (precio_venta * pct_comision / partes) stored,
  add column monto_kyrelo numeric generated always as (precio_venta * pct_comision / partes * pct_kyrelo) stored,
  add column monto_agente numeric generated always as (precio_venta * pct_comision / partes * (1 - pct_kyrelo)) stored;

-- La lectura de negocios ahora trae partes y la porción KYRELO+agente
create or replace function public.negocios_admin()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t order by t.fecha_ultimo_movimiento desc), '[]'::jsonb) from (
    select n.*,
      jsonb_build_object('id', pf.id, 'nombre', pf.nombre, 'empresa', pf.empresa,
                         'telefono', pf.telefono, 'cierres', pf.cierres) as agente,
      (select jsonb_build_object('codigo', r.codigo, 'ciudad', r.ciudad, 'cliente_id', r.cliente_id,
                                 'cliente_nombre', c.nombre)
         from requerimientos r left join clientes c on c.id = r.cliente_id
         where r.id = n.requerimiento_id) as requerimiento,
      (select jsonb_build_object('consecutivo', p.consecutivo, 'titulo', p.titulo, 'ciudad', p.ciudad)
         from propiedades p where p.id = n.propiedad_id) as propiedad,
      (select jsonb_build_object('id', co.id, 'precio_venta', co.precio_venta, 'pct_comision', co.pct_comision,
                                 'pct_kyrelo', co.pct_kyrelo, 'partes', co.partes, 'nota_reparto', co.nota_reparto,
                                 'monto_total', co.monto_total, 'monto_kyrelo_agente', co.monto_kyrelo_agente,
                                 'monto_kyrelo', co.monto_kyrelo, 'monto_agente', co.monto_agente,
                                 'estado', co.estado, 'fecha_escritura', co.fecha_escritura,
                                 'fecha_pago_kyrelo', co.fecha_pago_kyrelo, 'fecha_pago_agente', co.fecha_pago_agente)
         from comisiones co where co.negocio_id = n.id limit 1) as comision
    from negocios n
    join profiles pf on pf.id = n.agente_id
    where public.es_equipo_interno() and n.organization_id = public.current_org()
  ) t;
$$;
