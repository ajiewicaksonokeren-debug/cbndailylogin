import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminAuth';
import { decorateLog, fetchLog, participants } from '@/lib/admin';
import { db } from '@/lib/db';
import { addDays, dayKey, eventTag, fmtWib } from '@/lib/points';
import { getRules } from '@/lib/settings';

export async function GET() {
  const s = await requireRole('cs');
  if (s instanceof NextResponse) return s;
  const now = Date.now(), rules = await getRules(now);
  const today = dayKey(now, rules.reset), yest = addDays(today, -1), sameTimeYest = new Date(now - 864e5);
  const agg = (day: string, upTo?: Date) =>
    db.checkIn.aggregate({ where: { day, ...(upTo && { at: { lte: upTo } }) }, _count: true, _avg: { streak: true }, _sum: { total: true, eventBonus: true } });
  const [t, y, opensT, opensY, hours, evs, part, recent] = await Promise.all([
    agg(today), agg(yest, sameTimeYest),
    db.dailyOpen.count({ where: { day: today } }), db.dailyOpen.count({ where: { day: yest } }),
    db.$queryRaw<{ h: number; n: number }[]>`
      SELECT EXTRACT(HOUR FROM at AT TIME ZONE 'Asia/Jakarta')::int h, COUNT(*)::int n FROM "CheckIn" WHERE day = ${today} GROUP BY 1`,
    db.event.findMany({ where: { draft: false, start: { lte: new Date(now) }, end: { gte: new Date(now) } } }),
    participants(),
    fetchLog({}, 6).then(decorateLog),
  ]);
  const yFull = await db.checkIn.count({ where: { day: yest } });
  const byHour = Array.from({ length: 24 }, (_, h) => hours.find(x => x.h === h)?.n ?? 0);
  return NextResponse.json({
    serverNow: now,
    count: t._count, countPrev: y._count,
    rate: opensT ? t._count / opensT : null, ratePrev: opensY ? yFull / opensY : null,
    avgStreak: t._avg.streak, avgStreakPrev: y._avg.streak,
    points: t._sum.total ?? 0, eventPoints: t._sum.eventBonus ?? 0,
    hours: byHour,
    events: evs.map(e => ({ id: e.id, name: e.name, val: eventTag(e), end: fmtWib(e.end!.getTime()), part: part.get(e.id) ?? 0 })),
    recent: recent.map(({ raw: _, ...r }) => r),
  });
}
