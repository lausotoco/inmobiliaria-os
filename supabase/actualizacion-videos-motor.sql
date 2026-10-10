-- SQL 17 · Motor automático de video (10 oct 2026)
-- Agrega una sola columna: el informe del motor en cada video
-- (cuánto costó Claude, cuánto tardó y qué corrigió la revisión).
-- No borra ni cambia nada de lo que ya existe.

alter table public.videos_inmueble
  add column if not exists motor jsonb not null default '{}'::jsonb;

comment on column public.videos_inmueble.motor is
  'Informe del motor automático (GitHub): costo_usd, segundos, revision, modo, terminado_at, corrida.';
