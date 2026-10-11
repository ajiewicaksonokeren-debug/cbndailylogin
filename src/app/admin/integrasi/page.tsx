'use client';
import { useEffect, useState } from 'react';
import { useMe } from '@/components/adminMe';
import { api, Btn, Card, CardHead, Field, Input, Page, PageHead, Seg, toast } from '@/components/ui';
import type { FieldKey, IntegrationCfg } from '@/lib/defaults';

type Cfg = Omit<IntegrationCfg, 'secretEnc'> & { secretMasked: string };
type Test = { ok: boolean; found: boolean; ms: number; mock: boolean; error: string | null; profile: Record<string, string> | null };
const USE: Record<FieldKey, string> = { customer_id: 'kunci utama', nama: 'dashboard & log', paket: 'segmen event', area: 'segmen event', cybro_tier: 'info', status: 'hanya akun aktif' };
const STEPS = [
  ['App kirim check-in', 'User sudah login di app CBN. App kirim token sesi, bukan customer_id dari form.'],
  ['Server verifikasi token', 'Server check-in validasi token ke auth CBN, ambil customer_id dari token, catat jam server sampai detik.'],
  ['Ambil profil', 'Admin buka dashboard → server panggil API pelanggan untuk ID yang tampil (batch), simpan di cache.'],
  ['Tampilkan', 'Dashboard & log menampilkan nama + ID. Leaderboard di app hanya inisial.'],
];

