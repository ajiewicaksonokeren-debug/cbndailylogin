import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminAuth';
import { decorateLog, fetchLog } from '@/lib/admin';

/** Digits → server-side ID filter. Text → name match within the latest 500 rows (names live in the CBN API, not here). */
export async function GET(req: Request) {
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().toLowerCase();
  const byId = /^\d+$/.test(q);
  const rows = await decorateLog(await fetchLog(byId ? { customerId: { contains: q } } : {}, q && !byId ? 500 : 30));
  const out = q && !byId ? rows.filter(r => r.name.toLowerCase().includes(q)) : rows;
  return NextResponse.json({ rows: out.slice(0, 30).map(({ raw: _, ...r }) => r), count: out.length, nameScope: q && !byId ? 500 : null });
}
