-- ============================================================
-- CALIFICACIÓN DE COMPRADORES · motor de score y bandas
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Es seguro correrlo más de una vez.
-- No devuelve ninguna tabla de resultados.
-- ------------------------------------------------------------
-- Qué crea:
--   1. score_config          — pesos y umbrales, VERSIONADOS
--   2. calificaciones        — una por cliente, con el score vigente
--   3. calificacion_historial— cada recálculo, para ver la evolución
--   4. dos columnas en leads_compradores para medir el tiempo de respuesta
-- ============================================================


-- ============================================================
-- 1. CONFIGURACIÓN VERSIONADA
-- ------------------------------------------------------------
-- Ningún peso ni umbral vive en el código. Todos viven aquí y se
-- editan desde /configuracion/score sin desplegar nada.
--
-- Cada cambio inserta una FILA NUEVA con versión +1. Las viejas
-- nunca se borran ni se editan: los scores ya calculados guardan
-- con qué versión se calcularon, así que cambiar los pesos hoy
-- no altera el histórico de ayer.
-- ============================================================
create table if not exists public.score_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id)
    default public.current_org(),
  version int not null,
  activa boolean not null default true,
  parametros jsonb not null,
  nota text,                                  -- "subí comportamiento a 20"
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid(),
  unique (organization_id, version)
);

-- Solo una versión activa por organización.
create unique index if not exists score_config_activa_idx
  on public.score_config (organization_id) where activa;


-- ============================================================
-- 2. CALIFICACIONES
-- ------------------------------------------------------------
-- Una por cliente. Guarda lo que se llenó en la videollamada y
-- el resultado del motor.
--
-- OJO PRIVACIDAD (Ley 1581): aquí NO se guarda ningún documento.
-- Solo el RESULTADO de la verificación: estado, monto, vigencia.
-- Ver sección 13 del encargo.
-- ============================================================
create table if not exists public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id)
    default public.current_org(),
  cliente_id uuid not null unique references public.clientes (id) on delete cascade,

  -- ── Bloque 1 · Identificación ──
  origen_lead text,                           -- Google Ads · Instagram · Meta · Referido · Directo · Otro
  lead_id uuid references public.leads_compradores (id) on delete set null,

  -- ── Bloque 2 · Contexto ──
  municipios text[],
  tipo_inmueble text,
  motivo_mudanza text,
  composicion_hogar text,
  vive_hoy_en text,                           -- Arriendo · Propio · Familiar

  -- ── Bloque 3 · Capacidad financiera ──
  presupuesto_maximo numeric,
  ingreso_familiar numeric,
  cuota_inicial numeric,
  estado_credito text,                        -- ver OPCIONES_CREDITO en lib/calificacion/config.ts
  carta_fecha date,
  monto_preaprobado numeric,
  carta_vigencia date,
  ingresos_verificables boolean not null default false,

  -- ── Bloque 4 · Urgencia ──
  plazo_mudanza text,                         -- <3 meses · 3-6 meses · 6-12 meses · Explorando
  evento_forzante boolean not null default false,
  evento_cual text,
  evento_fecha date,

  -- ── Bloque 5 · Dependencia de venta previa ──
  necesita_vender boolean not null default false,
  venta_publicada boolean not null default false,
  venta_meses int,
  venta_precio numeric,
  venta_enlace text,

  -- ── Bloque 6 · Decisión ──
  decisores text,
  decisores_participaron text,                -- todos · parcial · ninguno
  ya_visito boolean not null default false,
  notas_llamada text,

  -- ── Comportamiento observado (sección 7) ──
  -- Lo que el sistema no puede deducir solo, marcado a mano;
  -- el tiempo de respuesta SÍ sale de leads_compradores.
  videollamada_realizada boolean not null default false,
  documentos_entregados boolean not null default false,
  rechazos_videollamada int not null default 0,

  -- ── Autorización de tratamiento de datos (Ley 1581 de 2012) ──
  -- Un comprador creado a mano en una videollamada no trae la
  -- autorización de la landing: hay que registrarla aquí.
  autorizacion_fecha timestamptz,
  autorizacion_version text,

  -- ── Resultado del motor ──
  score_calculado int check (score_calculado between 0 and 100),
  banda_calculada text,                       -- A · B · C · D
  banda_final text,                           -- lo que Laura decide
  razon_override text,                        -- obligatoria si difiere
  override_por uuid references auth.users (id),
  override_at timestamptz,
  desglose jsonb,                             -- puntos por bloque, con su razón
  descalificadores jsonb,                     -- los que se activaron, con su razón
  config_version int,                         -- con qué versión se calculó

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calificaciones_banda_idx
  on public.calificaciones (banda_final, updated_at desc);
create index if not exists calificaciones_cliente_idx
  on public.calificaciones (cliente_id);


-- ============================================================
-- 3. HISTORIAL
-- ------------------------------------------------------------
-- Append-only. Una fila por recálculo, para poder ver
-- "C (12 sep) → B (28 sep) → A (14 oct)" y para detectar
-- compradores estancados.
-- ============================================================
create table if not exists public.calificacion_historial (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id)
    default public.current_org(),
  calificacion_id uuid not null references public.calificaciones (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  score int,
  banda_calculada text,
  banda_final text,
  desglose jsonb,
  descalificadores jsonb,
  config_version int,
  motivo text,                                -- "recálculo automático" · "override manual"
  created_at timestamptz not null default now()
);

