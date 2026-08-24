---
name: kyrelo
description: Contexto técnico completo de KYRELO, la plataforma inmobiliaria de Laura Soto (Next.js 14 + Supabase + Netlify, dominio kyrelocorp.com). Usa esta skill SIEMPRE que Laura pida cualquier cambio, nueva funcionalidad, corrección o pregunta sobre su plataforma, su código, su base de datos, su deploy o cualquiera de sus piezas: el CRM privado (dashboard, clientes, requerimientos, propiedades, captaciones, portafolios, agenda, tareas, comisiones, documentos), el marketplace de brokers, las landings de captación de compradores /casas/*, los leads de Google Ads y Meta, el bot de Telegram, el SEO o las páginas legales — aunque no mencione la palabra "Kyrelo". Incluye la regla obligatoria de verificar el código real del repo antes de modificar nada.
---

# KYRELO — Contexto del proyecto

Plataforma inmobiliaria de Laura Soto para la Sabana Norte de Bogotá (Chía, Cajicá, Cota, Sopó, La Calera, Zipaquirá).
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
- **IA:** API de Anthropic (matching, importación, análisis de audio/texto/documentos, lectura de notas de voz del bot). Transcripción: Groq (whisper-large-v3).
- **Imágenes:** Supabase Storage, bucket `propiedades`.
- Sin librerías de UI ni de estado: solo Next, React, Supabase y Tailwind. No agregues dependencias sin que Laura lo pida.

## URLs y cuentas

- **App en producción: https://kyrelocorp.com** (dominio propio sobre Netlify). El subdominio viejo `sabanaosbylaurasoto.netlify.app` ya NO sirve el sitio.
- Repo: https://github.com/lausotoco/inmobiliaria-os (público)
- Supabase: proyecto `akhhnbwbdsgistzcbrga`
- Instagram: @kyrelocorp · WhatsApp: +57 311 801 8295
- Identidad centralizada en `lib/config.ts` (nombre KYRELO, eslogan, WhatsApp). Nunca escribas el nombre de la marca en duro: importa `APP` desde config.
- El dominio base para canónicos, sitemap y OG sale de `NEXT_PUBLIC_SITE_URL`, con `https://kyrelocorp.com` como valor por defecto en el código.

## Arquitectura actual (agosto 2026 — verificar en el repo)

### Zona privada `app/(privada)/`
dashboard, clientes (+`[id]`, `nuevo`), requerimientos (+`[id]` con matching IA, +`por-revisar`), propiedades (+`[id]`, `nueva` con importación IA), captaciones, portafolios (+`nuevo`), postulaciones, marketplace, agenda, tareas, comisiones, documentos.

`por-revisar` es la bandeja de los requerimientos que entran por el bot de Telegram, ordenados por `score` (Alta ≥80, Media ≥40, Baja).

### Zona pública
- **Home** `app/page.tsx` → `components/landing/LandingKyrelo.tsx`. Detecta sesión y manda a `/dashboard` o `/broker` según el rol.
- **Landings de captación de compradores** `app/casas/[municipio]` → `components/casas/LandingCasas.tsx`. Son 7 (Chía, Cajicá, Cota, Sopó, La Calera, Zipaquirá, Sabana Norte) generadas con `generateStaticParams`. Ver "Máquina de captación" abajo.
- **Catálogo** `app/inmuebles` y `app/inmuebles/[slug]`.
- **Portafolios** `app/p/[token]` (editorial, vía RPC `portafolio_publico()`, sin enlace al anuncio original).
- **Brokers:** `/brokers` (punto ÚNICO de entrada: landing + login + registro), `/registro-broker`, `/broker` (panel con postulaciones), `/oportunidades` (marketplace en modo ver, sin login).
- **Conversión y legales:** `/gracias` (noindex, la conversión de Google Ads se mide por "la URL contiene /gracias"), `/verificacion` (estándar público de verificación), `/politica-de-datos` (canónica), `/legal/terminos`. La ruta vieja `/legal/tratamiento-de-datos` redirige 301 a `/politica-de-datos` en `next.config.mjs`.
- **Cuenta:** `/login`, `/recuperar`, `/nueva-clave`.

### APIs (Netlify Functions) `app/api/`
`importar-propiedad`, `matching`, `analizar-audio`, `analizar-documento`, `leads`, `telegram`.

### Componentes por dominio
`ui/` (Badge, Sidebar, Vacio, ModuloProximo), `clientes/`, `propiedades/` (incluye PanelCaptacion), `portafolio/`, `requerimientos/` (BotonPublicarMarketplace), `broker/` (SubirFotosPostulacion), `landing/`, `casas/` (LandingCasas, Gracias, Gtm, PaginaTexto).

### Lib
`supabase/` (client, server, middleware, **admin** = service role, solo servidor), `config.ts`, `types.ts`, `utils.ts` (formatoCOP, formatoFecha), `municipios.ts`, `atribucion.ts`, `telefono.ts` (normalizar/formatear celular colombiano), `mensaje-whatsapp.ts`.

## Máquina de captación (Google Ads + Meta)

Es el motor comercial del sitio. Tocarlo con cuidado: cada pieza existe por una razón.

- **Un solo archivo manda sobre las 7 landings: `lib/municipios.ts`.** Ahí viven el slug, el nombre, la preposición, el `rangoDesde`, el valor prellenado del formulario y la bandera `activo`. Para agregar, apagar o ajustar un municipio se edita ESE archivo, nunca la página ni el componente. `activo: false` = la URL responde 404 real y sale del sitemap.
- También ahí están las opciones válidas del formulario (`OPCIONES_MUNICIPIO`, `OPCIONES_PRESUPUESTO`, `OPCIONES_TIPO`, `OPCIONES_PLAZO`) que el servidor usa para validar, y dos banderas de contenido: `mostrarBloqueCredito` (aliado hipotecario sin firmar) y `politicaAprobadaPorAbogado`.
- **Flujo del lead:** formulario → `app/api/leads/route.ts` → tabla `leads_compradores` (código consecutivo `R-0001`…) → notificación a Telegram con enlace de WhatsApp pre-armado → redirección a `/gracias`. **Orden deliberado: primero guarda, después notifica.** Si Telegram falla, el lead ya está a salvo. No lo inviertas.
- **Atribución (`lib/atribucion.ts`):** captura `gclid`, `wbraid`, `gbraid` y las UTM en la PRIMERA visita y las guarda en `sessionStorage`, porque el comprador puede navegar antes de llenar el formulario. Genera un `ref_code` tipo `GADS-CHIA`, `IG-COTA`, `META-SABANA-NORTE`, `DIR-CAJICA`. Sin `gclid` no se le puede decir a Google Ads qué leads se volvieron negocios: no lo quites.
- **Ley 1581 de 2012:** con cada lead se guarda la versión exacta del texto de autorización (`VERSION_AUTORIZACION` en `lib/municipios.ts`), el timestamp y la IP. Si cambia el texto de autorización, hay que subir la versión.
- **Medición:** Pixel de Meta en el layout raíz (`app/layout.tsx`, ID público) y Google Tag Manager SOLO en las páginas de captación (`components/casas/Gtm.tsx`, ID `GTM-K74PCDPX`). El GTM va aparte a propósito: el panel privado y los portafolios no se miden con la cuenta de publicidad.
- **SEO:** el layout raíz lleva `robots: noindex` global y cada página pública lo sobrescribe con `index: true`. `app/robots.ts` es una lista blanca (regla más larga gana) con reglas explícitas para `AdsBot-Google`, y `app/sitemap.ts` arma el sitemap dinámico con landings + inmuebles publicados.

## Bot de Telegram

`app/api/telegram/route.ts`. Solo le responde a Laura (su chat ID está fijo en el código). Nota de voz → transcripción con Groq (whisper-large-v3) → extracción y calificación con Claude → crea el requerimiento con presupuesto, ciudad, zonas, metraje, habitaciones, amenidades, financiación, urgencia y un `score` de criterios. Lo que crea cae en la bandeja `requerimientos/por-revisar`. El webhook debe quedar fuera del middleware de sesión.

## Base de datos

Tablas: `organizations`, `profiles` (con `rol`; `broker` es el rol externo), `clientes` (con cédula), `requerimientos`, `propiedades`, `propiedad_imagenes`, `matches` (con `probabilidad_cierre`), `portafolios`, `portafolio_items`, `conversaciones`, `visitas`, `ofertas`, `tareas`, `requerimiento_shares`, `marketplace_postulaciones`, `marketplace_eventos`, `leads_compradores`.

RPCs en uso: `portafolio_publico`, `captacion_publica`, `captaciones_publicas`, `marketplace_buscar`, `marketplace_publico`, `marketplace_resumen`, `marketplace_postulaciones_admin`, `aprobar_postulacion`, `registrar_broker`, `generar_tareas_automaticas`.

**Convención de migraciones:** los cambios de esquema NO se editan en `schema.sql`; se crean archivos nuevos `supabase/actualizacion-<tema>.sql` (o con nombre propio, como `leads-compradores.sql`) que Laura corre a mano en el SQL Editor de Supabase. Escríbelos siempre idempotentes (`if not exists`, `drop policy if exists`) y dile a Laura que los corra en Supabase → SQL Editor → New query → Run.

## Modelo de negocio (contexto para funcionalidades)

- Laura gestiona clientes compradores y sus requerimientos; el matching IA calcula compatibilidad % y probabilidad de cierre %.
- Las landings `/casas/*` compran demanda de compradores con Google Ads y Meta: el comprador dice qué busca en vez de recorrer 400 anuncios.
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

- JAMÁS escribas llaves (Anthropic, Groq, Supabase service key, token del bot de Telegram) en código, ejemplos, commits o documentos. Van solo en variables de entorno de Netlify y en `.env.local` (que está en .gitignore). **El repo es público.**
- Variables esperadas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_SITE_URL`.
- Los IDs de Pixel y de GTM sí son públicos y van escritos en el código a propósito: son una variable menos que se puede quedar sin configurar.
- La service role key solo se usa en el servidor (`lib/supabase/admin.ts`, rutas de API). Nunca en un componente cliente.
- Toda tabla nueva lleva RLS. Las tablas del CRM se aíslan por `organization_id`; las tablas de captación (como `leads_compradores`) se restringen al equipo interno (`profiles.rol <> 'broker'`) y se escriben solo desde el servidor.

## Estilo visual

Para CUALQUIER cosa visual (pantallas, componentes, ajustes de UI), consulta la skill **kyrelo-diseno**. Resumen mínimo: estética "Editorial premium · Grafito + Cobre", titulares Fraunces, cuerpo Inter. La paleta antigua monocroma (#FAFAF7/#141414) está OBSOLETA — si la ves en algún prompt viejo, ignórala.
