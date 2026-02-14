import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika akses /dashboard tapi tidak punya token -> redirect ke /login
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Jika akses /login tapi SUDAH punya token -> redirect ke /dashboard
  if (pathname.startsWith('/login')) {
    // Jika ada flag expired=1, biarkan masuk ke login dan hapus cookie nanti (atau di client)
    // Sebaiknya kita hapus cookie via response header di sini untuk memastikan
    if (request.nextUrl.searchParams.get('expired') === '1') {
      const response = NextResponse.next();
      response.cookies.delete('admin_token');
      return response;
    }

    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 3. Jika akses root / -> redirect ke /dashboard (biar dicek auth-nya)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/'],
};
