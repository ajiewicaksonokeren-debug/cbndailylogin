'use client';
import { useEffect, useState } from 'react';
import { api, Btn, Card, Empty, Page, PageHead, TH, Toggle, useFresh } from '@/components/ui';
import { fmt } from '@/lib/points';

type Row = { key: number; t: string; id: string; name: string; streak: number; calc: string; poin: number; ev: string; dev: string };
const COLS = '190px minmax(0,1.3fr) 80px minmax(0,1.2fr) 70px minmax(0,1fr) 90px';

export default function Log() {
  const [q, setQ] = useState(''), [live, setLive] = useState(true), [d, setD] = useState<{ rows: Row[]; count: number; nameScope: number | null } | null>(null);
  useEffect(() => {
    let on = true;
    const tick = () => api('/api/admin/log?q=' + encodeURIComponent(q)).then(x => on && setD(x)).catch(() => {});
    const t = setTimeout(tick, q ? 250 : 0);
    const iv = live ? setInterval(tick, 3000) : undefined;
    return () => { on = false; clearTimeout(t); clearInterval(iv); };
  }, [q, live]);
  const fresh = useFresh(d?.rows);
  return (
    <Page>
      <PageHead title="Log check-in" sub="Semua klaim dicatat dengan jam server sampai detik. Dipakai untuk audit dan tie-breaker peringkat.">
        <Btn variant="secondary" onClick={() => { location.href = '/api/admin/log/csv?q=' + encodeURIComponent(q); }}>Export CSV</Btn>
      </PageHead>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, border: '1px solid #D5DEE7', borderRadius: 10, background: '#fff', padding: '0 12px', width: 320, maxWidth: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau ID pelanggan" aria-label="Cari nama atau ID pelanggan" style={{ border: 'none', outline: 'none', flex: 1, minWidth: 0, font: "500 14px 'Plus Jakarta Sans'", color: '#12263A', background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 14px', borderRadius: 10, background: '#fff', border: '1px solid #D5DEE7' }}>
          <Toggle on={live} onChange={setLive} label="Live" /><span style={{ fontSize: 13.5, fontWeight: 700 }}>Live</span><span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? '#22C55E' : '#C9D3DD' }} />
        </div>
        <span style={{ fontSize: 13, color: '#6B7684' }}>{d ? `${fmt(Math.min(d.count, 30))} baris ditampilkan${d.nameScope ? ` · nama dicari di ${d.nameScope} check-in terakhir` : ''}` : ''}</span>
      </div>
      <Card pad={0} style={{ overflow: 'hidden', gap: 0 }}>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 900 }}>
          <TH cols={COLS}><span>Waktu (WIB)</span><span>Pelanggan</span><span>Streak</span><span>Rincian</span><span>Poin</span><span>Event</span><span>Perangkat</span></TH>
          {!d && <Empty>Memuat…</Empty>}
          {d?.rows.length === 0 && <Empty>{q ? 'Tidak ada yang cocok.' : 'Belum ada check-in.'}</Empty>}
          {d?.rows.map(l => (
            <div key={l.key} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '12px 18px', borderBottom: '1px solid #EDF1F5', fontSize: 13.5, alignItems: 'center', background: fresh.has(l.key) ? '#F1F7FD' : '#fff', transition: 'background 1s' }}>
              <span className="tab" style={{ fontWeight: 600 }}>{l.t}</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontWeight: 700 }}>{l.name || l.id}</span>{l.name && <span style={{ fontSize: 12, color: '#6B7684' }}>{l.id}</span>}</div>
              <span>{l.streak} hari</span>
              <span className="tab" style={{ fontSize: 12.5, color: '#6B7684' }}>{l.calc}</span>
              <b style={{ color: '#15803D' }}>+{fmt(l.poin)}</b>
              <span style={{ color: '#3C4A57' }}>{l.ev}</span>
              <span style={{ color: '#3C4A57' }}>{l.dev}</span>
            </div>
          ))}
        </div></div>
      </Card>
    </Page>
  );
}
