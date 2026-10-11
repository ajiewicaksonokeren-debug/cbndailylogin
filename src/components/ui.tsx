'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) { location.href = '/login?next=' + encodeURIComponent(location.pathname); throw new Error('Belum login'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? 'Terjadi kesalahan (' + r.status + ')');
  return j;
}

/** Number input text: accepts "1,2" or "1.200" style. */
export const num = (v: string) => {
  const s = v.trim().replace(/\s/g, '');
  return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s);
};

export function toast(msg: string, error = false) {
  window.dispatchEvent(new CustomEvent('cbn-toast', { detail: { msg, error } }));
}

export function Toaster() {
  const [t, setT] = useState<{ msg: string; error: boolean } | null>(null);
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setT((e as CustomEvent).detail); clearTimeout(tm); tm = setTimeout(() => setT(null), 2600); };
    window.addEventListener('cbn-toast', on);
    return () => window.removeEventListener('cbn-toast', on);
  }, []);
  if (!t) return null;
  return (
    <div role="status" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#12263A', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 12px 30px rgba(14,34,51,.3)', maxWidth: 'calc(100vw - 48px)' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: t.error ? '#E11D2E' : '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800 }}>
        {t.error ? '!' : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
      </span>
      {t.msg}
    </div>
  );
}

export const Card = ({ children, style, pad = 20 }: { children: ReactNode; style?: CSSProperties; pad?: number | string }) => (
  <div style={{ background: '#fff', border: '1px solid #E2E9F0', borderRadius: 16, boxShadow: '0 4px 14px rgba(14,34,51,.05)', padding: pad, display: 'flex', flexDirection: 'column', gap: 12, ...style }}>{children}</div>
);

export const CardHead = ({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <b style={{ fontSize: 16, fontWeight: 800 }}>{title}</b>
      {sub && <span style={{ fontSize: 13, color: '#6B7684', lineHeight: 1.5 }}>{sub}</span>}
    </div>
    {right}
  </div>
);

export const PageHead = ({ title, sub, children, maxWidth = 640 }: { title: string; sub: ReactNode; children?: ReactNode; maxWidth?: number }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: '#6B7684', lineHeight: 1.55 }}>{sub}</p>
    </div>
    {children && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>}
  </div>
);

export const Page = ({ children }: { children: ReactNode }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</div>;

type BtnProps = { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary'; type?: 'button' | 'submit'; disabled?: boolean; style?: CSSProperties };
export const Btn = ({ children, onClick, variant = 'primary', type = 'button', disabled, style }: BtnProps) => (
  <button type={type} onClick={onClick} disabled={disabled} className={variant === 'primary' ? 'h-primary' : 'h-secondary'} style={{
    height: 40, padding: '0 16px', borderRadius: 10, font: "700 14px 'Plus Jakarta Sans'", cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1,
    ...(variant === 'primary' ? { border: 'none', background: '#0B72C4', color: '#fff' } : { border: '1px solid #D5DEE7', background: '#fff', color: '#12263A' }), ...style,
  }}>{children}</button>
);

export const LinkBtn = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} style={{ border: 'none', background: 'none', color: '#0B72C4', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{children}</button>
);

type InputProps = {
  value: string; onChange: (v: string) => void; prefix?: ReactNode; suffix?: ReactNode; width?: number | string;
  placeholder?: string; type?: string; autoComplete?: string; ariaLabel?: string; mono?: boolean;
};
export const Input = ({ value, onChange, prefix, suffix, width = '100%', placeholder, type, autoComplete, ariaLabel, mono = true }: InputProps) => (
  <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, border: '1px solid #D5DEE7', borderRadius: 10, background: '#fff', padding: '0 12px', width, maxWidth: '100%' }}>
    {prefix != null && <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7684' }}>{prefix}</span>}
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} autoComplete={autoComplete} aria-label={ariaLabel}
      style={{ border: 'none', outline: 'none', flex: 1, minWidth: 0, width: '100%', font: "600 14px 'Plus Jakarta Sans'", color: '#12263A', background: 'transparent', fontVariantNumeric: mono ? 'tabular-nums' : undefined }} />
    {suffix != null && <span style={{ fontSize: 13, color: '#6B7684', whiteSpace: 'nowrap' }}>{suffix}</span>}
  </div>
);

