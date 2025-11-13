import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the user is authenticated
  if (!session) {
    // If the user is not authenticated and trying to access a protected route
    const requestedPath = req.nextUrl.pathname;
    if (
      requestedPath.startsWith('/dashboard') ||
      requestedPath.startsWith('/tickets')
    ) {
      // Redirect to the login page
      const redirectUrl = new URL('/auth/login', req.url);
      redirectUrl.searchParams.set('redirectedFrom', requestedPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: ['/dashboard/:path*', '/tickets/:path*'],
};
