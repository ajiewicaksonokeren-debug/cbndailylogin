import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Poin Saya · CBN fiber' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', position: 'relative', color: '#12263A' }}>{children}</div>;
}
