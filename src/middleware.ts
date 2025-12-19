import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from './lib/types';

// Define route access by role
const roleRoutes: Record<string, UserRole[]> = {
  '/admin': ['admin', 'manager'],
  '/vendor': ['admin', 'vendor', 'manager'],
  '/tailor': ['admin', 'tailor', 'manager'],
  '/api/admin': ['admin', 'manager'],
  '/api/vendors': ['admin', 'vendor', 'manager'],
  '/api/tailors': ['admin', 'tailor', 'manager'],
  '/api/approvals': ['admin', 'manager'],
  '/api/inventory': ['admin', 'manager'],
  '/api/qc': ['admin', 'manager'],
  '/api/tailor-payments': ['admin', 'manager'],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token || !allowedRoles.includes(token.role as UserRole)) {
          // Redirect to appropriate dashboard based on role
          if (token?.role === 'vendor') {
            return NextResponse.redirect(new URL('/vendor/dashboard', req.url));
          } else if (token?.role === 'tailor') {
            return NextResponse.redirect(new URL('/tailor/dashboard', req.url));
          } else if (token?.role === 'admin' || token?.role === 'manager') {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
          }
          return NextResponse.redirect(new URL('/login', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Public routes
        if (
          pathname === '/login' ||
          pathname === '/' ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/api/auth')
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

