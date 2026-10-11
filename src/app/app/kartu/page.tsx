'use client';
// Embeddable Beranda card (small webview). Height ~150px, transparent background.
import { useRouter } from 'next/navigation';
import { HomeCard } from '@/components/checkin';
import { useCheckin } from '@/components/useCheckin';
import { postToApp } from '@/lib/bridge';

export default function Kartu() {
  const { s, now } = useCheckin(), router = useRouter();
  if (!s) return null;
  return (
    <>
      <style>{'html,body{background:transparent!important}'}</style>
      <div style={{ padding: 4 }}>
        <HomeCard s={s} now={now} onClaim={() => postToApp({ type: 'openPopup' }) || router.push('/app/popup')} onDetail={() => postToApp({ type: 'open', path: '/app' }) || router.push('/app')} />
      </div>
    </>
  );
}
