import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/crypto';
import { COOKIE, sign } from '@/lib/session';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const u = await db.adminUser.findUnique({ where: { email: String(email ?? '').toLowerCase() } });
  if (!u || !verifyPassword(String(password ?? ''), u.passwordHash)) return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sign({ uid: u.id, name: u.name, role: u.role, exp: Date.now() + 12 * 3600e3 }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600,
  });
  return res;
}
