import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.get('user-agent')) {
    requestHeaders.set('user-agent', 'Mozilla/5.0 (compatible; HyperDeliveryBot/1.0)');
  }
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, icon.png, apple-icon.png
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|apple-icon.png).*)',
  ],
};
