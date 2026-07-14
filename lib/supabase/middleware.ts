import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión en cada petición y protege las rutas privadas.
 * Rutas públicas: /login, /registro-broker, /recuperar, /nueva-clave
 * y los portafolios /p/[token].
 * Regla de roles:
 *  - rol 'broker' (o sin perfil) → SOLO puede estar en /broker
 *  - cualquier otro rol (owner, agente, etc.) → zona privada normal
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esPublica =
    path === "/login" ||
    path === "/registro-broker" ||
    path === "/recuperar" ||
    path === "/nueva-clave" ||
    path.startsWith("/p/") ||
    path === "/inmuebles" ||
    path.startsWith("/inmuebles/") ||
    path === "/sitemap.xml" ||
    path === "/robots.txt";

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Lee el rol. Si no hay perfil legible, por seguridad se trata
    // como broker (acceso mínimo, nunca entra a la zona privada).
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();
    const esInterno = !!perfil && perfil.rol !== "broker";

    // Deja pasar /nueva-clave aunque haya sesión (viene del enlace de reset)
    if (path === "/nueva-clave") {
      return supabaseResponse;
    }

    // Con sesión iniciada, login/registro/recuperar redirigen a su casa
    if (path === "/login" || path === "/registro-broker" || path === "/recuperar") {
      const url = request.nextUrl.clone();
      url.pathname = esInterno ? "/dashboard" : "/broker";
      return NextResponse.redirect(url);
    }

    // Quien NO es interno solo puede estar en /broker
    if (!esInterno && !path.startsWith("/broker") && !esPublica) {
      const url = request.nextUrl.clone();
      url.pathname = "/broker";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
