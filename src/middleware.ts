import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient as createMiddlewareClient } from '@supabase/ssr'

/**
 * Middleware Edge Runtime — se ejecuta en TODOS los requests.
 * Responsabilidades:
 * 1. Refresca el JWT de Supabase en cada request (token silencioso)
 * 2. Protege las rutas de la app — redirige a /login si no autenticado
 * 3. Redirige a /dashboard si ya autenticado intenta acceder a /login
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Supabase SSR en Edge — necesita acceso a cookies
  const supabase = createMiddlewareClient(
    {
      url:   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key:   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // ⚠️ Siempre llama getUser() — esto refresca el token automáticamente
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute  = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isAppRoute   = !isAuthRoute && !pathname.startsWith('/api') && pathname !== '/'

  // Sin sesión intentando acceder a la app
  if (!user && isAppRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Con sesión intentando acceder a login
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica middleware a todos los paths excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos públicos (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)',
  ],
}
