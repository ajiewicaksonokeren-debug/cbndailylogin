import { SEGMENTS, type BoardCfg, type PopupCfg } from './defaults';
import { DT_RE, TIME_RE, parseWib, type Level, type Rules } from './points';

type R<T> = { ok: true; v: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const isInt = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
const isNum = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && n >= min && n <= max;

export function rules(x: Rules): R<Rules> {
  if (!isInt(x.base, 0, 10000)) return fail('Poin dasar harus angka bulat 0–10.000');
  if (!isInt(x.cycle, 0, 100000)) return fail('Bonus hari ke-7 harus angka bulat');
  if (!isInt(x.expiryMonths, 1, 120)) return fail('Masa berlaku 1–120 bulan');
  if (!TIME_RE.test(x.reset)) return fail('Jam reset format HH:MM:SS');
  if (!x.tiers.length) return fail('Minimal satu tier multiplier');
  for (const [i, t] of x.tiers.entries()) {
    const last = i === x.tiers.length - 1;
    if (!isInt(t.from, 1, 100000) || !isNum(t.m, 0.1, 10)) return fail(`Tier ${i + 1}: isi hari & multiplier dengan benar`);
    if (i === 0 && t.from !== 1) return fail('Tier pertama harus mulai dari hari 1');
    if (i > 0 && t.from !== (x.tiers[i - 1].to ?? 0) + 1) return fail(`Tier ${i + 1} harus mulai tepat setelah tier sebelumnya`);
    if (last ? t.to !== null : !isInt(t.to, t.from, 100000)) return fail(last ? 'Tier terakhir sampai ∞' : `Tier ${i + 1}: "sampai hari" tidak valid`);
  }
  const days = new Set<number>();
  for (const m of x.milestones) {
    if (!isInt(m.day, 1, 100000) || !isInt(m.bonus, 0, 1000000)) return fail('Milestone: isi hari & bonus dengan angka bulat');
    if (days.has(m.day)) return fail(`Milestone hari ${m.day} dobel`);
    days.add(m.day);
  }
  const { base, cycle, expiryMonths, reset, tiers } = x;
  return { ok: true, v: { base, cycle, expiryMonths, reset, tiers, milestones: [...x.milestones].sort((a, b) => a.day - b.day) } };
}

export function levels(x: Level[], current: Level[]): R<Level[]> {
  if (x.length !== current.length) return fail('Jumlah level tidak boleh berubah');
  for (const [i, l] of x.entries()) {
    if (!isInt(l.min, 0, 1e9) || !isNum(l.bonus, 0, 100)) return fail(`${current[i].name}: angka tidak valid`);
    if (i === 0 && l.min !== 0) return fail('Level pertama harus mulai dari 0');
    if (i > 0 && l.min <= x[i - 1].min) return fail(`${current[i].name} harus lebih tinggi dari ${current[i - 1].name}`);
  }
  return { ok: true, v: current.map((c, i) => ({ ...c, min: x[i].min, bonus: x[i].bonus })) };
}

export function popup(x: PopupCfg): R<PopupCfg> {
  if (!x.title?.trim() || x.title.length > 40) return fail('Judul 1–40 karakter');
  if (!x.cta?.trim() || x.cta.length > 24) return fail('Label tombol 1–24 karakter');
  return { ok: true, v: { on: !!x.on, prio: !!x.prio, onb: !!x.onb, title: x.title.trim(), cta: x.cta.trim(), heroId: x.heroId ?? null, successId: x.successId ?? null } };
}

export function board(x: BoardCfg): R<BoardCfg> {
  if (!isInt(x.top, 3, 50)) return fail('Jumlah yang ditampilkan 3–50');
  return { ok: true, v: { p: !!x.p, s: !!x.s, top: x.top, mode: x.mode === 'anon' ? 'anon' : 'ini' } };
}

export type EventInput = {
  name: string; type: 'multiplier' | 'time_window' | 'challenge'; value: number; start: string; end: string;
  windowFrom: string; windowTo: string; targetDays: number; segments: string[]; pushStart: boolean; push3h: boolean;
  draft: boolean; bannerId: string | null;
};

export function event(x: EventInput, now: number) {
  const name = (x.name ?? '').trim();
  if (!name || name.length > 28) return fail('Nama event 1–28 karakter');
  if (!['multiplier', 'time_window', 'challenge'].includes(x.type)) return fail('Tipe tidak valid');
  if (x.type === 'multiplier' ? !isNum(x.value, 1.1, 3) : !isInt(x.value, 1, 100000))
    return fail(x.type === 'multiplier' ? 'Multiplier event ×1,1 – ×3' : 'Nilai bonus harus angka bulat');
  const segments = (x.segments ?? []).filter(s => (SEGMENTS as readonly string[]).includes(s));
  const okS = DT_RE.test(x.start ?? ''), okE = DT_RE.test(x.end ?? '');
  const start = okS ? new Date(parseWib(x.start)) : null, end = okE ? new Date(parseWib(x.end)) : null;
  const win = x.type === 'time_window';
  if (!x.draft) {
    if (!start || !end) return fail('Format waktu YYYY-MM-DD HH:MM:SS');
    if (end <= start) return fail('Waktu selesai harus setelah mulai');
    if (end.getTime() <= now) return fail('Waktu selesai sudah lewat');
    if (win && !(TIME_RE.test(x.windowFrom) && TIME_RE.test(x.windowTo) && x.windowFrom < x.windowTo)) return fail('Jam berlaku tidak valid');
    if (x.type === 'challenge' && !isInt(x.targetDays, 1, Math.ceil((end.getTime() - start.getTime()) / 864e5)))
      return fail('Target hari harus 1 sampai durasi event');
  }
  return {
    ok: true as const,
    v: {
      name, type: x.type, value: x.value, start, end, segments, pushStart: !!x.pushStart, push3h: !!x.push3h, draft: !!x.draft,
      windowFrom: win ? x.windowFrom : null, windowTo: win ? x.windowTo : null,
      targetDays: x.type === 'challenge' ? x.targetDays : null, bannerId: x.bannerId ?? null,
    },
  };
}