create index if not exists calificacion_historial_cliente_idx
  on public.calificacion_historial (cliente_id, created_at desc);


-- ============================================================
-- 4. MEDIR EL TIEMPO DE RESPUESTA (sección 7)
-- ------------------------------------------------------------
-- `contactado_at` lo estampa el botón "Lo contacté ahora".
-- Sin ese sello no hay forma de medir la señal más predictiva:
-- si respondió al primer contacto en menos de 2 horas.
-- ============================================================
alter table public.leads_compradores
  add column if not exists cliente_id uuid references public.clientes (id) on delete set null;

alter table public.leads_compradores
  add column if not exists contactado_at timestamptz;

-- Y `respondio_at` lo estampa el botón "Respondió".
-- Hacen falta los DOS sellos: el primero mide en cuánto le
-- escribimos nosotros, el segundo en cuánto contestó él. La
-- señal del score es la diferencia entre ambos.
alter table public.leads_compradores
  add column if not exists respondio_at timestamptz;

create index if not exists leads_compradores_cliente_idx
  on public.leads_compradores (cliente_id) where cliente_id is not null;


-- ============================================================
-- 5. SEGURIDAD POR FILA
-- ------------------------------------------------------------
-- Doble candado, a propósito: la organización correcta Y que no
-- sea un broker. Los ingresos y la capacidad de pago de un
-- comprador no los puede ver nadie más que el equipo interno.
-- ============================================================
alter table public.score_config enable row level security;
alter table public.calificaciones enable row level security;
alter table public.calificacion_historial enable row level security;

create or replace function public.es_equipo_interno()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol <> 'broker'
  )
$$;

drop policy if exists "equipo interno" on public.score_config;
create policy "equipo interno" on public.score_config
  for all to authenticated
  using (organization_id = public.current_org() and public.es_equipo_interno())
  with check (organization_id = public.current_org() and public.es_equipo_interno());

drop policy if exists "equipo interno" on public.calificaciones;
create policy "equipo interno" on public.calificaciones
  for all to authenticated
  using (organization_id = public.current_org() and public.es_equipo_interno())
  with check (organization_id = public.current_org() and public.es_equipo_interno());

drop policy if exists "equipo interno" on public.calificacion_historial;
create policy "equipo interno" on public.calificacion_historial
  for all to authenticated
  using (organization_id = public.current_org() and public.es_equipo_interno())
  with check (organization_id = public.current_org() and public.es_equipo_interno());


-- ============================================================
-- 6. CONFIGURACIÓN INICIAL (versión 1)
-- ------------------------------------------------------------
-- Estos son los pesos del encargo. Son una hipótesis, no una
-- verdad: se cambian desde /configuracion/score cuando haya
-- operaciones cerradas que digan qué predijo de verdad.
-- Solo se inserta si la organización todavía no tiene ninguna.
-- ============================================================
insert into public.score_config (organization_id, version, activa, parametros, nota)
select
  o.id,
  1,
  true,
  '{
    "financieros": {
      "tasa_ea": 0.15,
      "plazo_meses": 240,
      "ltv_maximo": 0.70,
      "tope_carga": 0.30
    },
    "bloques": {
      "capacidad": {
        "max": 35,
        "preaprobacion_vigente": 35,
        "contado": 35,
        "radicada": 22,
        "inicial_e_ingresos": 12,
        "nada": 0,
        "inicial_minima_pct": 0.30
      },
      "coherencia": {
        "max": 15,
        "ambas_cumplen": 15,
        "una_falla": 7,
        "ambas_fallan": 0
      },
      "urgencia": {
        "max": 15,
        "menos_3_con_evento": 15,
        "menos_3_sin_evento": 10,
        "tres_a_seis": 10,
        "seis_a_doce": 5,
        "explorando": 0
      },
      "venta_previa": {
        "max": 10,
        "no_necesita": 10,
        "publicado_reciente": 5,
        "publicado_medio": 3,
        "publicado_viejo": 0,
        "no_ha_empezado": 0,
        "meses_reciente": 6,
        "meses_limite": 12
      },
      "decision": {
        "max": 10,
        "todos": 10,
        "parcial": 5,
        "ninguno": 0
      },
      "comportamiento": {
        "max": 15,
        "respuesta_rapida": 5,
        "videollamada": 5,
        "documentos": 5,
        "horas_respuesta_rapida": 2
      }
    },
    "bandas": { "a": 75, "b": 50, "c": 25 },
    "descalificadores": {
      "ltv_excedido":          { "activo": true, "umbral": 0.70, "banda_maxima": "C" },
      "carga_alta":            { "activo": true, "umbral": 0.45, "banda_maxima": "C" },
      "rechazo_videollamada":  { "activo": true, "veces": 2,     "banda_maxima": "C" },
      "venta_estancada":       { "activo": true, "meses": 12,    "banda_maxima": "C" },
      "presupuesto_bajo_minimo": { "activo": true, "banda": "D" }
    },
    "minimos_municipio": {
      "Chía": 800000000,
      "Cajicá": 800000000,
      "Cota": 800000000,
      "Sopó": 900000000,
      "La Calera": 800000000,
      "Zipaquirá": 500000000
    }
  }'::jsonb,
  'Configuración inicial del encargo'
from public.organizations o
where not exists (
  select 1 from public.score_config sc where sc.organization_id = o.id
);
