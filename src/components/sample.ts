// Sample status/board for admin phone previews. Built with the same view logic as the real webview.
import type { Board, Status } from '@/lib/checkin';
import type { BoardCfg, PopupCfg } from '@/lib/defaults';
import { calcDay, dayKey, eventBonus, eventTag, fmt, initials, levelIndex, multAt, nextReset, type EventLite, type Level, type Rules } from '@/lib/points';
import { buildWeek, eventDesc, nextBigText } from '@/lib/view';

export function sampleStatus(o: { now: number; rules: Rules; levels: Level[]; popup: PopupCfg; event?: EventLite | null }): Status {
  const { now, rules, levels, popup } = o, streak = 12, lifetime = 4210, balance = 2340, name = 'Dian Anggraeni';
  const li = levelIndex(levels, lifetime), lv = levels[li], nx = levels[li + 1];
  const evs = o.event ? [o.event] : [];
  const c = calcDay(rules, lv.bonus, streak + 1);
  const evRows = evs.filter(e => e.type !== 'challenge').map(e => ({ name: e.name, bonus: eventBonus(e, c, now) }));
  const total = c.total + evRows.reduce((a, x) => a + x.bonus, 0);
  return {
    serverNow: now, resetAt: nextReset(now, rules.reset),
    customer: { id: '30110910', name, initials: initials(name) },
    claimed: false, claimedAt: null, streak, todayStreak: streak + 1, mult: multAt(rules, streak),
    week: buildWeek(rules, lv, streak, false, dayKey(now, rules.reset), now, evs),
    nextBig: nextBigText(rules, lv, streak + 1, false),
    breakdown: { base: rules.base, m: c.m, baseAfter: c.base, levelName: lv.name, levelPct: lv.bonus, lb: c.lb, cyc: c.cyc, ms: c.ms, streak: streak + 1, events: evRows, total },
    balance, lifetime,
    level: { name: lv.name, bonus: lv.bonus, pct: nx ? Math.round(((lifetime - lv.min) / (nx.min - lv.min)) * 100) : 100, next: nx ? fmt(nx.min - lifetime) + ' lagi ke ' + nx.name : 'level tertinggi' },
    events: evs.map(e => ({
      id: e.id, name: e.name || 'Nama event', type: e.type, tag: eventTag(e), desc: eventDesc(e), end: e.end,
      windowFrom: e.windowFrom ?? null, windowTo: e.windowTo ?? null, bannerId: e.bannerId ?? null,
      bonus: evRows.find(x => x.name === e.name)?.bonus ?? 0,
      progress: e.type === 'challenge' ? { done: Math.min(3, e.targetDays ?? 5), target: e.targetDays ?? 5 } : null,
    })),
    rank: { rank: 24, top: 10, gap: 2573 },
    history: [],
    popup: { ...popup, show: true },
  };
}

const U: [string, number, number, string][] = [['Dimas Aditya', 4820, 98, '05:01:12'], ['Sari Pratiwi', 4515, 186, '04:58:40'], ['Bayu Kurniawan', 4210, 121, '05:30:09'], ['Nadia Rahma', 3980, 87, '06:02:51'], ['Fikri Hidayat', 3760, 142, '05:12:33'], ['Ayu Lestari', 3605, 64, '06:45:18'], ['Rizky Maulana', 3440, 75, '07:03:27'], ['Putri Wulandari', 3300, 60, '05:59:02'], ['Hendra Setiawan', 3120, 52, '06:20:44'], ['Maya Tanjung', 2985, 47, '07:15:36'], ['Andi Saputra', 2900, 40, '06:11:09'], ['Lina Kartika', 2850, 38, '07:40:21']];

export function sampleBoard(cfg: BoardCfg, mode: 'poin' | 'streak', now: number): Board {
  const rows = [...U].sort((a, b) => (mode === 'poin' ? b[1] - a[1] : b[2] - a[2])).slice(0, Math.max(3, Math.min(cfg.top || 10, U.length)));
  const disp = (n: string) => { const w = n.split(' '), ini = initials(n); return { name: cfg.mode === 'anon' ? ini.split('').join('.') + '.' : w[0] + ' ' + w[1][0] + '.', ini }; };
  return {
    enabled: true, top: cfg.top, month: new Date(now + 7 * 3600e3).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    rows: rows.map((u, i) => ({ rank: i + 1, ...disp(u[0]), val: mode === 'poin' ? fmt(u[1]) + ' P' : u[2] + ' hari', time: u[3] })),
    me: { rank: mode === 'poin' ? 24 : 57, val: mode === 'poin' ? '412 P' : '12 hari', name: 'Dian Anggraeni', ini: 'DA', sub: 'Belum check-in hari ini' },
  };
}
