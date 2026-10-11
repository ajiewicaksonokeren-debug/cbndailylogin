import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verify } from '@/lib/session';

export async function middleware(req: NextRequest) {
  if (await verify(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = new URL('/login', req.url);
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
export const config = { matcher: ['/admin/:path*'] };
