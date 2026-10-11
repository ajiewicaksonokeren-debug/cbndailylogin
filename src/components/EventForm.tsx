'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PhoneHome, SheetOverlay } from './checkin';
import { sampleStatus } from './sample';
import { api, Btn, Card, CardHead, Field, ImageDrop, Input, num, Page, PageHead, PhonePreview, SettingRow, Toggle, toast } from './ui';
import { DEFAULT_LEVELS, DEFAULT_POPUP, DEFAULT_RULES, SEGMENTS, type PopupCfg } from '@/lib/defaults';
import { DT_RE, fm, fmtWib, parseWib, type EventType, type Level, type Rules } from '@/lib/points';

export type EvRow = {
  id: string; name: string; type: EventType; value: number; start: string | null; end: string | null; windowFrom: string | null; windowTo: string | null;
  targetDays: number | null; segments: string[]; pushStart: boolean; push3h: boolean; draft: boolean; bannerId: string | null;
  tag: string; status: 'Aktif' | 'Terjadwal' | 'Draft' | 'Selesai'; part: number | null;
};
const TYPES: Record<EventType, [string, string, string, string]> = {
  multiplier: ['Multiplier', 'Poin harian dikali nilai event.', '×', ''],
  time_window: ['Jam tertentu', 'Bonus kalau check-in di rentang jam.', '+', 'poin'],
  challenge: ['Tantangan', 'Bonus sekali setelah N hari check-in.', '+', 'poin'],
};
const DEF_VAL = { multiplier: '2', time_window: '20', challenge: '500' };

