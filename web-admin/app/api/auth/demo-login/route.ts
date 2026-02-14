import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // Set a dummy cookie for demo mode
  // In a real scenario, this should ideally obtain a real token from the backend
  // or the backend should be configured to accept this dummy token.
  
  const cookieStore = await cookies();
  
  // Set the admin_token to a demo value
  // We set httpOnly to false so client-side JS (axios) can read it if needed, 
  // though typically authentication tokens should be httpOnly. 
  // However, the existing login uses js-cookie, so it's likely client-accessible.
  cookieStore.set('admin_token', 'DEMO_TOKEN_ACCESS_GRANTED', {
    path: '/',
    maxAge: 60 * 60, // 1 hour
    sameSite: 'lax',
  });

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
