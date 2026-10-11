import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE, verify, type Session } from './session';

const RANK = { cs: 0, marketing: 1, admin: 2 } as const;

/** cs = read only, marketing = rules/events/popup/board/levels, admin = + integration. */
export async function requireRole(min: Session['role']): Promise<Session | NextResponse> {
  const s = await verify((await cookies()).get(COOKIE)?.value);
  if (!s) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (RANK[s.role] < RANK[min]) return NextResponse.json({ error: 'Peran Anda tidak punya akses untuk ini' }, { status: 403 });
  return s;
}
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
