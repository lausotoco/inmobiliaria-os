---
name: kyrelo
description: Contexto técnico completo de KYRELO, la plataforma inmobiliaria de Laura Soto (Next.js 14 + Supabase + Netlify). Usa esta skill SIEMPRE que Laura pida cualquier cambio, nueva funcionalidad, corrección o pregunta sobre su plataforma, su código, su base de datos, su deploy o sus módulos (dashboard, clientes, requerimientos, propiedades, captaciones, portafolios, marketplace, brokers, agenda, tareas, comisiones, documentos), aunque no mencione la palabra "Kyrelo". Incluye la regla obligatoria de verificar el código real del repo antes de modificar nada.
---

# KYRELO — Contexto del proyecto

Plataforma inmobiliaria de Laura Soto para la Sabana de Bogotá (Chía, Cajicá, Sopó, Cota).
Eslogan: "Menos búsqueda. Más cierre."

## ⚠️ REGLA DE ORO — LEER ANTES DE TOCAR

**Nunca modifiques ni generes código de Kyrelo basándote solo en esta skill o en tu memoria.**
El proyecto evoluciona constantemente. Antes de cualquier cambio:

1. Lee el estado REAL del archivo que vas a modificar (en Claude Code: léelo del disco; en Claude.ai: clónalo con `git clone --depth 1 https://github.com/lausotoco/inmobiliaria-os.git`).
2. Verifica qué existe hoy: rutas en `app/`, componentes, tablas en `supabase/`.
3. Respeta el código existente: no "refactorices" ni renombres cosas que Laura no pidió.
4. Entrega siempre el archivo COMPLETO modificado (Laura lo pega entero con nano), nunca fragmentos sueltos, salvo que ella use Claude Code (ahí edita directo).

Esta skill contiene lo que casi nunca cambia. Para lo que sí cambia (módulos, tablas nuevas), la fuente de verdad es el repo.

## Stack

- **Frontend:** Next.js 14 App Router + React + Tailwind CSS. Todo el código y los comentarios en español.
- **Base de datos:** Supabase (Postgres con RLS por `organization_id` en todas las tablas).
- **Hosting:** Netlify — deploy automático con cada `git push` a `main` (2-3 min).
- **IA:** API de Anthropic (matching, importación, análisis de audio/texto/documentos). Transcripción: Groq (whisper-large-v3).
- **Imágenes:** Supabase Storage, bucket `propiedades`.

## URLs y cuentas

- App: https://sabanaosbylaurasoto.netlify.app
- Repo: https://github.com/lausotoco/inmobiliaria-os (público)
- Supabase: proyecto `akhhnbwbdsgistzcbrga`
- Identidad centralizada en `lib/config.ts` (nombre KYRELO, eslogan, WhatsApp). Nunca escribas el nombre de la marca en duro: importa `APP` desde config.

## Arquitectura actual (julio 2026 — verificar en el repo)

**Zona privada** `app/(privada)/`: dashboard, clientes (+[id], nuevo), requerimientos (+[id] con matching IA), propiedades (+[id], nueva con importación IA), captaciones, portafolios (+nuevo), postulaciones, marketplace, agenda, tareas, comisiones, documentos.

**Zona pública:** `app/p/[token]` (portafolio editorial vía RPC `portafolio_publico()`, sin enlace al anuncio original), `app/inmuebles/[slug]`, landing (`components/landing/LandingKyrelo.tsx`), `/brokers` (landing + login de brokers), `/registro-broker`, `/broker` (panel del broker con postulaciones), `/login`, `/recuperar`, `/nueva-clave`.

**APIs (Netlify Functions)** `app/api/`: importar-propiedad, matching, analizar-audio, analizar-documento.

**Componentes** por dominio: `components/ui/` (Badge, Sidebar, Vacio, ModuloProximo), `clientes/`, `propiedades/` (incluye PanelCaptacion), `portafolio/`, `requerimientos/` (BotonPublicarMarketplace), `broker/`, `landing/`.

**Lib:** `supabase/` (client, server, middleware), `config.ts`, `types.ts`, `utils.ts` (formatoCOP, formatoFecha).

## Base de datos

Tablas: organizations, profiles, clientes (con cédula), requerimientos, propiedades, propiedad_imagenes, matches (con probabilidad_cierre), portafolios, portafolio_items, conversaciones, visitas, ofertas, tareas, requerimiento_shares.

**Convención de migraciones:** los cambios de esquema NO se editan en `schema.sql`; se crean archivos nuevos `supabase/actualizacion-<tema>.sql` que Laura corre a mano en el SQL Editor de Supabase. Si generas SQL, entrégalo como archivo de actualización con ese patrón y dile a Laura que lo corra en Supabase → SQL Editor → New query → Run.

## Modelo de negocio (contexto para funcionalidades)

- Laura gestiona clientes compradores y sus requerimientos; el matching IA calcula compatibilidad % y probabilidad de cierre %.
- Marketplace: brokers externos se registran gratis, ven requerimientos publicados y postulan propiedades. Solo pagan si cierran: 50% de la comisión total del inmueble.
- Los portafolios públicos nunca revelan la fuente del anuncio original.

## Flujo de deploy de Laura (Mac)

```bash
cd ~/Downloads/inmobiliaria-os
# editar archivo (nano) o dejar que Claude Code lo edite
git add .
git commit -m "descripción corta"
git push   # Netlify despliega solo
```
Si Netlify no refleja cambios: Deploys → Trigger deploy → Deploy project without cache.

## Reglas de seguridad

- JAMÁS escribas llaves (Anthropic, Groq, Supabase service key) en código, ejemplos, commits o documentos. Van solo en variables de entorno de Netlify y en `.env.local` (que está en .gitignore). El repo es público.
- Variables esperadas: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY.
- Toda tabla nueva lleva RLS por `organization_id` siguiendo el patrón de `schema.sql`.

## Estilo visual

Para CUALQUIER cosa visual (pantallas, componentes, ajustes de UI), consulta la skill **kyrelo-diseno**. Resumen mínimo: estética "Editorial premium · Grafito + Cobre", titulares Fraunces, cuerpo Inter. La paleta antigua monocroma (#FAFAF7/#141414) está OBSOLETA — si la ves en algún prompt viejo, ignórala.
