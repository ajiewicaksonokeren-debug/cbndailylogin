'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, Btn, Card, CardHead, Input, LinkBtn, num, Page, PageHead, SettingRow, TH, toast } from '@/components/ui';
import { calcDay, fm, fmt, fmtWib, type Rules } from '@/lib/points';

type Form = { base: string; cycle: string; expiry: string; reset: string; tiers: { from: string; to: string; m: string }[]; ms: { d: string; b: string }[] };
const toForm = (r: Rules): Form => ({
  base: String(r.base), cycle: String(r.cycle), expiry: String(r.expiryMonths), reset: r.reset,
  tiers: r.tiers.map(t => ({ from: String(t.from), to: t.to == null ? '∞' : String(t.to), m: fm(t.m) })),
  ms: r.milestones.map(m => ({ d: String(m.day), b: String(m.bonus) })),
});
const toRules = (f: Form): Rules => ({
  base: num(f.base), cycle: num(f.cycle), expiryMonths: num(f.expiry), reset: f.reset.trim(),
  tiers: f.tiers.map(t => ({ from: num(t.from), to: t.to.trim() === '∞' || t.to.trim() === '' ? null : num(t.to), m: num(t.m) })),
  milestones: f.ms.map(m => ({ day: num(m.d), bonus: num(m.b) })),
});

