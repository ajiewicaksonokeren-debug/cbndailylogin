// Pure view builders shared by the server (real status) and admin previews (sample status).
import { addDays, calcDay, dayStart, eventBonus, eventTag, fm, fmt, inWindow, type EventLite, type Level, type Rules } from './points';

const DAY = 864e5;

export function eventDesc(e: Pick<EventLite, 'type' | 'value' | 'windowFrom' | 'windowTo' | 'targetDays'>) {
  if (e.type === 'multiplier') return `Poin harian (base + multiplier + bonus level) dikali ${fm(e.value)} selama event.`;
  if (e.type === 'time_window') return `Check-in antara ${e.windowFrom}–${e.windowTo} WIB dapat +${fmt(e.value)} poin. Dihitung dari jam server, sampai detik.`;
  return `Check-in ${e.targetDays} hari selama event, dapat +${fmt(e.value)} poin di hari ke-${e.targetDays}.`;
}

export type Tile = { label: string; pts: string; state: 'done' | 'today' | 'locked' | 'bonus'; ev: boolean; evTag: string };
export type EventView = {
  id: string; name: string; type: EventLite['type']; tag: string; desc: string; end: number;
  windowFrom: string | null; windowTo: string | null; bannerId: string | null; bonus: number;
  progress: { done: number; target: number } | null;
};
export type Breakdown = {
  base: number; m: number; baseAfter: number; levelName: string; levelPct: number; lb: number;
  cyc: number; ms: number; streak: number; events: { name: string; bonus: number }[]; total: number;
};

/** 7-tile cycle shown in popup, home card and Poin Saya. */
export function buildWeek(r: Rules, lv: Level, streakBefore: number, claimed: boolean, today: string, now: number, evs: EventLite[]): Tile[] {
  const todayS = streakBefore + 1, cycleDay = (streakBefore % 7) + 1;
  return [1, 2, 3, 4, 5, 6, 7].map(i => {
    const s = todayS - cycleDay + i, off = s - todayS, c = calcDay(r, lv.bonus, s);
    const from = dayStart(addDays(today, off), r.reset);
    const at = off === 0 ? now : from + DAY / 2;
    const dayEvs = evs.filter(e => e.type !== 'challenge' && e.start < from + DAY && e.end >= from && (off === 0 || e.type === 'multiplier'));
    const extra = dayEvs.reduce((a, e) => a + eventBonus(e, c, off === 0 ? now : Math.max(at, e.start)), 0);
    const state = i < cycleDay || (i === cycleDay && claimed) ? 'done' : i === cycleDay ? 'today' : c.cyc + c.ms > 0 ? 'bonus' : 'locked';
    const tagEv = off >= 0 ? dayEvs.find(e => e.type === 'multiplier' || (e.type === 'time_window' && (inWindow(e, now) || off > 0))) : undefined;
    return { label: 'H' + s, pts: '+' + fmt(c.total + extra), state, ev: !!tagEv && state !== 'done', evTag: tagEv ? eventTag(tagEv) : '' };
  });
}

export function nextBigText(r: Rules, lv: Level, todayS: number, claimed: boolean) {
  let nb = todayS + (claimed ? 1 : 0);
  while (!(nb % 7 === 0 || r.milestones.some(m => m.day === nb)) && nb < todayS + 400) nb++;
  const gap = nb - todayS;
  if (gap === 0) return 'Hari ini hari bonus!';
  return 'Bonus +' + fmt(calcDay(r, lv.bonus, nb).total) + ' poin di hari ke-' + nb + (gap === 1 ? ' (besok)' : ' (' + gap + ' hari lagi)');
}

