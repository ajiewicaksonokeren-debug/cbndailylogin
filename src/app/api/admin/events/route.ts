import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { conflictFor, eventRows } from '@/lib/admin';
import { db } from '@/lib/db';
import { fmtWib } from '@/lib/points';
import * as V from '@/lib/validate';

export async function GET() {
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  return NextResponse.json({ events: await eventRows() });
}

export async function POST(req: Request) {
  const s = await requireRole('marketing');
  if (s instanceof NextResponse) return s;
  const r = V.event(await req.json(), Date.now());
  if (!r.ok) return bad(r.error);
  if (!r.v.draft) {
    const c = await conflictFor(r.v.type, r.v.start, r.v.end);
    if (c) return bad(`Bentrok dengan “${c.name}” (${fmtWib(c.start!.getTime())} – ${fmtWib(c.end!.getTime())}). Maks. 1 event per tipe berjalan bersamaan.`);
  }
  return NextResponse.json({ event: await db.event.create({ data: r.v }) });
}
