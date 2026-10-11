'use client';
// Presentational check-in UI, ported from CheckinPhone.dc.html. Used by the webview and admin previews.
import type { CSSProperties, ReactNode } from 'react';
import type { Board, Status } from '@/lib/checkin';
import type { EventView, Tile } from '@/lib/view';
import { clock, fm, fmt, longClock, wibSecOfDay, secOf } from '@/lib/points';

const F = "'Plus Jakarta Sans', sans-serif";
const img = (id: string | null) => (id ? `url(/api/assets/${id}) center/cover no-repeat, ` : '');

export const Flame = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#F5A700" aria-hidden><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" /></svg>
);
export const Check = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5L20 7" /></svg>
);
export const Clock = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const Coin = ({ s = 24, f = 13 }: { s?: number; f?: number }) => (
  <div aria-hidden style={{ width: s, height: s, borderRadius: '50%', background: '#F5A700', color: '#fff', font: `800 ${f}px ${F}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>P</div>
);

const TILE = {
  done: { bg: '#E8F3FC', bd: '#CFE4F6', fg: '#0B72C4', sh: 'none' },
  today: { bg: '#0B72C4', bd: '#0B72C4', fg: '#fff', sh: '0 6px 14px rgba(11,114,196,.35)' },
  bonus: { bg: '#FFF6E0', bd: '#FFE2A3', fg: '#8A5A00', sh: 'none' },
  locked: { bg: '#fff', bd: '#E2E9F0', fg: '#6B7684', sh: 'none' },
};

export function Week({ week, small }: { week: Tile[]; small?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
      {week.map(d => {
        const t = TILE[d.state];
        return (
          <div key={d.label} aria-label={`${d.label} ${d.state === 'done' ? 'selesai' : d.pts + ' poin'}`} style={{ height: small ? 40 : 58, borderRadius: 12, background: t.bg, border: '1px solid ' + t.bd, boxShadow: t.sh, color: t.fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all .25s', position: 'relative' }}>
            {d.ev && (small
              ? <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: '#F5A700', border: '2px solid #fff' }} />
              : <span style={{ position: 'absolute', top: -8, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#F5A700', border: '2px solid #fff', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d.evTag}</span>)}
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{d.label}</span>
            {d.state === 'done' ? <Check /> : <b style={{ fontSize: 11, fontWeight: 800 }}>{d.pts}</b>}
          </div>
        );
      })}
    </div>
  );
}

export function evSub(e: EventView, now: number, withProgress = true) {
  const left = 'berakhir ' + longClock((e.end - now) / 1000);
  if (e.type === 'time_window') {
    const s = wibSecOfDay(now);
    return s < secOf(e.windowFrom!) ? 'Mulai ' + e.windowFrom + ' WIB hari ini'
      : s < secOf(e.windowTo!) ? 'Berlaku sampai ' + e.windowTo + ' WIB hari ini'
      : 'Sudah lewat ' + e.windowTo + ' · coba besok lebih pagi';
  }
  if (e.type === 'challenge' && e.progress && withProgress) return `Progres ${e.progress.done}/${e.progress.target} hari · ${left}`;
  return 'Berakhir dalam ' + longClock((e.end - now) / 1000);
}

export const EventStrip = ({ e, now }: { e: EventView; now: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FFF6E0', border: '1px solid #FFE2A3' }}>
    <span style={{ background: '#F5A700', color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 6, letterSpacing: '.04em', flexShrink: 0 }}>EVENT</span>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <b style={{ fontSize: 13.5, color: '#12263A' }}>{e.name}</b>
      <span className="tab" style={{ fontSize: 11.5, color: '#8A5A00' }}>{evSub(e, now)}</span>
    </div>
    <b style={{ fontSize: 15, fontWeight: 800, color: '#8A5A00', flexShrink: 0 }}>{e.tag}</b>
  </div>
);

const btnPrimary: CSSProperties = { height: 50, border: 'none', borderRadius: 12, background: '#0B72C4', color: '#fff', font: `700 15px ${F}`, cursor: 'pointer', width: '100%' };
const btnSecondary: CSSProperties = { height: 50, border: '1px solid #CFE4F6', borderRadius: 12, background: '#E8F3FC', color: '#0B72C4', font: `700 15px ${F}`, cursor: 'pointer', width: '100%' };

type SheetProps = { s: Status; now: number; busy?: boolean; onClaim: () => void; onClose: () => void; onDetail: () => void };

/** Bottom sheet content: claim state, then success state in the same sheet. */
export function SheetBody({ s, now, busy, onClaim, onClose, onDetail }: SheetProps) {
  const ev = s.events[0], total = fmt(s.breakdown.total);
  const applied = s.breakdown.events.filter(x => x.bonus > 0);
  const countdown = clock((s.resetAt - now) / 1000);
  return (
    <div style={{ borderRadius: '24px 24px 0 0', background: '#fff', padding: '10px 18px 28px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 -12px 40px rgba(14,34,51,.18)' }}>
      <div style={{ width: 40, height: 5, borderRadius: 999, background: '#D5DEE7', alignSelf: 'center' }} />
      {!s.claimed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative', height: 150, borderRadius: 16, overflow: 'hidden', background: img(s.popup.heroId) + 'linear-gradient(150deg,#1183CE,#0A4C86)' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ background: 'rgba(255,255,255,.9)', color: '#0E4C86', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}><Flame s={14} />Streak {s.streak} hari</span>
              <button onClick={onClose} aria-label="Tutup" style={{ width: 30, height: 30, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.9)', color: '#12263A', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          </div>
          {ev && <EventStrip e={ev} now={now} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 21, fontWeight: 800 }}>{s.popup.title}</b><span style={{ fontSize: 12.5, color: '#6B7684' }}>{s.nextBig}</span></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0B72C4', background: '#E8F3FC', padding: '5px 10px', borderRadius: 999, flexShrink: 0 }}>×{fm(s.mult)}</span>
          </div>
          <Week week={s.week} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: '#F5F8FB', border: '1px solid #E2E9F0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13, color: '#6B7684' }}>Poin hari ini</span><button onClick={onDetail} style={{ all: 'unset', fontSize: 13, fontWeight: 700, color: '#0B72C4', cursor: 'pointer' }}>Lihat rincian ›</button></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Coin /><b style={{ fontSize: 28, fontWeight: 800 }}>+{total}</b></div>
          </div>
          <button onClick={onClaim} disabled={busy} className="h-primary" style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>{busy ? 'Mencatat…' : s.popup.cta}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6B7684' }}><Clock />Reset dalam <b className="tab" style={{ color: '#12263A' }}>{countdown}</b></span>
            <button onClick={onClose} style={{ all: 'unset', fontSize: 14, fontWeight: 600, color: '#6B7684', cursor: 'pointer', padding: '12px 0' }}>Nanti saja</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative', height: 150, borderRadius: 16, overflow: 'hidden', background: img(s.popup.successId) + 'linear-gradient(150deg,#1183CE,#0A4C86)' }} />
          <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Coin s={28} f={15} /><b style={{ fontSize: 30, fontWeight: 800 }}>+{total} Poin</b></div>
            <span style={{ fontSize: 14, color: '#6B7684' }}>Streak {s.streak} hari · saldo {fmt(s.balance)} poin</span>
            {applied.map(x => <span key={x.name} style={{ fontSize: 12.5, fontWeight: 700, color: '#8A5A00' }}>Termasuk bonus {x.name} +{fmt(x.bonus)}</span>)}
            <span className="tab" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0E4C86', background: '#E8F3FC', padding: '6px 12px', borderRadius: 999 }}><Clock />Tercatat {s.claimedAt} WIB</span>
          </div>
          <Week week={s.week} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onDetail} style={btnSecondary}>Poin Saya</button>
            <button onClick={onClose} className="h-primary" style={btnPrimary}>Oke</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Scrim + sheet. `absolute` inside phone previews, `fixed` in the real webview. */
export const SheetOverlay = (p: SheetProps & { fixed?: boolean }) => (
  <>
    <div onClick={p.onClose} style={{ position: p.fixed ? 'fixed' : 'absolute', inset: 0, background: 'rgba(10,30,50,.45)', animation: 'fadeIn .3s ease-out' }} />
    <div role="dialog" aria-modal="true" aria-label={p.s.popup.title} style={{ position: p.fixed ? 'fixed' : 'absolute', left: 0, right: 0, bottom: 0, animation: 'sheetUp .3s ease-out', maxWidth: p.fixed ? 480 : undefined, margin: '0 auto' }}>
      <SheetBody {...p} />
    </div>
  </>
);

export const AppBar = ({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 12px', background: '#fff', borderBottom: '1px solid #E7EBF0', flexShrink: 0 }}>
    <button onClick={onBack} aria-label="Kembali" className="h-back" style={{ width: 44, height: 44, margin: -5, border: 'none', background: 'transparent', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#12263A', fontSize: 22 }}>‹</button>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 16.5, fontWeight: 800, color: '#12263A' }}>{title}</div>
      {sub && <span style={{ fontSize: 11.5, color: '#6B7684' }}>{sub}</span>}
    </div>
  </div>
);

const card: CSSProperties = { margin: '0 16px', background: '#fff', border: '1px solid #E2E9F0', borderRadius: 16, boxShadow: '0 4px 14px rgba(14,34,51,.06)' };

export function DetailBody({ s, now, busy, onClaim, onRank }: { s: Status; now: number; busy?: boolean; onClaim: () => void; onRank: () => void }) {
  const b = s.breakdown, ev = s.events[0];
  const rows = [
    { k: 'Base harian', v: String(b.base), on: true },
    { k: 'Multiplier streak ×' + fm(b.m), v: '= ' + b.baseAfter, on: true },
    { k: `Bonus Cybro ${b.levelName} +${fm(b.levelPct)}%`, v: b.lb ? '+' + b.lb : '—', on: !!b.lb },
    { k: 'Bonus hari ke-7', v: b.cyc ? '+' + fmt(b.cyc) : '—', on: !!b.cyc },
    { k: 'Milestone ' + b.streak + ' hari', v: b.ms ? '+' + fmt(b.ms) : '—', on: !!b.ms },
    ...b.events.map(x => ({ k: 'Event ' + x.name, v: x.bonus ? '+' + fmt(x.bonus) : '—', on: !!x.bonus })),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 28 }}>
      <div style={{ background: 'linear-gradient(150deg,#1183CE,#0A4C86)', padding: 18, color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.9 }}>Saldo poin</span>
          <span style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12 }}>Cybro {s.level.name} · +{fm(s.level.bonus)}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Coin s={30} f={17} /><b style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.01em' }}>{fmt(s.balance)}</b></div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}><div style={{ height: '100%', width: s.level.pct + '%', background: '#fff', borderRadius: 999, transition: 'width .4s ease-out' }} /></div>
        <span style={{ fontSize: 12, opacity: 0.9 }}>{fmt(s.lifetime)} poin seumur hidup · {s.level.next}</span>
      </div>

      <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Flame s={18} />Streak {s.streak} hari</b>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0B72C4', background: '#E8F3FC', padding: '5px 10px', borderRadius: 999 }}>×{fm(s.mult)}</span>
        </div>
        <Week week={s.week} />
        <span style={{ fontSize: 12.5, color: '#6B7684' }}>{s.nextBig}</span>
        {!s.claimed
          ? <button onClick={onClaim} disabled={busy} className="h-primary" style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>{busy ? 'Mencatat…' : `Klaim +${fmt(b.total)} Poin`}</button>
          : <div className="tab" style={{ height: 46, borderRadius: 12, background: '#E8F7EE', color: '#15803D', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Check s={15} />Tercatat {s.claimedAt} WIB</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6B7684' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock />Reset harian</span>
          <b className="tab" style={{ color: '#12263A' }}>{clock((s.resetAt - now) / 1000)}</b>
        </div>
      </div>

      {ev && (
        <div style={{ ...card, borderColor: '#FFE2A3', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', height: 110, background: img(ev.bannerId) + 'linear-gradient(135deg,#FFB020,#F08A00)' }}>
            <span style={{ position: 'absolute', top: 10, left: 10, background: '#fff', color: '#8A5A00', fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 6, letterSpacing: '.04em' }}>EVENT AKTIF</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><b style={{ fontSize: 15, fontWeight: 800 }}>{ev.name}</b><b style={{ fontSize: 15, fontWeight: 800, color: '#8A5A00' }}>{ev.tag}</b></div>
            <span style={{ fontSize: 13, color: '#3C4A57', lineHeight: 1.5 }}>{ev.desc}</span>
            {ev.progress && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 6, borderRadius: 999, background: '#FFE9BF', overflow: 'hidden' }}><div style={{ height: '100%', width: (ev.progress.done / ev.progress.target) * 100 + '%', background: '#F5A700', borderRadius: 999, transition: 'width .4s ease-out' }} /></div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8A5A00' }}>Progres {ev.progress.done}/{ev.progress.target} hari</span>
              </div>
            )}
            <span className="tab" style={{ fontSize: 12, color: '#6B7684' }}>{evSub(ev, now, false)}</span>
          </div>
        </div>
      )}

      <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <b style={{ fontSize: 15, fontWeight: 800 }}>Rincian poin hari ini</b>
        {rows.map(r => <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, opacity: r.on ? 1 : 0.45 }}><span style={{ color: '#6B7684' }}>{r.k}</span><span style={{ fontWeight: 700 }}>{r.v}</span></div>)}
        <div style={{ height: 1, background: '#EDF1F5' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>Total</b><b style={{ fontSize: 17, fontWeight: 800, color: '#0B72C4' }}>+{fmt(b.total)}</b></div>
      </div>

      {s.rank && (
        <button onClick={onRank} className="h-row" style={{ ...card, width: 'calc(100% - 32px)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: '#E8F3FC', color: '#0B72C4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>#{s.rank.rank}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 15, fontWeight: 800 }}>Peringkat bulan ini</b>
            <span style={{ fontSize: 12, color: '#6B7684' }}>{s.rank.rank <= s.rank.top ? `Anda masuk top ${s.rank.top}` : `${fmt(s.rank.gap)} poin lagi ke top ${s.rank.top}`}</span>
          </div>
          <span style={{ fontSize: 18, color: '#0B72C4' }}>›</span>
        </button>
      )}

      <div style={{ ...card, padding: '4px 16px', display: 'flex', flexDirection: 'column' }}>
        <b style={{ fontSize: 15, fontWeight: 800, padding: '12px 0 4px' }}>Riwayat</b>
        {s.history.length === 0 && <span style={{ fontSize: 13, color: '#6B7684', padding: '11px 0', borderTop: '1px solid #EDF1F5' }}>Belum ada riwayat. Mulai check-in hari ini.</span>}
        {s.history.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: '1px solid #EDF1F5', minHeight: 56 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{l.t}</span><span className="tab" style={{ fontSize: 11.5, color: '#6B7684' }}>{l.d}</span></div>
            <b style={{ fontSize: 14, color: l.v >= 0 ? '#15803D' : '#E11D2E' }}>{l.v >= 0 ? '+' : '−'}{fmt(Math.abs(l.v))}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

const PODIUM: [number, string, string, string, string][] = [[1, '60px', '64px', '#5BB4E8', '#C9D3DD'], [0, '76px', '92px', '#0B72C4', '#F5A700'], [2, '60px', '48px', '#8FD0F5', '#E0B48A']];

export function RankBody({ b, mode, setMode, showModes, youName, fixedMe }: { b: Board; mode: 'poin' | 'streak'; setMode: (m: 'poin' | 'streak') => void; showModes: { p: boolean; s: boolean }; youName: string; fixedMe?: boolean }) {
  const tab = (on: boolean): CSSProperties => ({ height: 38, border: 'none', borderRadius: 9, background: on ? '#fff' : 'transparent', color: on ? '#0B72C4' : '#6B7684', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' });
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 110px' }}>
        {showModes.p && showModes.s && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: '#E3EAF1' }}>
            <button onClick={() => setMode('poin')} aria-pressed={mode === 'poin'} style={tab(mode === 'poin')}>Poin bulan ini</button>
            <button onClick={() => setMode('streak')} aria-pressed={mode === 'streak'} style={tab(mode === 'streak')}>Streak</button>
          </div>
        )}
        {b.rows.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, alignItems: 'end' }}>
            {PODIUM.map(([i, av, ped, bg, ring]) => { const p = b.rows[i]; return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: av, height: av, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 3px #fff,0 0 0 5px ${ring}`, background: '#E8F3FC', color: '#0B72C4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>{p.ini}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}><b style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.name}</b><span style={{ fontSize: 12, fontWeight: 700, color: '#0B72C4' }}>{p.val}</span></div>
                <div style={{ width: '100%', height: ped, borderRadius: '12px 12px 6px 6px', background: bg, color: '#fff', display: 'flex', justifyContent: 'center', paddingTop: 8, fontSize: 20, fontWeight: 800 }}>{i + 1}</div>
              </div>
            ); })}
          </div>
        )}
        <div style={{ background: '#fff', border: '1px solid #E2E9F0', borderRadius: 16, boxShadow: '0 4px 14px rgba(14,34,51,.06)', padding: '2px 14px', display: 'flex', flexDirection: 'column' }}>
          {b.rows.length === 0 && <span style={{ fontSize: 13, color: '#6B7684', padding: '14px 0' }}>Belum ada peserta bulan ini. Jadilah yang pertama!</span>}
          {b.rows.slice(b.rows.length >= 3 ? 3 : 0).map(u => (
            <div key={u.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #EDF1F5' }}>
              <span style={{ width: 20, fontSize: 13, fontWeight: 700, color: '#6B7684', textAlign: 'center' }}>{u.rank}</span>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#EEF2F6', color: '#3C4A57', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{u.ini}</div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</span><span className="tab" style={{ fontSize: 11.5, color: '#6B7684' }}>Check-in {u.time}</span></div>
              <b style={{ fontSize: 13.5 }}>{u.val}</b>
            </div>
          ))}
          <span style={{ fontSize: 11.5, color: '#6B7684', padding: '10px 0', lineHeight: 1.5 }}>Seri? Yang check-in lebih awal (sampai detik) di atas.</span>
        </div>
      </div>
      {b.me && (
        <div style={{ position: fixedMe ? 'fixed' : 'absolute', left: 0, right: 0, bottom: 14, width: 'calc(100% - 24px)', maxWidth: 456, margin: '0 auto', padding: '12px 14px', borderRadius: 16, background: '#0E4C86', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 30px rgba(14,34,51,.3)' }}>
          <b style={{ fontSize: 15, minWidth: 32 }}>#{b.me.rank}</b>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{b.me.ini || '•'}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{youName} (Anda)</span><span className="tab" style={{ fontSize: 11.5, opacity: 0.8 }}>{b.me.sub}</span></div>
          <b style={{ fontSize: 13.5 }}>{b.me.val}</b>
        </div>
      )}
    </>
  );
}

/** "Check-in Harian" card for Beranda. Native app may render this natively from /api/v1/me instead. */
export function HomeCard({ s, now, onClaim, onDetail }: { s: Status; now: number; onClaim: () => void; onDetail: () => void }) {
  const ev = s.events[0];
  return (
    <div style={{ background: '#fff', border: '1px solid ' + (s.claimed ? '#E2E9F0' : '#BFDCF3'), borderRadius: 16, boxShadow: '0 4px 14px rgba(14,34,51,.06)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF6E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Flame /></div>
        <button onClick={onDetail} style={{ all: 'unset', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }}>
          <b style={{ fontSize: 15, fontWeight: 800 }}>Check-in Harian</b>
          <span className="tab" style={{ fontSize: 12, color: '#6B7684' }}>{s.claimed ? `Tercatat ${s.claimedAt} · streak ${s.streak} hari` : `Streak ${s.streak} hari · reset ${clock((s.resetAt - now) / 1000)}`}</span>
        </button>
        {!s.claimed
          ? <button onClick={onClaim} style={{ border: 'none', borderRadius: 999, background: '#0B72C4', color: '#fff', fontSize: 13, fontWeight: 700, padding: '0 14px', height: 38, cursor: 'pointer', whiteSpace: 'nowrap' }}>Klaim +{fmt(s.breakdown.total)}</button>
          : <span style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 999, background: '#E8F7EE', color: '#15803D', fontSize: 13, fontWeight: 700, padding: '8px 12px', whiteSpace: 'nowrap' }}><Check />Selesai</span>}
      </div>
      {ev && <EventStrip e={ev} now={now} />}
      <Week week={s.week} small />
    </div>
  );
}

const StatusBar = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 6px', background: '#fff', fontSize: 12, fontWeight: 600, color: '#1A1A1A', flexShrink: 0 }}><span>09.31</span><span style={{ color: '#6B7684', fontWeight: 500 }}>55,4 K/s · VoLTE · 5G · 75</span></div>
);

