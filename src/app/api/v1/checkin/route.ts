import { NextResponse } from 'next/server';
import { customerFromRequest, deviceOf } from '@/lib/appAuth';
import { AlreadyClaimed, NotEligible, claim, getStatus } from '@/lib/checkin';

export async function POST(req: Request) {
  const id = await customerFromRequest(req);
  if (!id) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  try {
    const result = await claim(id, deviceOf(req));
    return NextResponse.json({ result, status: await getStatus(id) });
  } catch (e) {
    if (e instanceof AlreadyClaimed) return NextResponse.json({ error: 'Sudah check-in hari ini', status: await getStatus(id) }, { status: 409 });
    if (e instanceof NotEligible) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
