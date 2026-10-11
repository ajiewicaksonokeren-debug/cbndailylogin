import { Prisma } from '@prisma/client';
import { db } from './db';
import { getRules, getSetting } from './settings';
import { getProfiles, matchesSegments, type Profile } from './customers';
import {
  addDays, calcDay, dayKey, eventBonus, eventTag, fmt, hms, initials, levelIndex, multAt, nextReset, type EventLite,
} from './points';
import { buildWeek, eventDesc, nextBigText, type Breakdown, type EventView } from './view';

const DAY = 864e5;
const TYPE_ORDER = { multiplier: 0, time_window: 1, challenge: 2 } as const;

async function liveEvents(now: number): Promise<EventLite[]> {
  const rows = await db.event.findMany({
    where: { draft: false, start: { lte: new Date(now + 8 * DAY) }, end: { gte: new Date(now) } },
  });
  return rows.map(e => ({ ...e, start: e.start!.getTime(), end: e.end!.getTime() }));
}

async function totals(customerId: string, now: number, client: Prisma.TransactionClient = db) {
  const [life, bal] = await Promise.all([
    client.pointTx.aggregate({ where: { customerId }, _sum: { points: true } }),
    client.pointTx.aggregate({ where: { customerId, expiresAt: { gt: new Date(now) } }, _sum: { points: true } }),
  ]);
  return { lifetime: life._sum.points ?? 0, balance: bal._sum.points ?? 0 };
}

const forUser = (evs: EventLite[], p: Profile | undefined, lvl: number) => evs.filter(e => matchesSegments(e.segments, p, lvl));
const activeAt = (e: EventLite, at: number) => at >= e.start && at <= e.end;

const relDay = (key: string, today: string) => {
  const d = Math.round((Date.parse(today) - Date.parse(key)) / DAY);
  return d === 0 ? 'Hari ini' : d === 1 ? 'Kemarin' : d + ' hari lalu';
};

export async function getStatus(customerId: string, now = Date.now()) {
  const [rules, levels, popup, board] = await Promise.all([getRules(now), getSetting('levels'), getSetting('popup'), getSetting('board')]);
  const today = dayKey(now, rules.reset), yesterday = addDays(today, -1);
  const [member, profiles, evsAll, tot, todayCi, opened] = await Promise.all([
    db.member.findUnique({ where: { customerId } }),
    getProfiles([customerId]),
    liveEvents(now),
    totals(customerId, now),
    db.checkIn.findUnique({ where: { customerId_day: { customerId, day: today } }, include: { events: { include: { event: true } } } }),
    db.dailyOpen.upsert({ where: { customerId_day: { customerId, day: today } }, create: { customerId, day: today }, update: {} }),
  ]);
  const profile = profiles.get(customerId);
  const claimed = !!todayCi;
  const alive = claimed || member?.lastDay === yesterday;
  const streakBefore = claimed ? todayCi.streak - 1 : alive ? member!.streak : 0;
  const todayS = streakBefore + 1;
  const li = levelIndex(levels, tot.lifetime), lv = levels[li], nx = levels[li + 1];
  const evs = forUser(evsAll, profile, li);
  const active = evs.filter(e => activeAt(e, now)).sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

  let breakdown: Breakdown;
  if (todayCi) {
    breakdown = {
      base: rules.base, m: todayCi.mult, baseAfter: todayCi.base, levelName: lv.name, levelPct: lv.bonus, lb: todayCi.levelBonus,
      cyc: todayCi.cycleBonus, ms: todayCi.milestone, streak: todayCi.streak, total: todayCi.total,
      events: todayCi.events.map(x => ({ name: x.event.name, bonus: x.bonus })),
    };
  } else {
    const c = calcDay(rules, lv.bonus, todayS);
    const evRows = active.filter(e => e.type !== 'challenge').map(e => ({ name: e.name, bonus: eventBonus(e, c, now) }));
    breakdown = {
      base: rules.base, m: c.m, baseAfter: c.base, levelName: lv.name, levelPct: lv.bonus, lb: c.lb, cyc: c.cyc, ms: c.ms,
      streak: todayS, events: evRows, total: c.total + evRows.reduce((a, x) => a + x.bonus, 0),
    };
  }

  const challenges = active.filter(e => e.type === 'challenge');
  const progress = new Map<string, number>();
  await Promise.all(challenges.map(async e => progress.set(e.id, await db.checkIn.count({
    where: { customerId, at: { gte: new Date(e.start), lte: new Date(e.end) } },
  }))));
  const events: EventView[] = active.map(e => ({
    id: e.id, name: e.name, type: e.type, tag: eventTag(e), desc: eventDesc(e), end: e.end,
    windowFrom: e.windowFrom ?? null, windowTo: e.windowTo ?? null, bannerId: e.bannerId ?? null,
    bonus: breakdown.events.find(x => x.name === e.name)?.bonus ?? 0,
    progress: e.type === 'challenge' ? { done: Math.min(progress.get(e.id) ?? 0, e.targetDays ?? 0), target: e.targetDays ?? 0 } : null,
  }));

  const txs = await db.pointTx.findMany({ where: { customerId }, orderBy: [{ at: 'desc' }, { id: 'asc' }], take: 10 });
  const rank = board.p ? await pointsRank(customerId, now) : null;
  const topN = board.p ? await db.$queryRaw<{ v: number }[]>`
    SELECT SUM(points)::int AS v FROM "PointTx" WHERE at >= ${new Date(monthStart(now))}
    GROUP BY "customerId" ORDER BY v DESC LIMIT 1 OFFSET ${board.top - 1}` : [];

  return {
    serverNow: now,
    resetAt: nextReset(now, rules.reset),
    customer: { id: customerId, name: profile?.nama ?? '', initials: profile ? initials(profile.nama) : '' },
    claimed,
    claimedAt: todayCi ? hms(todayCi.at.getTime()) : null,
    streak: claimed ? todayCi.streak : streakBefore,
    todayStreak: todayS,
    mult: multAt(rules, claimed ? todayS : Math.max(1, streakBefore)),
    week: buildWeek(rules, lv, streakBefore, claimed, today, now, evs),
    nextBig: nextBigText(rules, lv, todayS, claimed),
    breakdown,
    balance: tot.balance,
    lifetime: tot.lifetime,
    level: { name: lv.name, bonus: lv.bonus, pct: nx ? Math.round(((tot.lifetime - lv.min) / (nx.min - lv.min)) * 100) : 100, next: nx ? fmt(nx.min - tot.lifetime) + ' lagi ke ' + nx.name : 'level tertinggi' },
    events,
    rank: rank && { rank: rank.rank, top: board.top, gap: topN[0] && rank.rank > board.top ? topN[0].v - rank.v : 0 },
    history: txs.map(t => ({ t: t.label, d: relDay(dayKey(t.at.getTime(), rules.reset), today) + ' · ' + hms(t.at.getTime()) + ' WIB', v: t.points })),
    popup: { on: popup.on, prio: popup.prio, onb: popup.onb, title: popup.title, cta: popup.cta, heroId: popup.heroId, successId: popup.successId, show: popup.on && !claimed && !opened.dismissed },
  };
}
export type Status = Awaited<ReturnType<typeof getStatus>>;