export const Field = ({ label, help, helpColor = '#6B7684', ...p }: InputProps & { label: ReactNode; help?: ReactNode; helpColor?: string }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span>
    <Input ariaLabel={typeof label === 'string' ? label : undefined} {...p} />
    {help && <span style={{ fontSize: 12, color: helpColor }}>{help}</span>}
  </label>
);

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: 42, height: 24, border: 'none', borderRadius: 999, background: on ? '#0B72C4' : '#C9D3DD', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
    <span style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transform: on ? 'translateX(18px)' : 'none', transition: 'transform .15s' }} />
  </button>
);

export const SettingRow = ({ label, sub, children, last }: { label: string; sub?: string; children: ReactNode; last?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '16px 0', borderBottom: last ? 'none' : '1px solid #EDF1F5', flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 220 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      {sub && <span style={{ fontSize: 12.5, color: '#6B7684', lineHeight: 1.5 }}>{sub}</span>}
    </div>
    {children}
  </div>
);

export const Seg = <K extends string>({ value, options, onChange }: { value: K; options: [K, string][]; onChange: (k: K) => void }) => (
  <div style={{ display: 'flex', padding: 4, borderRadius: 10, background: '#EEF2F6', gap: 4, alignSelf: 'flex-start' }}>
    {options.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} aria-pressed={value === k} style={{ height: 32, padding: '0 12px', border: 'none', borderRadius: 8, background: value === k ? '#fff' : 'transparent', color: value === k ? '#0B72C4' : '#6B7684', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
    ))}
  </div>
);

export const TH = ({ cols, children, style }: { cols: string; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, padding: '11px 18px', background: '#F5F8FB', borderBottom: '1px solid #E2E9F0', fontSize: 11.5, fontWeight: 700, color: '#6B7684', textTransform: 'uppercase', letterSpacing: '.04em', ...style }}>{children}</div>
);

export const Pill = ({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 13.5, color: '#6B7684' }}>{children}</div>
);

/** Image upload. Stores to /api/admin/assets and returns the asset id. */
export function ImageDrop({ value, onChange, label, height = 120, radius = 12 }: { value: string | null; onChange: (id: string | null) => void; label: string; height?: number; radius?: number }) {
  const ref = useRef<HTMLInputElement>(null), [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch('/api/admin/assets', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast(j.error ?? 'Upload gagal', true);
    onChange(j.id);
  };
  return (
    <div onClick={() => ref.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
      role="button" tabIndex={0} aria-label={label} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
      style={{ position: 'relative', height, borderRadius: radius, overflow: 'hidden', cursor: 'pointer', background: value ? `#F5F8FB url(/api/assets/${value}) center/cover no-repeat` : over ? '#E8F3FC' : '#F5F8FB', border: value ? 'none' : '1.5px dashed ' + (over ? '#0B72C4' : '#C9D3DD'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7684', fontSize: 12.5, fontWeight: 600 }}>
      {!value && (busy ? 'Mengunggah…' : label)}
      {value && <button onClick={e => { e.stopPropagation(); onChange(null); }} aria-label="Hapus gambar" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => upload(e.target.files?.[0])} />
    </div>
  );
}

/** Scaled 390×844 phone preview (design: 281×608 at .72). */
export const PhonePreview = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', position: 'sticky', top: 88 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7684', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
    <div style={{ width: 281, height: 608, position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 390, height: 844, transform: 'scale(.72)', transformOrigin: 'top left', borderRadius: 36, background: '#F1F3F6', overflow: 'hidden', boxShadow: '0 24px 60px rgba(14,34,51,.18)' }}>{children}</div>
    </div>
  </div>
);

/** Ticking clock aligned to server time. */
export function useServerClock(serverNow?: number) {
  const [offset, setOffset] = useState(0), [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (serverNow) setOffset(serverNow - Date.now()); }, [serverNow]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  return now + offset;
}

/** Highlights rows that appeared since the previous poll (design: #F1F7FD, fades over 1s). */
export function useFresh(rows: { key: number }[] | undefined) {
  const seen = useRef<Set<number> | null>(null), [fresh, setFresh] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!rows) return;
    const keys = rows.map(r => r.key);
    if (seen.current) setFresh(new Set(keys.filter(k => !seen.current!.has(k))));
    seen.current = new Set([...(seen.current ?? []), ...keys]);
    const t = setTimeout(() => setFresh(new Set()), 2500);
    return () => clearTimeout(t);
  }, [rows]);
  return fresh;
}
