import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const session = request.cookies.get('ecosphere_session');
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Define patterns we want to bypass (static files, images, etc.)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/login'
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  // Redirect if no session cookie exists
  if (!session || !session.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

// Config to specify matching paths
export const config = {
  matcher: [
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)',
  ],
};
