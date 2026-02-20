import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();

  cookieStore.set('admin_token', 'DEMO_TOKEN_ACCESS_GRANTED', {
    path: '/',
    maxAge: 60 * 60,
    sameSite: 'lax',
  });

  return NextResponse.redirect('/dashboard');
}
