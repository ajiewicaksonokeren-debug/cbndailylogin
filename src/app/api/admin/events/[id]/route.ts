import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { conflictFor, statusOf } from '@/lib/admin';
import { db } from '@/lib/db';
import { fmtWib } from '@/lib/points';
import * as V from '@/lib/validate';

type P = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: P) {
  const s = await requireRole('marketing');
  if (s instanceof NextResponse) return s;
  const id = (await params).id;
  const cur = await db.event.findUnique({ where: { id } });
  if (!cur) return bad('Event tidak ditemukan', 404);
  const st = statusOf(cur);
  if (st === 'Selesai') return bad('Event yang sudah selesai tidak bisa diubah');
  const r = V.event(await req.json(), Date.now());
  if (!r.ok) return bad(r.error);
  // Running events: points already granted must stay explainable, so only the end time and copy may change.
  if (st === 'Aktif' && (r.v.type !== cur.type || r.v.value !== cur.value || r.v.start?.getTime() !== cur.start?.getTime() || r.v.draft))
    return bad('Event sedang berjalan: hanya nama, waktu selesai, banner, dan notifikasi yang bisa diubah');
  if (!r.v.draft) {
    const c = await conflictFor(r.v.type, r.v.start, r.v.end, id);
    if (c) return bad(`Bentrok dengan “${c.name}” (${fmtWib(c.start!.getTime())} – ${fmtWib(c.end!.getTime())}). Maks. 1 event per tipe berjalan bersamaan.`);
  }
  return NextResponse.json({ event: await db.event.update({ where: { id }, data: r.v }) });
}

export async function DELETE(_: Request, { params }: P) {
  const s = await requireRole('marketing');
  if (s instanceof NextResponse) return s;
  const id = (await params).id;
  const cur = await db.event.findUnique({ where: { id }, include: { _count: { select: { checkIns: true } } } });
  if (!cur) return bad('Event tidak ditemukan', 404);
  if (cur._count.checkIns) return bad('Event sudah dipakai check-in, tidak bisa dihapus');
  await db.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
