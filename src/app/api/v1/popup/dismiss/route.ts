import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/appAuth';
import { db } from '@/lib/db';
import { dayKey } from '@/lib/points';
import { getRules } from '@/lib/settings';

export async function POST(req: Request) {
  const customerId = await customerFromRequest(req);
  if (!customerId) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  const day = dayKey(Date.now(), (await getRules()).reset);
  await db.dailyOpen.upsert({ where: { customerId_day: { customerId, day } }, create: { customerId, day, dismissed: true }, update: { dismissed: true } });
  return NextResponse.json({ ok: true });
}
