import { db } from './db';
import { getProfiles } from './customers';
import { eventTag, fmtWib } from './points';

export type EventStatus = 'Aktif' | 'Terjadwal' | 'Draft' | 'Selesai';
export const statusOf = (e: { draft: boolean; start: Date | null; end: Date | null }, now = Date.now()): EventStatus =>
  e.draft ? 'Draft' : e.end!.getTime() < now ? 'Selesai' : e.start!.getTime() > now ? 'Terjadwal' : 'Aktif';

export async function participants() {
  const rows = await db.$queryRaw<{ id: string; n: number }[]>`
    SELECT ce."eventId" id, COUNT(DISTINCT c."customerId")::int n FROM "CheckInEvent" ce JOIN "CheckIn" c ON c.id = ce."checkInId" GROUP BY 1`;
  return new Map(rows.map(r => [r.id, r.n]));
}

export async function eventRows(now = Date.now()) {
  const [evs, part] = await Promise.all([db.event.findMany({ orderBy: [{ start: 'desc' }, { createdAt: 'desc' }] }), participants()]);
  const order = { Aktif: 0, Terjadwal: 1, Draft: 2, Selesai: 3 };
  return evs
    .map(e => ({
      ...e, start: e.start ? fmtWib(e.start.getTime()) : null, end: e.end ? fmtWib(e.end.getTime()) : null,
      tag: eventTag(e), status: statusOf(e, now), part: part.get(e.id) ?? null,
    }))
    .sort((a, b) => order[a.status] - order[b.status]);
}

/** Max 1 non-draft event per type at the same time. */
export async function conflictFor(type: string, start: Date | null, end: Date | null, selfId?: string) {
  if (!start || !end) return null;
  return db.event.findFirst({
    where: { type: type as never, draft: false, id: selfId ? { not: selfId } : undefined, start: { lte: end }, end: { gte: start } },
  });
}

type LogRow = Awaited<ReturnType<typeof fetchLog>>[number];
export async function fetchLog(where: object, take: number) {
  return db.checkIn.findMany({ where, orderBy: { at: 'desc' }, take, include: { events: { include: { event: { select: { name: true } } } } } });
}

export async function decorateLog(rows: LogRow[]) {
  const names = await getProfiles(rows.map(r => r.customerId));
  return rows.map(r => ({
    key: r.id,
    t: fmtWib(r.at.getTime()),
    id: r.customerId,
    name: names.get(r.customerId)?.nama ?? '',
    streak: r.streak,
    calc: r.total - r.eventBonus + (r.eventBonus ? ' + ' + r.eventBonus + ' event' : ''),
    poin: r.total,
    ev: r.events.filter(e => e.bonus > 0).map(e => e.event.name).join(', ') || '—',
    dev: r.device,
    raw: r,
  }));
}
