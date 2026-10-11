import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/appAuth';
import { leaderboard } from '@/lib/checkin';

export async function GET(req: Request) {
  const id = await customerFromRequest(req);
  if (!id) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  const mode = new URL(req.url).searchParams.get('mode') === 'streak' ? 'streak' : 'poin';
  return NextResponse.json(await leaderboard(mode, id));
}
