---
name: kyrelo-diseno
description: Sistema de diseño oficial de KYRELO — estética "Editorial premium · Grafito + Cobre". Usa esta skill SIEMPRE que se cree o modifique cualquier cosa visual para la plataforma de Laura - pantallas, componentes, tarjetas, botones, badges, landing pages, portafolios públicos, emails, presentaciones o piezas de marca — aunque Laura solo diga "hazme una pantalla de X" o "mejora cómo se ve Y" sin mencionar diseño. Evita que se genere UI genérica de IA o se regrese a la paleta antigua obsoleta.
---

# KYRELO — Sistema de diseño

Estética: **Editorial premium · Grafito + Cobre**. Minimalismo cálido tipo revista de arquitectura: la belleza surge de proporciones, tipografía, espacio en blanco y materiales sobrios — nunca de efectos.

## ⚠️ Paleta OBSOLETA (no usar jamás)

La versión anterior era monocroma fría: fondo #FAFAF7, negro #141414, grises #8C8C86/#B9B9B3, líneas #E6E6E1, todo en Inter. Si un prompt, documento o código viejo la menciona, **está desactualizada**. No "restaures" pantallas a esa paleta.

## Paleta actual (variables en `app/globals.css`)

| Variable | Hex | Uso |
|---|---|---|
| `--fondo` | #F1EFE8 | hueso — fondo general |
| `--superficie` | #FFFFFF | tarjetas |
| `--tinta` / `--grafito` | #1A1A18 | texto base, acción primaria, autoridad |
| `--grafito-oscuro` | #0F0F0E | grafito profundo |
| `--grafito-suave` | #E8E5DB | gris cálido de apoyo |
| `--neutro` | #5F5E5A | piedra — texto secundario |
| `--linea` | #E0DDD2 | divisorias hairline tono hueso |
| `--cobre` | #B87333 | acento premium (detalles, nunca masivo) |
| `--cobre-suave` | #EBDBC8 | cobre diluido para fondos sutiles |

Rojo apagado para estados de atención: texto #8E3B31 sobre borde #D5BBB5.
El cobre es un acento quirúrgico: iconos, subrayados, cifras destacadas, hover selectivo. Nunca botones enteros ni fondos grandes.

## Tipografía

- **Titulares (h1–h3, `.font-display`):** Fraunces (serif editorial), `letter-spacing: -0.02em`, `font-optical-sizing: auto`.
- **Cuerpo:** Inter, `letter-spacing: -0.011em`, antialiased.
- Etiquetas/badges: mayúsculas 9px, `tracking-[0.1em]`, font-semibold.

## Componentes canónicos (usar los existentes, no inventar)

**Botón primario — clase `.bg-bosque`** (⚠️ nombre heredado: NO es verde, es el pill grafito oficial; no lo renombres ni lo "corrijas"):
pill `border-radius: 999px`, fondo #1A1A18, texto blanco, font-weight 600, hover `opacity: 0.82` + `translateY(-1px)`, sin sombras.

**Tarjetas — clases `.glass` / `.tarjeta-viva`:** fondo blanco, borde hairline `var(--linea)`, sin sombras pesadas. `.tarjeta-viva` en hover: `translateY(-2px)`, borde #CFC9BB y sombra difusa muy tenue `0 12px 32px -20px rgba(26,26,24,0.18)`.

**Badges — componente `components/ui/Badge.tsx`:** pill transparente, borde hairline, mayúsculas 9px. Estados positivos en grafito (`border-[#1A1A18]/25`), estados de atención en rojo apagado. Usa siempre este componente; no crees badges nuevos a mano.

**Acentos — clases existentes:** `.acento-cobre`, `.bg-cobre`, `.border-cobre`. ⚠️ `.grad-acento` es grafito SÓLIDO (nombre heredado, no es un gradiente).

**Animaciones:** solo las existentes — `.anim-entrada` (fadeInUp 0.55s), `.anim-fade`, `.anim-barra` — con curva `cubic-bezier(0.22, 1, 0.36, 1)`. Nada de animaciones llamativas nuevas.

## Prohibiciones absolutas

- Gradientes de color, glassmorphism real, neón, colores saturados, sombras pesadas o azuladas.
- Emojis como elementos de UI.
- Bordes redondeados genéricos tipo "tarjeta de IA" (rounded-xl con sombra grande).
- Tipografías nuevas: solo Fraunces + Inter.
- Componentes de librerías visuales externas que traigan su propio estilo.

## Por contexto

- **Zona privada (CRM):** densidad editorial, retícula suiza, mucho aire, jerarquía por tamaño tipográfico y no por color.
- **Páginas públicas (landing, /brokers, /inmuebles, portafolios /p/[token]):** el mismo sistema pero más generoso: titulares Fraunces grandes, fotografía protagonista, cobre en micro-detalles. Los portafolios nunca muestran la fuente del anuncio original.
- **Textos de UI:** español colombiano sobrio, sin signos de admiración gratuitos, precios con `formatoCOP` de `lib/utils.ts`.

## Checklist antes de entregar cualquier pantalla

1. ¿Fondo hueso #F1EFE8 y tarjetas blancas con hairline?
2. ¿Titulares en Fraunces y cuerpo en Inter?
3. ¿Botones primarios con `.bg-bosque` (pill grafito)?
4. ¿Badges con el componente Badge existente?
5. ¿El cobre aparece solo como detalle premium?
6. ¿Cero gradientes, cero sombras pesadas, cero paleta obsoleta?
7. ¿Leíste el archivo real del repo antes de modificarlo? (regla de oro de la skill `kyrelo`)
