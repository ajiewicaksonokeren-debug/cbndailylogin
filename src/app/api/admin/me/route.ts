import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminAuth';
import { db } from '@/lib/db';

export async function GET() {
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  const now = new Date();
  const activeEvents = await db.event.count({ where: { draft: false, start: { lte: now }, end: { gte: now } } });
  return NextResponse.json({ name: s.name, role: s.role, env: process.env.APP_ENV_LABEL ?? 'Production', serverNow: Date.now(), activeEvents });
}
