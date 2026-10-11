// For the native app: should the check-in popup open now? Billing/onboarding priority is enforced by the app.
import { NextResponse } from 'next/server';
import { customerFromRequest } from '@/lib/appAuth';
import { db } from '@/lib/db';
import { dayKey } from '@/lib/points';
import { getRules, getSetting } from '@/lib/settings';

export async function GET(req: Request) {
  const customerId = await customerFromRequest(req);
  if (!customerId) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  const [popup, rules] = await Promise.all([getSetting('popup'), getRules()]);
  const day = dayKey(Date.now(), rules.reset);
  const [ci, open] = await Promise.all([
    db.checkIn.findUnique({ where: { customerId_day: { customerId, day } }, select: { id: true } }),
    db.dailyOpen.findUnique({ where: { customerId_day: { customerId, day } } }),
  ]);
  return NextResponse.json({ show: popup.on && !ci && !open?.dismissed, billingFirst: popup.prio, waitOnboarding: popup.onb, path: '/app/popup' });
}
