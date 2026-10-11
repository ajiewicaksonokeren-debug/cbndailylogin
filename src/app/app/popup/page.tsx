'use client';
// Opened by the native app as a transparent overlay on top of Beranda.
import { useRouter } from 'next/navigation';
import { SheetOverlay } from '@/components/checkin';
import { AppState } from '@/components/AppState';
import { appApi, useCheckin } from '@/components/useCheckin';
import { postToApp } from '@/lib/bridge';

export default function Popup() {
  const { s, err, busy, now, claim } = useCheckin(), router = useRouter();
  const close = async () => {
    if (s && !s.claimed) await appApi('/api/v1/popup/dismiss', 'POST');
    if (!postToApp({ type: 'close' })) router.push('/app');
  };
  return (
    <>
      <style>{'html,body{background:transparent!important}'}</style>
      {s ? <SheetOverlay fixed s={s} now={now} busy={busy} onClaim={claim} onClose={close} onDetail={() => postToApp({ type: 'open', path: '/app' }) || router.push('/app')} />
        : err ? <div style={{ position: 'fixed', inset: 0, background: '#fff' }}><AppState err={err} onRetry={close} /></div> : null}
    </>
  );
}
