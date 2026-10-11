'use client';
import { useRouter } from 'next/navigation';
import { AppBar, DetailBody } from '@/components/checkin';
import { AppState } from '@/components/AppState';
import { useCheckin } from '@/components/useCheckin';
import { postToApp } from '@/lib/bridge';

export default function PoinSaya() {
  const { s, err, busy, now, claim, reload } = useCheckin(), router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2 }}><AppBar title="Poin Saya" onBack={() => postToApp({ type: 'close' }) || history.back()} /></div>
      {s ? <DetailBody s={s} now={now} busy={busy} onClaim={claim} onRank={() => router.push('/app/peringkat')} /> : <AppState err={err} onRetry={reload} />}
      {s && err && <div role="alert" style={{ position: 'fixed', left: 16, right: 16, bottom: 16, padding: '12px 14px', borderRadius: 12, background: '#12263A', color: '#fff', fontSize: 13.5 }}>{err}</div>}
    </div>
  );
}
