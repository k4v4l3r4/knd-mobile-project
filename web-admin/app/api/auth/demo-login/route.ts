import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();

  cookieStore.set('admin_token', 'DEMO_TOKEN_ACCESS_GRANTED', {
    path: '/',
    maxAge: 60 * 60,
    sameSite: 'lax',
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUrl = new URL('/dashboard', base);

  return NextResponse.redirect(redirectUrl);
}
