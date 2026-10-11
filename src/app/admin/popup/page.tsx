'use client';
import { useEffect, useMemo, useState } from 'react';
import { PhoneHome, SheetOverlay } from '@/components/checkin';
import { sampleStatus } from '@/components/sample';
import { api, Btn, Card, CardHead, Field, ImageDrop, Page, PageHead, PhonePreview, SettingRow, Toggle, toast } from '@/components/ui';
import type { PopupCfg } from '@/lib/defaults';
import type { Level, Rules } from '@/lib/points';

export default function Popup() {
  const [p, setP] = useState<PopupCfg | null>(null), [ctx, setCtx] = useState<{ rules: Rules; levels: Level[] } | null>(null), [busy, setBusy] = useState(false), [now] = useState(() => Date.now());
  useEffect(() => {
    Promise.all([api('/api/admin/settings/popup'), api('/api/admin/settings/rules'), api('/api/admin/settings/levels')]).then(([a, r, l]) => { setP(a.value); setCtx({ rules: r.value, levels: l.value }); });
  }, []);
  const s = useMemo(() => (p && ctx ? sampleStatus({ now, ...ctx, popup: p }) : null), [p, ctx, now]);
  if (!p || !s) return <Page><PageHead title="Pop-up check-in" sub="Memuat…" /></Page>;
  const set = (o: Partial<PopupCfg>) => setP({ ...p, ...o });
  const save = async () => {
    setBusy(true);
    try { setP((await api('/api/admin/settings/popup', { method: 'PUT', body: p })).value); toast('Pengaturan pop-up disimpan'); } catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  return (
    <Page>
      <PageHead title="Pop-up check-in" sub="Atur kapan pop-up muncul di Beranda app dan isinya."><Btn onClick={save} disabled={busy}>Simpan</Btn></PageHead>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 'min(100%,460px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="4px 20px" style={{ gap: 0 }}>
            <SettingRow label="Tampilkan pop-up" sub="Kalau mati, check-in hanya lewat kartu di Beranda."><Toggle on={p.on} onChange={on => set({ on })} label="Tampilkan pop-up" /></SettingRow>
            <SettingRow label="Dahulukan pop-up tagihan" sub="Kalau ada tagihan jatuh tempo, pop-up check-in ditunda ke sesi berikutnya. Dijalankan oleh app."><Toggle on={p.prio} onChange={prio => set({ prio })} label="Dahulukan pop-up tagihan" /></SettingRow>
            <SettingRow label="Tunggu onboarding selesai" sub="User baru tidak melihat pop-up sebelum onboarding selesai. Dijalankan oleh app." last><Toggle on={p.onb} onChange={onb => set({ onb })} label="Tunggu onboarding selesai" /></SettingRow>
          </Card>
          <Card style={{ gap: 14 }}>
            <CardHead title="Teks" />
            <Field label="Judul" value={p.title} onChange={title => set({ title })} mono={false} />
            <Field label="Label tombol" value={p.cta} onChange={cta => set({ cta })} mono={false} />
          </Card>
          <Card>
            <CardHead title="Gambar" sub="716×300 px. Sama dengan gambar yang tampil di app." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><ImageDrop value={p.heroId} onChange={heroId => set({ heroId })} label="Sebelum klaim" /><span style={{ fontSize: 12.5, color: '#6B7684' }}>Sebelum klaim</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><ImageDrop value={p.successId} onChange={successId => set({ successId })} label="Sukses klaim" /><span style={{ fontSize: 12.5, color: '#6B7684' }}>Sukses klaim</span></div>
            </div>
          </Card>
        </div>
        <PhonePreview label="Preview di app">
          <PhoneHome s={s} now={now}>{p.on && <SheetOverlay s={s} now={now} onClaim={() => {}} onClose={() => {}} onDetail={() => {}} />}</PhoneHome>
        </PhonePreview>
      </div>
    </Page>
  );
}
