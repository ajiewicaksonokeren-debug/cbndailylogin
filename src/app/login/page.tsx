'use client';
import { useState } from 'react';
import { Btn, Card, Field } from '@/components/ui';

export default function Login() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error);
    const next = new URLSearchParams(location.search).get('next') ?? '';
    location.href = next.startsWith('/admin') ? next : '/admin';
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ width: 380, maxWidth: '100%' }}>
        <Card style={{ padding: 28, gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontSize: 21, fontWeight: 800 }}><span style={{ color: '#0B72C4' }}>CBN</span><span style={{ color: '#5BB4E8', fontWeight: 600 }}>fiber</span></div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7684' }}>Check-in Admin</span>
          </div>
          <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="username" />
          <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
          {err && <span role="alert" style={{ fontSize: 13, color: '#E11D2E' }}>{err}</span>}
          <Btn type="submit" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</Btn>
        </Card>
      </form>
    </div>
  );
}
