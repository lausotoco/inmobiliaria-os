import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión en cada petición y protege las rutas privadas.
 * Rutas públicas: /login, /registro-broker y los portafolios /p/[token].
 * Los brokers solo pueden navegar dentro de /marketplace.
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
    path.startsWith("/p/");

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Averigua el rol del usuario (agente o broker)
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();
    const esBroker = perfil?.rol === "broker";

    // Si ya inició sesión y está en login/registro, mándalo a su casa
    if (path === "/login" || path === "/registro-broker") {
      const url = request.nextUrl.clone();
      url.pathname = esBroker ? "/marketplace" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Un broker solo puede estar en /marketplace
    if (esBroker && !path.startsWith("/marketplace") && !esPublica) {
      const url = request.nextUrl.clone();
      url.pathname = "/marketplace";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
