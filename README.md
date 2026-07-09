# Sabana OS — Módulo 1: Fundación

El sistema operativo de tu negocio inmobiliario. Este módulo deja en línea:
la aplicación desplegada en Netlify, el login privado, el dashboard y la base
de datos completa (14 tablas con seguridad por filas, preparada para todos los
módulos futuros, incluido el marketplace).

**Stack:** Next.js + React + Tailwind · Supabase · Netlify. Nada más.

---

## Puesta en marcha (una sola vez, ~20 minutos)

### Paso 1 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. **New project** → nombre: `inmobiliaria` → elige una contraseña de base de
   datos (guárdala) → región: `South America (São Paulo)` → **Create**.
3. Espera 1-2 minutos a que el proyecto termine de crearse.

### Paso 2 — Crear la base de datos

1. En el menú lateral de Supabase: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia TODO su
   contenido, pégalo en el editor y pulsa **Run**.
3. Debe decir `Success. No rows returned`. Con eso quedaron creadas las 14
   tablas, la seguridad y el bucket de imágenes.

### Paso 3 — Crear tu usuario (y cerrar el registro)

1. Menú lateral: **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Escribe tu correo y una contraseña fuerte. Marca **Auto Confirm User**.
   Con este correo y contraseña entrarás a la aplicación.
3. Ahora cierra la puerta: **Authentication** → **Sign In / Providers** →
   en **Email**, desactiva la opción **Allow new users to sign up** →
   **Save**. Nadie más podrá crear cuentas.

### Paso 4 — Copiar las llaves

1. Menú lateral: **Project Settings** (engranaje) → **API**.
2. Copia dos valores:
   - **Project URL** (algo como `https://abcdefg.supabase.co`)
   - **anon public** key (una cadena larga)

### Paso 5 — Probar en tu computador (opcional pero recomendado)

Necesitas tener instalado [Node.js](https://nodejs.org) (versión 18 o
superior). Luego, en la carpeta del proyecto:

```bash
cp .env.example .env.local
# Abre .env.local y pega tu URL y tu anon key del Paso 4

npm install
npm run dev
```

Abre `http://localhost:3000`: debe aparecer el login. Entra con el usuario
del Paso 3 y verás el dashboard.

### Paso 6 — Subir el código a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no la tienes.
2. Crea un repositorio nuevo, **privado**, llamado `inmobiliaria-os`.
3. En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Módulo 1: Fundación"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/inmobiliaria-os.git
git push -u origin main
```

### Paso 7 — Desplegar en Netlify

1. Entra a [netlify.com](https://netlify.com) → **Add new site** →
   **Import an existing project** → conecta GitHub → elige `inmobiliaria-os`.
2. Netlify detecta Next.js automáticamente. Antes de desplegar, en
   **Environment variables** añade las dos del Paso 4:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**. En 2-3 minutos tendrás tu URL (puedes cambiarle el nombre en
   Site settings, ej. `mi-inmobiliaria.netlify.app`).

### Paso 8 — Verificar

Abre tu URL de Netlify: login → entrar → dashboard con las tarjetas en cero
y el mensaje "La fundación está en línea". **Módulo 1 completo.**

---

## Tu flujo de trabajo desde ahora

Cada vez que agreguemos un módulo:

```bash
git add .
git commit -m "Módulo X"
git push
```

Netlify reconstruye y publica solo. Ese es todo tu "DevOps".

---

## Estructura del proyecto

```
app/
  (privada)/        Pantallas que requieren login (dashboard, clientes…)
  login/            Inicio de sesión
  globals.css       Colores y tipografías del sistema
components/         Piezas de interfaz reutilizables
lib/
  config.ts         Nombre de la app (cámbialo aquí)
  supabase/         Conexión a la base de datos
  types.ts          Tipos de datos de todas las tablas
supabase/
  schema.sql        La base de datos completa, versionada
middleware.ts       Protege las rutas privadas
netlify.toml        Configuración de despliegue
```

## Cambiar el nombre y la marca

Edita `lib/config.ts` (nombre de la app) y, si quieres otros colores, las
variables en `app/globals.css` (`--bosque`, `--laton`, etc.).

## Módulos siguientes

2. CRM + Requerimientos · 3. Propiedades + galería · 4. Matching IA ·
5. Portafolios · 6. WhatsApp · 7. Asistente IA · 8. Dashboard completo
