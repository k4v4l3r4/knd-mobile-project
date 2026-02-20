import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();

  cookieStore.set('admin_token', 'DEMO_TOKEN_ACCESS_GRANTED', {
    path: '/',
    maxAge: 60 * 60,
    sameSite: 'lax',
  });

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL('/dashboard', origin));
}