/** Admin-preview only: mock of the native CBN Beranda behind the popup. */
export function PhoneHome({ s, now, children }: { s: Status; now: number; children?: ReactNode }) {
  const noop = () => {};
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: F, color: '#12263A' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontSize: 22, fontWeight: 800 }}><span style={{ color: '#0B72C4' }}>CBN</span><span style={{ color: '#5BB4E8', fontWeight: 600 }}>fiber</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(180deg,#0F2E4A,#08243C)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 20 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />Online</div>
      </div>
      <div style={{ background: 'linear-gradient(160deg,#1183CE,#0A5FA5)', padding: '16px 20px 14px', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><div style={{ fontSize: 19, fontWeight: 700 }}>{s.customer.name} ⌄</div><div style={{ fontSize: 14, fontWeight: 500, opacity: 0.95 }}>{s.customer.id} | CBN Fiber 100 New</div><div style={{ fontSize: 13, opacity: 0.85 }}>Rivera Hill, Bukit Permata Indah Blok A2</div></div>
        <div style={{ background: '#fff', color: '#0B72C4', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, alignSelf: 'flex-start' }}>Active</div>
      </div>
      <div style={{ background: '#0E4C86', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 600 }}><span style={{ width: 18, height: 20, borderRadius: 3, border: '2px solid #fff', display: 'block' }} />Tagihan Anda</div><span style={{ fontSize: 16 }}>›</span></div>
      <div className="noscroll" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 0 96px' }}>
        <div style={{ padding: '0 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(90deg,#3FA0E0,#8FD0F5)', borderRadius: 12, padding: '12px 14px' }}><span style={{ background: '#0B72C4', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 14 }}>Cybro Loyalty</span><span style={{ fontSize: 17, fontWeight: 800, color: '#0C3E68' }}>{s.level.name.toUpperCase()} ›</span></div></div>
        <div style={{ margin: '0 16px' }}><HomeCard s={s} now={now} onClaim={noop} onDetail={noop} /></div>
        <div style={{ margin: '0 16px', background: '#fff', border: '1px solid #E2E9F0', borderRadius: 16, boxShadow: '0 4px 14px rgba(14,34,51,.06)', padding: '14px 0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '0 18px', fontSize: 16, fontWeight: 800 }}>Layanan Saya</div>
          <div style={{ display: 'flex', gap: 10, padding: '0 18px', overflow: 'hidden' }}>
            {[['GO', '#0B0B0F', 'Dens Go'], ['g', '#C8102E', 'Genflix'], ['TM', '#D62E2E', 'Trend Micro'], ['TV', '#111C26', 'DensTV']].map(([t, bg, l]) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 62, flex: 'none' }}><div style={{ width: 58, height: 58, borderRadius: 16, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800 }}>{t}</div><div style={{ fontSize: 11, fontWeight: 600, color: '#3C4A57' }}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #E7EBF0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 8px 16px', fontSize: 11, color: '#6B7684' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontWeight: 600, color: '#0B72C4' }}><span style={{ width: 18, height: 18, background: '#0B72C4', clipPath: 'polygon(50% 0,100% 50%,100% 100%,0 100%,0 50%)' }} />Beranda</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 11.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>Upgrade</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: -22 }}><span style={{ width: 52, height: 52, borderRadius: '50%', background: '#0B72C4', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 800 }}>c</span>Registrasi</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2.5" y="13.5" width="4" height="6" rx="1.6" /><rect x="17.5" y="13.5" width="4" height="6" rx="1.6" /><path d="M19.5 19.5v.5a2.5 2.5 0 0 1-2.5 2.5h-2" /></svg>Bantuan</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>Profil</div>
      </div>
      {children}
    </div>
  );
}

/** Admin-preview only: Peringkat screen inside the phone frame. */
export const PhoneRank = ({ b, mode, setMode, showModes, youName }: Parameters<typeof RankBody>[0]) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: F, color: '#12263A' }}>
    <StatusBar />
    <AppBar title="Peringkat Check-in" sub={`Top ${b.top ?? 10} · ${b.month}`} onBack={() => {}} />
    <div className="noscroll" style={{ flex: 1, overflow: 'hidden' }}><RankBody b={b} mode={mode} setMode={setMode} showModes={showModes} youName={youName} /></div>
  </div>
);
