import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUrl = new URL('/dashboard', base);

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set('admin_token', 'DEMO_TOKEN_ACCESS_GRANTED', {
    path: '/',
    maxAge: 60 * 60,
    sameSite: 'lax',
  });

  return response;
}
