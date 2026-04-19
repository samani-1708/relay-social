/**
 * Next.js Middleware — runs at the edge before any page is rendered.
 *
 * Protects /dashboard/* routes by checking for a valid relayman_token cookie.
 * This replaces the client-side <AuthGuard> flash-of-content problem:
 * the browser never receives the page HTML at all if the token is missing.
 *
 * The API is still the authoritative security gate — it validates JWT on every
 * request. Middleware provides a fast UX layer (no client-side redirect flash).
 *
 * JWT verification uses jose (Edge-Runtime compatible) with the JWT_SECRET
 * that must be set in apps/web/.env.local:
 *   JWT_SECRET=<same value as in apps/api/.env>
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'relayman_token';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  // Verify the JWT using jose (works in Edge Runtime without Node crypto).
  // If JWT_SECRET is not set we fall back to a simple existence check so the
  // app still runs in development without the env var.
  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const { jwtVerify } = await import('jose');
      const key = new TextEncoder().encode(secret);
      await jwtVerify(token, key);
    } catch {
      // Token is expired or tampered — clear cookie and send to login
      const res = redirectToLogin(request);
      res.cookies.delete(COOKIE_NAME);
      return res;
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/auth/login', request.url);
  // Preserve the attempted URL so login page can redirect back after auth
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

/** Only run middleware on dashboard routes */
export const config = {
  matcher: ['/dashboard/:path*'],
};
