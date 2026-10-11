'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Board, Status } from '@/lib/checkin';
import { postToApp } from '@/lib/bridge';
import { useServerClock } from './ui';

/** Token comes from the app as `#token=…` (fragment: never sent to servers/logs), kept for this webview session. */
function token() {
  const m = location.hash.match(/token=([^&]+)/);
  if (m) {
    sessionStorage.setItem('cbn_token', decodeURIComponent(m[1]));
    history.replaceState(null, '', location.pathname + location.search);
  }
  return sessionStorage.getItem('cbn_token') ?? '';
}

export async function appApi<T>(path: string, method = 'GET'): Promise<{ ok: boolean; status: number; body: T & { error?: string } }> {
  const r = await fetch(path, { method, headers: { Authorization: 'Bearer ' + token() }, cache: 'no-store' });
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
}

export function useCheckin() {
  const [s, setS] = useState<Status | null>(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await appApi<Status>('/api/v1/me');
    if (r.ok) { setS(r.body); setErr(''); } else setErr(r.status === 401 ? 'Sesi berakhir. Buka ulang dari app CBN fiber.' : 'Gagal memuat. Periksa koneksi Anda.');
  }, []);
  useEffect(() => { load(); }, [load]);
  const now = useServerClock(s?.serverNow);
  useEffect(() => { if (s && now >= s.resetAt) load(); }, [s, now, load]);
  const claim = async () => {
    if (busy) return;
    setBusy(true);
    const r = await appApi<{ status: Status; result?: { total: number; streak: number } }>('/api/v1/checkin', 'POST');
    setBusy(false);
    if (r.body.status) setS(r.body.status);
    if (r.ok && r.body.result) postToApp({ type: 'claimed', total: r.body.result.total, streak: r.body.result.streak });
    else if (r.status !== 409) setErr(r.body.error ?? 'Klaim gagal. Coba lagi.');
  };
  return { s, err, busy, now, claim, reload: load };
}

export function useBoard() {
  const [mode, setMode] = useState<'poin' | 'streak'>('poin'), [b, setB] = useState<Board | null>(null), [err, setErr] = useState('');
  useEffect(() => {
    appApi<Board>('/api/v1/leaderboard?mode=' + mode).then(r => (r.ok ? setB(r.body) : setErr('Gagal memuat peringkat.')));
  }, [mode]);
  return { b, mode, setMode, err };
}
