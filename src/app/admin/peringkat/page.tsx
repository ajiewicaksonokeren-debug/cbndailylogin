'use client';
import { useEffect, useState } from 'react';
import { PhoneRank } from '@/components/checkin';
import { sampleBoard } from '@/components/sample';
import { api, Btn, Card, Input, num, Page, PageHead, PhonePreview, Seg, SettingRow, Toggle, toast } from '@/components/ui';
import type { BoardCfg } from '@/lib/defaults';

export default function Peringkat() {
  const [c, setC] = useState<(BoardCfg & { topS: string }) | null>(null), [mode, setMode] = useState<'poin' | 'streak'>('poin'), [busy, setBusy] = useState(false), [now] = useState(() => Date.now());
  const load = (v: BoardCfg) => setC({ ...v, topS: String(v.top) });
  useEffect(() => { api('/api/admin/settings/board').then(r => load(r.value)); }, []);
  if (!c) return <Page><PageHead title="Peringkat" sub="Memuat…" /></Page>;
  const set = (o: Partial<typeof c>) => setC({ ...c, ...o });
  const cfg = { ...c, top: num(c.topS) || 10 };
  const shown: 'poin' | 'streak' = !c.p ? 'streak' : !c.s ? 'poin' : mode;
  const save = async () => {
    setBusy(true);
    try { load((await api('/api/admin/settings/board', { method: 'PUT', body: cfg })).value); toast('Pengaturan peringkat disimpan'); } catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  return (
    <Page>
      <PageHead title="Peringkat" sub="Atur papan peringkat yang tampil di app."><Btn onClick={save} disabled={busy}>Simpan</Btn></PageHead>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 'min(100%,460px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="4px 20px" style={{ gap: 0 }}>
            <SettingRow label="Papan poin bulan ini"><Toggle on={c.p} onChange={p => set({ p })} label="Papan poin bulan ini" /></SettingRow>
            <SettingRow label="Papan streak"><Toggle on={c.s} onChange={s => set({ s })} label="Papan streak" /></SettingRow>
            <SettingRow label="Jumlah yang ditampilkan" sub="Posisi user sendiri selalu tampil walau di luar daftar."><Input value={c.topS} onChange={topS => set({ topS })} prefix="Top" width={120} ariaLabel="Jumlah yang ditampilkan" /></SettingRow>
            <SettingRow label="Tie-breaker" sub="Kalau nilai sama."><span style={{ fontSize: 14, fontWeight: 700 }}>Check-in paling awal (sampai detik)</span></SettingRow>
            <SettingRow label="Reset papan poin"><span className="tab" style={{ fontSize: 14, fontWeight: 700 }}>Tiap tanggal 1, 00:00:00 WIB</span></SettingRow>
            <SettingRow label="Nama yang ditampilkan" sub="Foto tidak dipakai." last><Seg value={c.mode} options={[['ini', 'Nama + inisial'], ['anon', 'Inisial saja']]} onChange={m => set({ mode: m })} /></SettingRow>
          </Card>
        </div>
        <PhonePreview label="Preview di app">
          {c.p || c.s ? <PhoneRank b={sampleBoard(cfg, shown, now)} mode={shown} setMode={setMode} showModes={{ p: c.p, s: c.s }} youName="Dian Anggraeni" />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', fontSize: 18, color: '#6B7684' }}>Peringkat disembunyikan dari app.</div>}
        </PhonePreview>
      </div>
    </Page>
  );
}
