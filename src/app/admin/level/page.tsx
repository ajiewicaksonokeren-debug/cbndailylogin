'use client';
import { useEffect, useState } from 'react';
import { api, Btn, Card, Input, num, Page, PageHead, TH, toast } from '@/components/ui';
import { fm, fmt, type Level } from '@/lib/points';

const COLS = '130px 160px 140px minmax(220px,1fr) 90px';

export default function Levels() {
  const [lv, setLv] = useState<(Level & { minS: string; bS: string })[] | null>(null), [users, setUsers] = useState<number[]>([]), [busy, setBusy] = useState(false);
  const load = (v: Level[]) => setLv(v.map(l => ({ ...l, minS: String(l.min), bS: fm(l.bonus) })));
  useEffect(() => { api('/api/admin/settings/levels').then(r => { load(r.value); setUsers(r.users); }); }, []);
  const save = async () => {
    setBusy(true);
    try { const r = await api('/api/admin/settings/levels', { method: 'PUT', body: lv!.map(l => ({ ...l, min: num(l.minS), bonus: num(l.bS) })) }); load(r.value); toast('Level disimpan'); }
    catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  const set = (i: number, o: object) => setLv(lv!.map((x, j) => (j === i ? { ...x, ...o } : x)));
  return (
    <Page>
      <PageHead title="Level" sub="Level mengikuti tier Cybro Loyalty dan dihitung dari poin seumur hidup. Poin kedaluwarsa tidak menurunkan level.">
        <Btn onClick={save} disabled={busy || !lv}>Simpan</Btn>
      </PageHead>
      <Card pad={0} style={{ overflow: 'hidden', gap: 0 }}>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 860 }}>
          <TH cols={COLS}><span>Level</span><span>Mulai dari</span><span>Bonus poin harian</span><span>Keuntungan</span><span>User</span></TH>
          {lv?.map((l, i) => (
            <div key={l.name} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '12px 18px', borderBottom: '1px solid #EDF1F5', alignItems: 'center', fontSize: 13.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} /><b>{l.name}</b></div>
              <Input value={l.minS} onChange={v => set(i, { minS: v })} suffix="poin" ariaLabel={`${l.name} mulai dari`} />
              <Input value={l.bS} onChange={v => set(i, { bS: v })} prefix="+" suffix="%" width={120} ariaLabel={`${l.name} bonus`} />
              <span style={{ color: '#3C4A57' }}>{l.perk}</span>
              <span className="tab" style={{ color: '#3C4A57' }}>{users[i] != null ? fmt(users[i]) : '—'}</span>
            </div>
          ))}
        </div></div>
      </Card>
    </Page>
  );
}
