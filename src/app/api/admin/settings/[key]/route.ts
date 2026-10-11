import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { levelIndex, type Level } from '@/lib/points';
import { getSetting, saveRules, setSetting } from '@/lib/settings';
import * as V from '@/lib/validate';

const KEYS = ['rules', 'levels', 'popup', 'board'] as const;
type Key = (typeof KEYS)[number];

async function levelUsers(levels: Level[]) {
  const rows = await db.$queryRaw<{ v: number }[]>`SELECT SUM(points)::int v FROM "PointTx" GROUP BY "customerId"`;
  const n = levels.map(() => 0);
  for (const r of rows) n[levelIndex(levels, r.v)]++;
  const members = await db.member.count();
  n[0] += Math.max(0, members - rows.length);
  return n;
}

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key as Key;
  if (!KEYS.includes(key)) return bad('Not found', 404);
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  if (key === 'rules') { const slot = await getSetting('rules'); return NextResponse.json({ value: slot.next, from: slot.from }); }
  const value = await getSetting(key);
  if (key === 'levels') return NextResponse.json({ value, users: await levelUsers(value as Level[]) });
  return NextResponse.json({ value });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key as Key;
  if (!KEYS.includes(key)) return bad('Not found', 404);
  const s = await requireRole('marketing');
  if (s instanceof NextResponse) return s;
  const body = await req.json();
  if (key === 'rules') {
    const r = V.rules(body);
    if (!r.ok) return bad(r.error);
    return NextResponse.json({ value: r.v, from: await saveRules(r.v) });
  }
  const r = key === 'levels' ? V.levels(body, await getSetting('levels')) : key === 'popup' ? V.popup(body) : V.board(body);
  if (!r.ok) return bad(r.error);
  await setSetting(key, r.v as never);
  return NextResponse.json({ value: r.v });
}
