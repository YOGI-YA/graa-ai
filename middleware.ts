import { default as authMiddleware } from 'next-auth/middleware'

export const middleware = authMiddleware

export const config = {
  matcher: ['/dashboard/:path*', '/goals/:path*', '/profile/:path*'],
}