export default function Integrasi() {
  const { me } = useMe();
  const [c, setC] = useState<Cfg | null>(null), [secret, setSecret] = useState(''), [testId, setTestId] = useState('30110910'), [test, setTest] = useState<Test | null>(null), [testing, setTesting] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (me?.role === 'admin') api('/api/admin/integration').then(r => setC(r.value)).catch(e => toast(e.message, true)); }, [me]);
  if (me && me.role !== 'admin') return <Page><PageHead title="Integrasi data pelanggan" sub="Hanya peran Admin yang bisa melihat dan mengubah integrasi." /></Page>;
  if (!c) return <Page><PageHead title="Integrasi data pelanggan" sub="Memuat…" /></Page>;
  const set = (o: Partial<Cfg>) => setC({ ...c, ...o });
  const save = async () => {
    setBusy(true);
    try { setC((await api('/api/admin/integration', { method: 'PUT', body: { ...c, secret } })).value); setSecret(''); toast('Integrasi disimpan'); return true; }
    catch (e) { toast((e as Error).message, true); return false; }
    finally { setBusy(false); }
  };
  const run = async () => {
    if (testing) return;
    setTesting(true); setTest(null);
    try { setTest(await api('/api/admin/integration/test', { method: 'POST', body: { id: testId } })); setC(await api('/api/admin/integration').then(r => r.value)); }
    catch (e) { toast((e as Error).message, true); }
    setTesting(false);
  };
  const st = c.lastTest == null ? ['Belum dites', '#EEF2F6', '#6B7684'] : c.lastTest.ok ? [`Terhubung · ${c.lastTest.ms} ms`, '#E8F7EE', '#15803D'] : ['Gagal terhubung', '#FEF4F5', '#E11D2E'];
  const good = test?.ok && test.found;
  return (
    <Page>
      <PageHead title="Integrasi data pelanggan" maxWidth={680} sub={<>Sistem check-in hanya menyimpan <b style={{ color: '#12263A' }}>customer_id</b>. Nama, paket, area, dan tier Cybro diambil dari API pelanggan CBN saat dibutuhkan, lewat server — tidak pernah dari browser.</>}>
        <Btn onClick={save} disabled={busy}>Simpan</Btn>
      </PageHead>
      <Card style={{ gap: 14 }}>
        <CardHead title="Cara kerja" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ flex: 1, minWidth: 170, padding: 14, borderRadius: 12, background: '#F5F8FB', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: '#E8F3FC', color: '#0B72C4', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <b style={{ fontSize: 14 }}>{t}</b><span style={{ fontSize: 12.5, color: '#3C4A57', lineHeight: 1.5 }}>{d}</span>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: 14, alignItems: 'start' }}>
        <Card style={{ gap: 14 }}>
          <CardHead title="Koneksi API pelanggan" sub={c.url ? 'Disimpan di server, tidak dikirim ke app maupun browser admin.' : 'Base URL kosong = mode contoh (data pelanggan palsu). Isi untuk memakai API asli.'}
            right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 999, background: st[1], color: st[2], fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: st[2] }} />{st[0]}</span>} />
          <Field label="Base URL" value={c.url} onChange={url => set({ url })} mono={false} placeholder="https://api.cbn.id/v2" />
          <Field label="Endpoint ambil pelanggan" value={c.path} onChange={path => set({ path })} prefix={<span style={{ fontSize: 13 }}>GET</span>} mono={false} help={<>Pakai <code>{'{ids}'}</code> untuk batch, contoh <code>/customers?ids={'{ids}'}</code></>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Autentikasi</span>
            <Seg value={c.auth} options={[['key', 'API key'], ['oauth', 'OAuth client credentials']]} onChange={auth => set({ auth })} />
          </div>
          {c.auth === 'oauth' && <>
            <Field label="Token URL" value={c.tokenUrl} onChange={tokenUrl => set({ tokenUrl })} mono={false} placeholder="https://auth.cbn.id/oauth/token" />
            <Field label="Client ID" value={c.clientId} onChange={clientId => set({ clientId })} mono={false} />
          </>}
          <Field label={c.auth === 'key' ? 'API key' : 'Client secret'} value={secret} onChange={setSecret} type="password" autoComplete="new-password" mono={false}
            placeholder={c.secretMasked || 'Belum diisi'} help={c.secretMasked ? 'Tersimpan: ' + c.secretMasked + ' · isi untuk mengganti' : undefined} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cache profil" value={String(c.cacheMin)} onChange={v => set({ cacheMin: Number(v) || 0 })} suffix="menit" />
            <Field label="Batas waktu" value={String(c.timeoutSec)} onChange={v => set({ timeoutSec: Number(v) || 0 })} suffix="detik" />
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead title="Pemetaan field" sub="Sesuaikan dengan nama field di response API Anda. Pakai titik untuk field bertingkat." />
            <div style={{ display: 'grid', gridTemplateColumns: '150px 20px minmax(0,1fr)', gap: 10, fontSize: 11.5, fontWeight: 700, color: '#6B7684', textTransform: 'uppercase', letterSpacing: '.04em' }}><span>Field check-in</span><span /><span>Field di API Anda</span></div>
            {(Object.keys(c.map) as FieldKey[]).map(k => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '150px 20px minmax(0,1fr)', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}><code style={{ fontSize: 13, fontWeight: 700, color: '#0E4C86' }}>{k}</code><span style={{ fontSize: 11.5, color: '#6B7684' }}>{USE[k]}</span></div>
                <span style={{ color: '#6B7684' }}>→</span>
                <Input value={c.map[k]} onChange={v => set({ map: { ...c.map, [k]: v } })} mono={false} ariaLabel={`Field API untuk ${k}`} />
              </div>
            ))}
          </Card>
          <Card>
            <CardHead title="Tes koneksi" sub="Masukkan satu customer ID untuk cek pemetaan. Simpan dulu kalau ada perubahan." />
            <div style={{ display: 'flex', gap: 10 }}>
              <Input value={testId} onChange={setTestId} placeholder="30110910" ariaLabel="Customer ID untuk tes" />
              <Btn variant="secondary" onClick={run} disabled={testing}>{testing ? 'Mengetes…' : 'Tes'}</Btn>
            </div>
            {test && (
              <div style={{ border: '1px solid ' + (good ? '#BFE5CC' : '#F6C7CC'), borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: good ? '#E8F7EE' : '#FEF4F5', fontSize: 13, fontWeight: 700, color: good ? '#15803D' : '#E11D2E', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{!test.ok ? 'Gagal · ' + test.error : test.found ? 'Data ditemukan' + (test.mock ? ' (mode contoh)' : '') : 'Customer ID tidak ditemukan'}</span><span className="tab">{test.ms} ms</span>
                </div>
                {test.profile && Object.entries(test.profile).map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr)', gap: 10, padding: '9px 14px', borderTop: '1px solid #EDF1F5', fontSize: 13 }}><code style={{ color: '#6B7684' }}>{k}</code><b>{v || <span style={{ color: '#E11D2E' }}>kosong — cek pemetaan</span>}</b></div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <Card style={{ gap: 10 }}>
        <CardHead title="Keamanan & privasi" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10, fontSize: 13.5, color: '#3C4A57', lineHeight: 1.55 }}>
          <span>• customer_id selalu diambil dari token sesi di server — user tidak bisa check-in atas nama orang lain.</span>
          <span>• Kredensial API terenkripsi di server; browser admin cuma terima data yang sudah dipetakan.</span>
          <span>• Kalau API pelanggan lambat/mati, dashboard tetap tampil dengan ID saja, nama menyusul.</span>
          <span>• Akses admin per peran: CS lihat log, Marketing kelola event, hanya Admin ubah integrasi.</span>
        </div>
      </Card>
    </Page>
  );
}
