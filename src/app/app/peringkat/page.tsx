'use client';
import { useRouter } from 'next/navigation';
import { AppBar, RankBody } from '@/components/checkin';
import { AppState } from '@/components/AppState';
import { useBoard } from '@/components/useCheckin';

export default function Peringkat() {
  const { b, mode, setMode, err } = useBoard(), router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2 }}><AppBar title="Peringkat Check-in" sub={b?.enabled ? `Top ${b.top} · ${b.month}` : undefined} onBack={() => router.push('/app')} /></div>
      {!b ? <AppState err={err} /> : !b.enabled ? <AppState err="Papan peringkat ini sedang tidak aktif." /> : (
        <div style={{ position: 'relative', flex: 1 }}>
          <RankBody b={b} mode={mode} setMode={setMode} showModes={{ p: true, s: true }} youName={b.me?.name || 'Anda'} fixedMe />
        </div>
      )}
    </div>
  );
}