export default function Aturan() {
  const [f, setF] = useState<Form | null>(null), [saved, setSaved] = useState(''), [from, setFrom] = useState(0), [busy, setBusy] = useState(false);
  useEffect(() => { api<{ value: Rules; from: number }>('/api/admin/settings/rules').then(r => { const x = toForm(r.value); setF(x); setSaved(JSON.stringify(x)); setFrom(r.from); }); }, []);
  const sim = useMemo(() => {
    if (!f) return null;
    const r = toRules(f), safe = { ...r, tiers: r.tiers.map(t => ({ ...t, m: t.m || 1 })), base: r.base || 0, cycle: r.cycle || 0, milestones: r.milestones.filter(m => m.day) };
    const raw = Array.from({ length: 30 }, (_, i) => calcDay(safe, 0, i + 1));
    const mx = Math.max(1, ...raw.map(x => x.total));
    return { raw, mx, total: raw.reduce((a, x) => a + x.total, 0) };
  }, [f]);
  if (!f || !sim) return <Page><PageHead title="Aturan Poin" sub="Memuat…" /></Page>;
  const set = (o: Partial<Form>) => setF({ ...f, ...o });
  const setTier = (i: number, k: 'from' | 'to' | 'm', v: string) => set({ tiers: f.tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  const setMs = (i: number, k: 'd' | 'b', v: string) => set({ ms: f.ms.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });
  const dirty = JSON.stringify(f) !== saved;
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ value: Rules; from: number }>('/api/admin/settings/rules', { method: 'PUT', body: toRules(f) });
      const x = toForm(r.value); setF(x); setSaved(JSON.stringify(x)); setFrom(r.from);
      toast('Aturan poin disimpan · berlaku mulai ' + fmtWib(r.from) + ' WIB');
    } catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  const pending = from > Date.now();
  return (
    <Page>
      <PageHead title="Aturan Poin" sub={<>Atur berapa poin yang didapat user tiap check-in. Simulasi di kanan berubah langsung saat angka diubah.{pending && <><br /><b style={{ color: '#8A5A00' }}>Perubahan terakhir berlaku mulai {fmtWib(from)} WIB.</b></>}</>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="4px 20px" style={{ gap: 0 }}>
            <SettingRow label="Poin dasar per hari" sub="Poin sebelum dikali multiplier."><Input value={f.base} onChange={v => set({ base: v })} suffix="poin" width={140} ariaLabel="Poin dasar per hari" /></SettingRow>
            <SettingRow label="Bonus hari ke-7 siklus" sub="Diberikan setiap kelipatan 7 hari streak. Tidak dikali."><Input value={f.cycle} onChange={v => set({ cycle: v })} prefix="+" suffix="poin" width={140} ariaLabel="Bonus hari ke-7" /></SettingRow>
            <SettingRow label="Masa berlaku poin" sub="Dihitung sejak poin didapat."><Input value={f.expiry} onChange={v => set({ expiry: v })} suffix="bulan" width={140} ariaLabel="Masa berlaku poin" /></SettingRow>
            <SettingRow label="Jam reset harian" sub="Batas pergantian hari check-in." last><Input value={f.reset} onChange={v => set({ reset: v })} suffix="WIB" width={140} ariaLabel="Jam reset harian" /></SettingRow>
          </Card>
          <Card>
            <CardHead title="Multiplier streak" sub="Dikalikan ke poin dasar sesuai panjang streak." />
            <TH cols="1fr 1fr 1fr" style={{ padding: '10px 12px', borderRadius: 10, border: 'none' }}><span>Dari hari</span><span>Sampai hari</span><span>Multiplier</span></TH>
            {f.tiers.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'center' }}>
                <Input value={t.from} onChange={v => setTier(i, 'from', v)} ariaLabel={`Tier ${i + 1} dari hari`} />
                <Input value={t.to} onChange={v => setTier(i, 'to', v)} ariaLabel={`Tier ${i + 1} sampai hari`} />
                <Input value={t.m} onChange={v => setTier(i, 'm', v)} prefix="×" ariaLabel={`Tier ${i + 1} multiplier`} />
              </div>
            ))}
          </Card>
          <Card>
            <CardHead title="Milestone streak" sub="Bonus sekali saat streak mencapai hari tertentu." right={<LinkBtn onClick={() => set({ ms: [...f.ms, { d: '', b: '' }] })}>+ Tambah</LinkBtn>} />
            {f.ms.map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: 14, alignItems: 'center' }}>
                <Input value={m.d} onChange={v => setMs(i, 'd', v)} suffix="hari" ariaLabel={`Milestone ${i + 1} hari`} />
                <Input value={m.b} onChange={v => setMs(i, 'b', v)} prefix="+" suffix="poin" ariaLabel={`Milestone ${i + 1} bonus`} />
                <button onClick={() => set({ ms: f.ms.filter((_, j) => j !== i) })} aria-label={`Hapus milestone ${i + 1}`} className="h-del" style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: 'transparent', color: '#6B7684', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            ))}
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 88 }}>
          <Card style={{ gap: 16 }}>
            <CardHead title="Simulasi 30 hari" sub="User level Basic, streak tidak putus, tanpa event." />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 170, paddingTop: 18 }} role="img" aria-label="Simulasi poin 30 hari">
              {sim.raw.map((x, i) => (
                <div key={i} title={`Hari ${i + 1}: ${fmt(x.total)} poin`} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8A5A00' }}>{x.ms ? '+' + fmt(x.total) : ''}</span>
                  <div style={{ width: '100%', height: Math.max(2, (x.total / sim.mx) * 100) + '%', background: x.ms ? '#F5A700' : x.cyc ? '#0B72C4' : '#BFDCF3', borderRadius: '4px 4px 2px 2px' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['Total 30 hari', sim.total], ['Hari ke-1', sim.raw[0].total], ['Hari ke-30', sim.raw[29].total]].map(([l, v]) => (
                <div key={l} style={{ padding: 12, borderRadius: 12, background: '#F5F8FB', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 12, color: '#6B7684' }}>{l}</span><b className="tab" style={{ fontSize: 20, fontWeight: 800 }}>{fmt(v as number)}</b></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {dirty && (
        <div style={{ position: 'sticky', bottom: 20, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 12px 12px 20px', borderRadius: 14, background: '#12263A', color: '#fff', boxShadow: '0 16px 40px rgba(14,34,51,.3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Ada perubahan yang belum disimpan</span>
          <button onClick={() => setF(JSON.parse(saved))} style={{ height: 38, padding: '0 14px', border: '1px solid rgba(255,255,255,.25)', borderRadius: 10, background: 'transparent', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Batalkan</button>
          <Btn onClick={save} disabled={busy} style={{ height: 38, fontSize: 13.5 }}>{busy ? 'Menyimpan…' : 'Simpan & terapkan'}</Btn>
        </div>
      )}
    </Page>
  );
}
