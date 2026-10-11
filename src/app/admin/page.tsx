'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, useFresh, Card, CardHead, Empty, LinkBtn, Page, PageHead, TH } from '@/components/ui';
import { fm, fmt, wibSecOfDay } from '@/lib/points';

type Row = { key: number; t: string; id: string; name: string; streak: number; poin: number; ev: string };
type Dash = {
  serverNow: number; count: number; countPrev: number; rate: number | null; ratePrev: number | null; avgStreak: number | null; avgStreakPrev: number | null;
  points: number; eventPoints: number; hours: number[]; events: { id: string; name: string; val: string; end: string; part: number }[]; recent: Row[];
};

const delta = (cur: number | null, prev: number | null, fmtD: (d: number) => string) => {
  if (cur == null || prev == null) return { text: 'belum ada data kemarin', c: '#6B7684' };
  const d = cur - prev;
  return { text: (d >= 0 ? '▲ ' : '▼ ') + fmtD(Math.abs(d)), c: d >= 0 ? '#15803D' : '#E11D2E' };
};
const one = (n: number) => fm(Math.round(n * 10) / 10);
const COLS = '190px minmax(0,1.4fr) 90px 80px minmax(0,1fr)';

export default function Dashboard() {
  const [d, setD] = useState<Dash | null>(null), router = useRouter();
  useEffect(() => {
    let live = true;
    const tick = () => api<Dash>('/api/admin/dashboard').then(x => live && setD(x)).catch(() => {});
    tick();
    const iv = setInterval(tick, 2000);
    return () => { live = false; clearInterval(iv); };
  }, []);
  const fresh = useFresh(d?.recent);
  if (!d) return <Page><PageHead title="Dashboard" sub="Memuat…" /></Page>;
  const cd = delta(d.count, d.countPrev, n => (d.countPrev ? one((n / d.countPrev) * 100) + '% dari kemarin' : fmt(n) + ' dari kemarin'));
  const rd = delta(d.rate, d.ratePrev, n => one(n * 100) + ' poin');
  const sd = delta(d.avgStreak, d.avgStreakPrev, n => one(n) + ' hari');
  const kpis = [
    { label: 'Check-in hari ini', value: fmt(d.count), ...cd },
    { label: 'Dari user yang buka check-in', value: d.rate == null ? '—' : one(d.rate * 100) + '%', ...rd },
    { label: 'Rata-rata streak', value: d.avgStreak == null ? '—' : one(d.avgStreak) + ' hari', ...sd },
    { label: 'Poin dibagikan hari ini', value: fmt(d.points), text: 'termasuk ' + fmt(d.eventPoints) + ' dari event', c: '#6B7684' },
  ];
  const hNow = Math.floor(wibSecOfDay(d.serverNow) / 3600), hmx = Math.max(1, ...d.hours);
  return (
    <Page>
      <PageHead title="Dashboard" sub="Ringkasan check-in hari ini. Angka diperbarui tiap 2 detik dari log server." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {kpis.map(k => (
          <Card key={k.label} pad={18} style={{ gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7684' }}>{k.label}</span>
            <b className="tab" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em' }}>{k.value}</b>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: k.c }}>{k.text}</span>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14 }}>
        <Card style={{ gap: 16 }}>
          <CardHead title="Check-in per jam" sub="Hari ini, WIB" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }} role="img" aria-label="Grafik check-in per jam">
            {d.hours.map((v, i) => (
              <div key={i} title={`${String(i).padStart(2, '0')}:00 · ${fmt(v)} check-in`} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: (i > hNow ? 3 : Math.max(2, (v / hmx) * 100)) + '%', background: i === hNow ? '#0B72C4' : i > hNow ? '#EDF1F5' : '#BFDCF3', borderRadius: '4px 4px 2px 2px' }} />
              </div>
            ))}
          </div>
          <div className="tab" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6B7684' }}><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
        </Card>
        <Card>
          <CardHead title="Event berjalan" right={<LinkBtn onClick={() => router.push('/admin/event')}>Kelola ›</LinkBtn>} />
          {d.events.length === 0 && <span style={{ fontSize: 13.5, color: '#6B7684' }}>Tidak ada event yang berjalan.</span>}
          {d.events.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: '#FFF6E0', border: '1px solid #FFE2A3' }}>
              <b style={{ width: 52, height: 40, borderRadius: 10, background: '#F5A700', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{e.val}</b>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 14 }}>{e.name}</b><span className="tab" style={{ fontSize: 12, color: '#8A5A00' }}>s.d. {e.end}</span></div>
              <span className="tab" style={{ fontSize: 12.5, fontWeight: 700, color: '#3C4A57' }}>{fmt(e.part)} user</span>
            </div>
          ))}
        </Card>
      </div>
      <Card pad={0} style={{ overflow: 'hidden', gap: 0 }}>
        <div style={{ padding: '16px 18px' }}><CardHead title="Check-in terbaru" sub="Dicatat dengan jam server sampai detik." right={<LinkBtn onClick={() => router.push('/admin/log')}>Lihat semua ›</LinkBtn>} /></div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 720 }}>
          <TH cols={COLS}><span>Waktu (WIB)</span><span>Pelanggan</span><span>Streak</span><span>Poin</span><span>Event</span></TH>
          {d.recent.length === 0 && <Empty>Belum ada check-in.</Empty>}
          {d.recent.map(l => (
            <div key={l.key} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '12px 18px', borderBottom: '1px solid #EDF1F5', fontSize: 13.5, alignItems: 'center', background: fresh.has(l.key) ? '#F1F7FD' : '#fff', transition: 'background 1s' }}>
              <span className="tab" style={{ fontWeight: 600 }}>{l.t}</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontWeight: 700 }}>{l.name || l.id}</span>{l.name && <span style={{ fontSize: 12, color: '#6B7684' }}>{l.id}</span>}</div>
              <span>{l.streak} hari</span><b style={{ color: '#15803D' }}>+{fmt(l.poin)}</b><span style={{ color: '#3C4A57' }}>{l.ev}</span>
            </div>
          ))}
        </div></div>
      </Card>
    </Page>
  );
}
