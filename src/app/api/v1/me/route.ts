import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/appAuth';
import { getStatus } from '@/lib/checkin';

export async function GET(req: Request) {
  const id = await customerFromRequest(req);
  if (!id) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  return NextResponse.json(await getStatus(id));
}
