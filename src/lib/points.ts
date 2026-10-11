// Pure point/time logic shared by server, webview and admin simulation. No imports.

export type Tier = { from: number; to: number | null; m: number };
export type Rules = {
  base: number;
  cycle: number;
  expiryMonths: number;
  reset: string; // HH:MM:SS WIB
  tiers: Tier[];
  milestones: { day: number; bonus: number }[];
};
export type Level = { name: string; min: number; bonus: number; perk: string; color: string };
export type EventType = 'multiplier' | 'time_window' | 'challenge';
export type EventLite = {
  id: string;
  name: string;
  type: EventType;
  value: number;
  start: number;
  end: number;
  windowFrom?: string | null;
  windowTo?: string | null;
  targetDays?: number | null;
  segments: string[];
  bannerId?: string | null;
};

const WIB = 7 * 3600e3;
const DAY = 864e5;
const pad = (n: number) => String(n).padStart(2, '0');

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
export const DT_RE = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const secOf = (hms: string) => {
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

/** Check-in day key (YYYY-MM-DD) for an instant, given the daily reset time in WIB. */
export const dayKey = (at: number, reset: string) => new Date(at + WIB - secOf(reset) * 1000).toISOString().slice(0, 10);
export const addDays = (key: string, n: number) => new Date(Date.parse(key + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
export const dayStart = (key: string, reset: string) => Date.parse(key + 'T00:00:00Z') - WIB + secOf(reset) * 1000;
export const nextReset = (at: number, reset: string) => dayStart(addDays(dayKey(at, reset), 1), reset);

/** "YYYY-MM-DD HH:MM:SS" in WIB <-> epoch ms */
export const parseWib = (s: string) => Date.parse(s.replace(' ', 'T') + '+07:00');
export const fmtWib = (at: number) => {
  const d = new Date(at + WIB);
  return d.toISOString().slice(0, 10) + ' ' + hms(at);
};
export const hms = (at: number) => {
  const d = new Date(at + WIB);
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
};
export const wibSecOfDay = (at: number) => Math.floor(((at + WIB) % DAY) / 1000);

export const multAt = (r: Rules, streak: number) =>
  r.tiers.find(t => streak >= t.from && (t.to == null || streak <= t.to))?.m ?? 1;

export const levelIndex = (levels: Level[], lifetime: number) =>
  levels.reduce((a, l, i) => (lifetime >= l.min ? i : a), 0);

export type DayCalc = { m: number; base: number; lb: number; cyc: number; ms: number; total: number };

/** Points for the check-in that brings the streak to `streak`. Excludes events. */
export const calcDay = (r: Rules, levelBonusPct: number, streak: number): DayCalc => {
  const m = multAt(r, streak);
  const base = Math.round(r.base * m);
  const lb = Math.round((base * levelBonusPct) / 100);
  const cyc = streak > 0 && streak % 7 === 0 ? r.cycle : 0;
  const ms = r.milestones.find(x => x.day === streak)?.bonus ?? 0;
  return { m, base, lb, cyc, ms, total: base + lb + cyc + ms };
};

export const inWindow = (e: EventLite, at: number) => {
  if (!e.windowFrom || !e.windowTo) return false;
  const s = wibSecOfDay(at);
  return s >= secOf(e.windowFrom) && s < secOf(e.windowTo);
};

/** Bonus a multiplier/time_window event adds at instant `at`. Milestone & cycle bonus are never multiplied. */
export const eventBonus = (e: EventLite, c: DayCalc, at: number) => {
  if (at < e.start || at > e.end) return 0;
  if (e.type === 'multiplier') return Math.round((c.base + c.lb) * (e.value - 1));
  if (e.type === 'time_window') return inWindow(e, at) ? Math.round(e.value) : 0;
  return 0;
};

export const eventTag = (e: Pick<EventLite, 'type' | 'value'>) =>
  (e.type === 'multiplier' ? '×' + fm(e.value) : '+' + fmt(e.value));

export const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');
export const fm = (m: number) => String(m).replace('.', ',');
export const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
};
/** "1h 14:18:33" — h = hari */
export const longClock = (sec: number) => {
  const d = Math.floor(Math.max(0, sec) / 86400);
  return (d ? d + 'h ' : '') + clock(sec - d * 86400);
};
export const initials = (name: string) =>
  name.split(/[ .]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
