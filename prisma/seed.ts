// npm run seed            → first admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
// npm run seed -- --demo  → plus demo customers, 25 days of check-ins, sample events (dev only)
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto.ts';
import { DEFAULT_LEVELS, DEFAULT_RULES } from '../src/lib/defaults.ts';
import { addDays, calcDay, dayKey, dayStart, levelIndex, parseWib } from '../src/lib/points.ts';

const db = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL ?? '').toLowerCase(), pw = process.env.SEED_ADMIN_PASSWORD ?? '';
if (!email || pw.length < 10) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 10 chars)');
await db.adminUser.upsert({ where: { email }, create: { email, name: 'Admin CBN', role: 'admin', passwordHash: hashPassword(pw) }, update: {} });
console.log('admin:', email);

if (process.argv.includes('--demo')) {
  if (process.env.NODE_ENV === 'production') throw new Error('--demo is not allowed in production');
  await db.$transaction([db.checkInEvent.deleteMany(), db.pointTx.deleteMany(), db.checkIn.deleteMany(), db.member.deleteMany(), db.dailyOpen.deleteMany(), db.event.deleteMany()]);
  const r = DEFAULT_RULES, now = Date.now(), today = dayKey(now, r.reset);
  let seed = 42; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const ids = ['30110910', ...Array.from({ length: 80 }, (_, i) => String(30111000 + i * 37))];
  for (const id of ids) {
    const demo = id === '30110910', p = 0.55 + rnd() * 0.45;
    let streak = 0, last: string | null = null, life = 0, lastAt: Date | null = null;
    for (let d = -25; d <= 0; d++) {
      const day = addDays(today, d);
      const go = demo ? d >= -12 && d < 0 : rnd() < p;
      const at = new Date(dayStart(day, r.reset) + (5 + rnd() * 16) * 3600e3);
      if (!go || at.getTime() > now) continue;
      streak = last === addDays(day, -1) ? streak + 1 : 1;
      const lv = DEFAULT_LEVELS[levelIndex(DEFAULT_LEVELS, life)], c = calcDay(r, lv.bonus, streak);
      await db.member.upsert({ where: { customerId: id }, create: { customerId: id }, update: {} });
      const ci = await db.checkIn.create({ data: { customerId: id, day, at, streak, mult: c.m, base: c.base, levelBonus: c.lb, cycleBonus: c.cyc, milestone: c.ms, eventBonus: 0, total: c.total, device: rnd() < 0.7 ? 'Android' : 'iOS' } });
      const exp = new Date(at); exp.setUTCMonth(exp.getUTCMonth() + r.expiryMonths);
      await db.pointTx.create({ data: { customerId: id, at, label: 'Check-in hari ke-' + streak, points: c.total, expiresAt: exp, checkInId: ci.id } });
      await db.dailyOpen.upsert({ where: { customerId_day: { customerId: id, day } }, create: { customerId: id, day }, update: {} });
      life += c.total; last = day; lastAt = at;
    }
    if (last) await db.member.update({ where: { customerId: id }, data: { streak, lastDay: last, lastCheckInAt: lastAt } });
    if (rnd() < 0.3) await db.dailyOpen.upsert({ where: { customerId_day: { customerId: id, day: today } }, create: { customerId: id, day: today }, update: {} });
  }
  const t = (k: string, hms: string) => new Date(parseWib(k + ' ' + hms));
  await db.event.createMany({ data: [
    { name: 'Double Poin Akhir Pekan', type: 'multiplier', value: 2, start: t(today, '00:00:00'), end: t(addDays(today, 1), '23:59:59'), segments: [], draft: false },
    { name: 'Early Bird', type: 'time_window', value: 20, start: t(addDays(today, -9), '00:00:00'), end: t(addDays(today, 21), '23:59:59'), windowFrom: '05:00:00', windowTo: '09:00:00', segments: [], draft: false },
    { name: 'Tantangan HUT CBN', type: 'challenge', value: 500, start: t(addDays(today, 10), '00:00:00'), end: t(addDays(today, 16), '23:59:59'), targetDays: 5, segments: ['Cybro Silver+'], draft: false },
    { name: 'Speed Week', type: 'multiplier', value: 1.5, segments: ['Jakarta'], draft: true },
  ] });
  console.log('demo data: %d customers, demo token 30110910', ids.length);
}
await db.$disconnect();
