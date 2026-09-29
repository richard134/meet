import { NextRequest, NextResponse } from 'next/server';

// Who is logged in comes from Traefik: its basic-auth middleware puts the user
// name in X-Forwarded-User on the routes it protects, and a headers middleware
// strips the header on every other route. A NetworkPolicy keeps anything but
// Traefik from reaching the app. Only call this from routes behind the login.
export const USER_HEADER = 'x-forwarded-user';
// Also used as keys in the store, so no leading underscore ("__proto__").
const USER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function loggedInUser(headers: Headers): string | undefined {
  const user = headers.get(USER_HEADER) ?? '';
  return USER_PATTERN.test(user) ? user : undefined;
}

export function isValidUser(user: string) {
  return USER_PATTERN.test(user);
}

// The browser sends the basic-auth credentials with every request to this
// host, cross-site ones included, much like a cookie. State-changing requests
// must therefore come from our own pages. Fetch Metadata covers current
// browsers; the Origin check covers the rest.
export function isSameOrigin(request: NextRequest) {
  const site = request.headers.get('sec-fetch-site');
  if (site) {
    return site === 'same-origin';
  }
  const origin = request.headers.get('origin');
  try {
    return origin !== null && new URL(origin).host === request.headers.get('host');
  } catch {
    // "null" and other opaque origins.
    return false;
  }
}

// For POST/DELETE handlers behind the login: the user, or an error response.
export function authorize(request: NextRequest): { user: string } | { error: NextResponse } {
  if (!isSameOrigin(request)) {
    return { error: new NextResponse('Cross-site request refused', { status: 403 }) };
  }
  const user = loggedInUser(request.headers);
  if (!user) {
    return { error: new NextResponse('Not logged in', { status: 401 }) };
  }
  return { user };
}
