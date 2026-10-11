'use client';
export const AppState = ({ err, onRetry }: { err?: string; onRetry?: () => void }) => (
  <div role={err ? 'alert' : 'status'} style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontSize: 14, color: '#6B7684' }}>
    {err || 'Memuat…'}
    {err && onRetry && <button onClick={onRetry} style={{ height: 44, padding: '0 18px', border: 'none', borderRadius: 12, background: '#0B72C4', color: '#fff', font: "700 14px 'Plus Jakarta Sans'", cursor: 'pointer' }}>Coba lagi</button>}
  </div>
);
