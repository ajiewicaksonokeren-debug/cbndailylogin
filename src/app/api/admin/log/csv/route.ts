import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminAuth';
import { decorateLog, fetchLog } from '@/lib/admin';
import { fm } from '@/lib/points';

const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/** Last 31 days, newest first, max 100k rows. */
export async function GET(req: Request) {
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().toLowerCase();
  const byId = /^\d+$/.test(q);
  const where = { at: { gte: new Date(Date.now() - 31 * 864e5) }, ...(byId && { customerId: { contains: q } }) };
  let rows = await decorateLog(await fetchLog(where, 100000));
  if (q && !byId) rows = rows.filter(r => r.name.toLowerCase().includes(q));
  const head = ['waktu_wib', 'customer_id', 'nama', 'streak', 'poin_dasar', 'multiplier', 'bonus_level', 'bonus_hari_7', 'milestone', 'bonus_event', 'total', 'event', 'perangkat'];
  const lines = rows.map(r => [r.t, r.id, r.name, r.streak, r.raw.base, fm(r.raw.mult), r.raw.levelBonus, r.raw.cycleBonus, r.raw.milestone, r.raw.eventBonus, r.poin, r.ev === '—' ? '' : r.ev, r.dev].map(esc).join(','));
  return new Response('﻿' + [head.join(','), ...lines].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="checkin-log-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