export default function EventForm({ id }: { id?: string }) {
  const router = useRouter();
  const [events, setEvents] = useState<EvRow[] | null>(null);
  const [cfg, setCfg] = useState<{ rules: Rules; levels: Level[]; popup: PopupCfg }>({ rules: DEFAULT_RULES, levels: DEFAULT_LEVELS, popup: DEFAULT_POPUP });
  const [ed, setEd] = useState<null | { name: string; type: EventType; val: string; start: string; end: string; wFrom: string; wTo: string; days: string; seg: string[]; pushStart: boolean; push3h: boolean; bannerId: string | null }>(null);
  const [busy, setBusy] = useState(false), [now] = useState(() => Date.now());
  useEffect(() => {
    Promise.all([api('/api/admin/events'), api('/api/admin/settings/rules'), api('/api/admin/settings/levels'), api('/api/admin/settings/popup')]).then(([e, r, l, p]) => {
      setEvents(e.events); setCfg({ rules: r.value, levels: l.value, popup: p.value });
      const cur = (e.events as EvRow[]).find(x => x.id === id);
      const tomorrow = fmtWib(Date.now() + 864e5).slice(0, 10);
      setEd(cur ? {
        name: cur.name, type: cur.type, val: fm(cur.value), start: cur.start ?? '', end: cur.end ?? '', wFrom: cur.windowFrom ?? '05:00:00', wTo: cur.windowTo ?? '09:00:00',
        days: String(cur.targetDays ?? 5), seg: cur.segments, pushStart: cur.pushStart, push3h: cur.push3h, bannerId: cur.bannerId,
      } : { name: '', type: 'multiplier', val: '2', start: tomorrow + ' 00:00:00', end: fmtWib(Date.now() + 2 * 864e5).slice(0, 10) + ' 23:59:59', wFrom: '05:00:00', wTo: '09:00:00', days: '5', seg: [], pushStart: true, push3h: true, bannerId: null });
    }).catch(e => toast(e.message, true));
  }, [id]);
  const current = events?.find(x => x.id === id);
  const preview = useMemo(() => {
    if (!ed) return null;
    const endAt = DT_RE.test(ed.end) && parseWib(ed.end) > now ? parseWib(ed.end) : now + 864e5;
    return sampleStatus({
      now, ...cfg, event: { id: 'preview', name: ed.name, type: ed.type, value: num(ed.val) || 0, start: now - 1000, end: endAt, windowFrom: ed.wFrom, windowTo: ed.wTo, targetDays: num(ed.days) || 5, segments: [], bannerId: ed.bannerId },
    });
  }, [ed, cfg, now]);
  if (!ed || !events || !preview) return <Page><PageHead title={id ? 'Ubah event' : 'Buat event'} sub="Memuat…" /></Page>;
  if (id && !current) return <Page><PageHead title="Event tidak ditemukan" sub="Event mungkin sudah dihapus." /></Page>;

  const E = (o: Partial<typeof ed>) => setEd({ ...ed, ...o });
  const okS = DT_RE.test(ed.start), okE = DT_RE.test(ed.end), order = okS && okE && ed.end > ed.start;
  const clash = okS && okE ? events.find(e => e.id !== id && e.type === ed.type && (e.status === 'Aktif' || e.status === 'Terjadwal') && e.start && e.end && ed.start <= e.end && ed.end >= e.start) : undefined;
  const readOnly = current?.status === 'Selesai';
  const save = (draft: boolean) => async () => {
    setBusy(true);
    const body = { name: ed.name, type: ed.type, value: num(ed.val), start: ed.start, end: ed.end, windowFrom: ed.wFrom, windowTo: ed.wTo, targetDays: num(ed.days), segments: ed.seg, pushStart: ed.pushStart, push3h: ed.push3h, draft, bannerId: ed.bannerId };
    try {
      await api(id ? '/api/admin/events/' + id : '/api/admin/events', { method: id ? 'PUT' : 'POST', body });
      toast(draft ? 'Draft event disimpan' : id ? 'Event diperbarui' : 'Event dijadwalkan');
      router.push('/admin/event');
    } catch (e) { toast((e as Error).message, true); setBusy(false); }
  };
  const del = async () => {
    if (!confirm('Hapus event "' + current!.name + '"?')) return;
    try { await api('/api/admin/events/' + id, { method: 'DELETE' }); toast('Event dihapus'); router.push('/admin/event'); } catch (e) { toast((e as Error).message, true); }
  };
  const days = order ? Math.max(1, Math.round((parseWib(ed.end) - parseWib(ed.start)) / 864e5)) : 0;
  return (
    <Page>
      <PageHead title={id ? 'Ubah event' : 'Buat event'} sub={readOnly ? 'Event ini sudah selesai dan hanya bisa dilihat.' : 'Isi detail event. Preview di kanan menunjukkan tampilan pop-up di app.'}>
        <Btn variant="secondary" onClick={() => router.push('/admin/event')}>Batal</Btn>
        {id && current?.part == null && !readOnly && <Btn variant="secondary" onClick={del} style={{ color: '#E11D2E' }}>Hapus</Btn>}
        {!readOnly && (!current || current.draft) && <Btn variant="secondary" onClick={save(true)} disabled={busy}>Simpan draft</Btn>}
        {!readOnly && <Btn onClick={save(false)} disabled={busy}>{current && !current.draft ? 'Simpan' : 'Jadwalkan'}</Btn>}
      </PageHead>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <fieldset disabled={readOnly} style={{ flex: 1, minWidth: 'min(100%,460px)', display: 'flex', flexDirection: 'column', gap: 14, border: 'none', margin: 0, padding: 0 }}>
          <Card style={{ gap: 16 }}>
            <Field label="Nama event" value={ed.name} onChange={v => E({ name: v.slice(0, 28) })} mono={false} help={`Tampil di banner app. Maks. 28 karakter · ${ed.name.length}/28`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Tipe</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
                {(Object.keys(TYPES) as EventType[]).map(k => (
                  <button key={k} onClick={() => E({ type: k, val: DEF_VAL[k] })} aria-pressed={ed.type === k} style={{ textAlign: 'left', padding: 14, borderRadius: 12, border: ed.type === k ? '2px solid #0B72C4' : '1px solid #D5DEE7', background: ed.type === k ? '#F1F7FD' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, color: '#12263A' }}>
                    <b style={{ fontSize: 14 }}>{TYPES[k][0]}</b><span style={{ fontSize: 12.5, color: '#6B7684', lineHeight: 1.45 }}>{TYPES[k][1]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Field label="Nilai" value={ed.val} onChange={v => E({ val: v })} prefix={TYPES[ed.type][2]} suffix={TYPES[ed.type][3] || undefined} width={140} help={ed.type === 'multiplier' ? 'Maks. ×3' : undefined} />
              {ed.type === 'time_window' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>Jam berlaku</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Input value={ed.wFrom} onChange={v => E({ wFrom: v })} width={120} ariaLabel="Jam mulai" /><span style={{ color: '#6B7684' }}>–</span><Input value={ed.wTo} onChange={v => E({ wTo: v })} width={120} ariaLabel="Jam selesai" /></div>
                </div>
              )}
              {ed.type === 'challenge' && <Field label="Target hari check-in" value={ed.days} onChange={v => E({ days: v })} suffix="hari" width={140} />}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              <Field label="Mulai" value={ed.start} onChange={v => E({ start: v })} suffix="WIB" help={okS ? 'Format YYYY-MM-DD HH:MM:SS' : 'Format salah · contoh 2026-10-20 00:00:00'} helpColor={okS ? '#6B7684' : '#E11D2E'} />
              <Field label="Selesai" value={ed.end} onChange={v => E({ end: v })} suffix="WIB" help={!okE ? 'Format salah · contoh 2026-10-26 23:59:59' : order ? 'Durasi ' + days + ' hari' : 'Harus setelah waktu mulai'} helpColor={okE && order ? '#6B7684' : '#E11D2E'} />
            </div>
            {clash && (
              <div role="alert" style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#FEF4F5', border: '1px solid #F6C7CC', fontSize: 13, color: '#9F1239', lineHeight: 1.5 }}>
                <b style={{ flexShrink: 0 }}>Bentrok</b><span>Periode ini tumpang tindih dengan “{clash.name}” ({clash.start} – {clash.end}). Maks. 1 {TYPES[ed.type][0].toLowerCase()} berjalan bersamaan.</span>
              </div>
            )}
          </Card>
          <Card>
            <CardHead title="Target user" sub="Kosongkan semua untuk semua user. Area/paket/level digabung: harus cocok semua jenis yang dipilih." />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SEGMENTS.map(l => { const on = ed.seg.includes(l); return (
                <button key={l} onClick={() => E({ seg: on ? ed.seg.filter(x => x !== l) : [...ed.seg, l] })} aria-pressed={on} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid ' + (on ? '#0B72C4' : '#D5DEE7'), background: on ? '#0B72C4' : '#fff', color: on ? '#fff' : '#3C4A57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
              ); })}
            </div>
          </Card>
          <Card pad="4px 20px" style={{ gap: 0 }}>
            <SettingRow label="Push notifikasi saat event mulai"><Toggle on={ed.pushStart} onChange={v => E({ pushStart: v })} label="Push notifikasi saat event mulai" /></SettingRow>
            <SettingRow label="Pengingat 3 jam sebelum berakhir" sub="Hanya ke user yang belum check-in hari itu." last><Toggle on={ed.push3h} onChange={v => E({ push3h: v })} label="Pengingat 3 jam sebelum berakhir" /></SettingRow>
          </Card>
          <Card>
            <CardHead title="Banner event" sub="716×220 px. Tampil di kartu event halaman Poin Saya." />
            <ImageDrop value={ed.bannerId} onChange={v => E({ bannerId: v })} label="Drop banner event" height={150} />
          </Card>
        </fieldset>
        <PhonePreview label="Preview pop-up">
          <PhoneHome s={preview} now={now}><SheetOverlay s={preview} now={now} onClaim={() => {}} onClose={() => {}} onDetail={() => {}} /></PhoneHome>
        </PhonePreview>
      </div>
    </Page>
  );
}
