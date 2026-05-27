import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Proteger rotas /admin — exige role ADMIN
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login?redirect=/admin', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Rotas que exigem login
        if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/minha-conta')) {
          return !!token;
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: ['/admin/:path*', '/checkout/:path*', '/minha-conta/:path*'],
};
