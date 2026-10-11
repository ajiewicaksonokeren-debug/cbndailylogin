'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { EvRow } from '@/components/EventForm';
import { api, Btn, Card, Empty, Page, PageHead, Pill, TH, toast } from '@/components/ui';
import { fmt } from '@/lib/points';

const TYPE = { multiplier: 'Multiplier', time_window: 'Jam tertentu', challenge: 'Tantangan' };
const STS = { Aktif: ['#E8F7EE', '#15803D'], Terjadwal: ['#E8F3FC', '#0B72C4'], Draft: ['#FFF6E0', '#8A5A00'], Selesai: ['#EEF2F6', '#6B7684'] };
const COLS = 'minmax(200px,1.6fr) 110px 64px 190px 120px 76px 100px';

export default function Events() {
  const [rows, setRows] = useState<EvRow[] | null>(null), router = useRouter();
  useEffect(() => { api('/api/admin/events').then(r => setRows(r.events)).catch(e => toast(e.message, true)); }, []);
  return (
    <Page>
      <PageHead title="Event" sub="Buat dan jadwalkan event untuk mendorong poin di waktu tertentu. Maks. 1 event per tipe berjalan bersamaan.">
        <Btn onClick={() => router.push('/admin/event/baru')}>+ Buat event</Btn>
      </PageHead>
      <Card pad={0} style={{ overflow: 'hidden', gap: 0 }}>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1000 }}>
          <TH cols={COLS}><span>Event</span><span>Tipe</span><span>Nilai</span><span>Periode (WIB)</span><span>Target</span><span>Peserta</span><span>Status</span></TH>
          {rows?.length === 0 && <Empty>Belum ada event. Klik “+ Buat event”.</Empty>}
          {!rows && <Empty>Memuat…</Empty>}
          {rows?.map(e => (
            <div key={e.id} onClick={() => router.push('/admin/event/' + e.id)} className="h-row" role="link" tabIndex={0} onKeyDown={k => k.key === 'Enter' && router.push('/admin/event/' + e.id)}
              style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '14px 18px', borderBottom: '1px solid #EDF1F5', fontSize: 13.5, alignItems: 'center', background: '#fff' }}>
              <b style={{ fontWeight: 700 }}>{e.name}</b><span style={{ color: '#3C4A57' }}>{TYPE[e.type]}</span><b style={{ color: '#8A5A00' }}>{e.tag}</b>
              <div className="tab" style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5, color: '#3C4A57' }}><span>{e.start ?? '—'}</span><span>{e.end ?? '—'}</span></div>
              <span style={{ color: '#3C4A57' }}>{e.segments.length ? e.segments.join(', ') : 'Semua user'}</span>
              <span className="tab">{e.part == null ? '—' : fmt(e.part)}</span>
              <div><Pill bg={STS[e.status][0]} fg={STS[e.status][1]}>{e.status}</Pill></div>
            </div>
          ))}
        </div></div>
      </Card>
    </Page>
  );
}