export class AlreadyClaimed extends Error {}
export class NotEligible extends Error {}

const addMonths = (at: number, n: number) => { const d = new Date(at); d.setUTCMonth(d.getUTCMonth() + n); return d; };

export async function claim(customerId: string, device: string, now = Date.now()) {
  const [rules, levels, profiles] = await Promise.all([getRules(now), getSetting('levels'), getProfiles([customerId])]);
  const profile = profiles.get(customerId);
  if (profile && !/^(active|aktif)$/i.test(profile.status)) throw new NotEligible('Akun tidak aktif');
  const today = dayKey(now, rules.reset), yesterday = addDays(today, -1);
  const evsAll = await liveEvents(now);
  await db.member.createMany({ data: [{ customerId }], skipDuplicates: true });
  try {
    return await db.$transaction(async tx => {
      const m = (await tx.member.findUnique({ where: { customerId } }))!;
      if (m.lastDay === today) throw new AlreadyClaimed();
      const streak = m.lastDay === yesterday ? m.streak + 1 : 1;
      const { lifetime } = await totals(customerId, now, tx);
      const li = levelIndex(levels, lifetime);
      const active = forUser(evsAll, profile, li).filter(e => activeAt(e, now));
      const c = calcDay(rules, levels[li].bonus, streak);
      const evB = active.filter(e => e.type !== 'challenge').map(e => ({ e, bonus: eventBonus(e, c, now) })).filter(x => x.bonus > 0);
      const at = new Date(now), expiresAt = addMonths(now, rules.expiryMonths);

      const ci = await tx.checkIn.create({
        data: {
          customerId, day: today, at, streak, mult: c.m, base: c.base, levelBonus: c.lb, cycleBonus: c.cyc, milestone: c.ms,
          eventBonus: 0, total: c.total, device,
        },
      });
      for (const ch of active.filter(e => e.type === 'challenge')) {
        const n = await tx.checkIn.count({ where: { customerId, at: { gte: new Date(ch.start), lte: new Date(ch.end) } } });
        evB.push({ e: ch, bonus: n === ch.targetDays ? Math.round(ch.value) : 0 });
      }
      const eventTotal = evB.reduce((a, x) => a + x.bonus, 0);
      await tx.checkIn.update({ where: { id: ci.id }, data: { eventBonus: eventTotal, total: c.total + eventTotal } });
      if (evB.length) await tx.checkInEvent.createMany({ data: evB.map(x => ({ checkInId: ci.id, eventId: x.e.id, bonus: x.bonus })) });
      await tx.pointTx.createMany({
        data: [
          { customerId, at, label: 'Check-in hari ke-' + streak, points: c.total, expiresAt, checkInId: ci.id },
          ...evB.filter(x => x.bonus > 0).map(x => ({ customerId, at, label: 'Bonus ' + x.e.name, points: x.bonus, expiresAt, checkInId: ci.id })),
        ],
      });
      await tx.member.update({ where: { customerId }, data: { streak, lastDay: today, lastCheckInAt: at } });
      return { total: c.total + eventTotal, claimedAt: hms(now), streak };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AlreadyClaimed();
    throw e;
  }
}

/** Leaderboard month starts on the 1st, 00:00:00 WIB. */
export const monthStart = (now: number) => Date.parse(new Date(now + 7 * 3600e3).toISOString().slice(0, 8) + '01T00:00:00+07:00');

async function pointsRank(customerId: string, now: number) {
  const since = new Date(monthStart(now));
  const [r] = await db.$queryRaw<{ rank: number; v: number }[]>`
    WITH a AS (SELECT "customerId" c, SUM(points) v, MAX(at) t FROM "PointTx" WHERE at >= ${since} GROUP BY 1),
         me AS (SELECT COALESCE((SELECT v FROM a WHERE c = ${customerId}), 0) v, COALESCE((SELECT t FROM a WHERE c = ${customerId}), now()) t)
    SELECT (SELECT COUNT(*) FROM a, me WHERE a.v > me.v OR (a.v = me.v AND a.t < me.t))::int + 1 AS rank, (SELECT v FROM me)::int AS v`;
  return r;
}

async function streakRank(customerId: string, yesterday: string) {
  const [r] = await db.$queryRaw<{ rank: number; v: number }[]>`
    WITH a AS (SELECT "customerId" c, streak v, "lastCheckInAt" t FROM "Member" WHERE "lastDay" >= ${yesterday}),
         me AS (SELECT COALESCE((SELECT v FROM a WHERE c = ${customerId}), 0) v, COALESCE((SELECT t FROM a WHERE c = ${customerId}), now()) t)
    SELECT (SELECT COUNT(*) FROM a, me WHERE a.v > me.v OR (a.v = me.v AND a.t < me.t))::int + 1 AS rank, (SELECT v FROM me)::int AS v`;
  return r;
}

export function displayName(p: Profile | undefined, id: string, mode: 'ini' | 'anon') {
  if (!p?.nama) return { name: 'Pelanggan •••' + id.slice(-3), ini: '#' };
  const w = p.nama.trim().split(/\s+/), ini = initials(p.nama);
  return { name: mode === 'anon' ? ini.split('').join('.') + '.' : w[0] + (w[1] ? ' ' + w[1][0] + '.' : ''), ini };
}

export async function leaderboard(mode: 'poin' | 'streak', customerId: string | null, now = Date.now()) {
  const [board, rules] = await Promise.all([getSetting('board'), getRules(now)]);
  const enabled = mode === 'poin' ? board.p : board.s;
  if (!enabled) return { enabled, rows: [], me: null, month: '' };
  const yesterday = addDays(dayKey(now, rules.reset), -1);
  const rows = mode === 'poin'
    ? await db.$queryRaw<{ c: string; v: number; t: Date }[]>`
        SELECT "customerId" c, SUM(points)::int v, MAX(at) t FROM "PointTx" WHERE at >= ${new Date(monthStart(now))}
        GROUP BY 1 ORDER BY v DESC, t ASC LIMIT ${board.top}`
    : await db.$queryRaw<{ c: string; v: number; t: Date }[]>`
        SELECT "customerId" c, streak v, "lastCheckInAt" t FROM "Member" WHERE "lastDay" >= ${yesterday}
        ORDER BY v DESC, t ASC LIMIT ${board.top}`;
  const profiles = await getProfiles([...rows.map(r => r.c), ...(customerId ? [customerId] : [])]);
  const val = (v: number) => (mode === 'poin' ? fmt(v) + ' P' : v + ' hari');
  let me = null;
  if (customerId) {
    const r = mode === 'poin' ? await pointsRank(customerId, now) : await streakRank(customerId, yesterday);
    const last = await db.member.findUnique({ where: { customerId } });
    const checkedToday = last?.lastDay === dayKey(now, rules.reset);
    const p = profiles.get(customerId);
    me = { rank: r.rank, val: val(r.v), name: p?.nama ?? '', ini: p ? initials(p.nama) : '', sub: checkedToday ? 'Check-in ' + hms(last!.lastCheckInAt!.getTime()) + ' WIB' : 'Belum check-in hari ini' };
  }
  const month = new Date(now + 7 * 3600e3).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    enabled, month, top: board.top, me,
    rows: rows.map((r, i) => ({ rank: i + 1, ...displayName(profiles.get(r.c), r.c, board.mode), val: val(r.v), time: hms(r.t.getTime()) })),
  };
}
export type Board = Awaited<ReturnType<typeof leaderboard>>;
