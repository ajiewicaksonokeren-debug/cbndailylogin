import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { db } from '@/lib/db';

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(req: Request) {
  const s = await requireRole('marketing');
  if (s instanceof NextResponse) return s;
  const f = (await req.formData()).get('file');
  if (!(f instanceof File)) return bad('File tidak ada');
  if (!TYPES.includes(f.type)) return bad('Hanya PNG, JPG, atau WebP');
  if (f.size > 2 * 1024 * 1024) return bad('Maks. 2 MB');
  const a = await db.asset.create({ data: { mime: f.type, data: Buffer.from(await f.arrayBuffer()) } });
  return NextResponse.json({ id: a.id });
}
