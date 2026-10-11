'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MeCtx, type Me } from '@/components/adminMe';
import { api, Toaster, useServerClock } from '@/components/ui';
import { initials } from '@/lib/points';


const PAGES: [string, string][] = [['/admin', 'Dashboard'], ['/admin/aturan', 'Aturan Poin'], ['/admin/event', 'Event'], ['/admin/level', 'Level'], ['/admin/popup', 'Pop-up'], ['/admin/peringkat', 'Peringkat'], ['/admin/log', 'Log Check-in'], ['/admin/integrasi', 'Integrasi']];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ROLE = { admin: 'Admin', marketing: 'Marketing', cs: 'CS' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname(), [me, setMe] = useState<Me | null>(null), [menu, setMenu] = useState(false);
  const refresh = () => api<Me>('/api/admin/me').then(setMe).catch(() => {});
  useEffect(() => { refresh(); }, [path]);
  const now = useServerClock(me?.serverNow), d = new Date(now + 7 * 3600e3);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const active = (href: string) => (href === '/admin' ? path === href : path.startsWith(href));
  const page = PAGES.find(([h]) => active(h))?.[1] ?? '';
  const sub = path === '/admin/event/baru' ? ' / Buat event' : /^\/admin\/event\/.+/.test(path) ? ' / Ubah event' : '';
  return (
    <MeCtx.Provider value={{ me, refresh }}>
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'flex-start' }}>
        <aside style={{ position: 'sticky', top: 0, width: 236, height: '100vh', flexShrink: 0, background: '#fff', borderRight: '1px solid #E2E9F0', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 12px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontSize: 21, fontWeight: 800 }}><span style={{ color: '#0B72C4' }}>CBN</span><span style={{ color: '#5BB4E8', fontWeight: 600 }}>fiber</span></div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7684' }}>Check-in Admin</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PAGES.map(([href, label]) => {
              const a = active(href), badge = href === '/admin/event' && me ? me.activeEvents + ' aktif' : href === '/admin/log' ? 'LIVE' : '';
              return (
                <Link key={href} href={href} className="h-nav" aria-current={a ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 40, padding: '0 12px', borderRadius: 10, background: a ? '#E8F3FC' : 'transparent', color: a ? '#0B72C4' : '#3C4A57', fontSize: 14, fontWeight: a ? 800 : 600 }}>
                  {label}{badge && <span style={{ fontSize: 11, fontWeight: 700, color: '#0B72C4', background: '#E8F3FC', padding: '2px 7px', borderRadius: 999 }}>{badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div style={{ marginTop: 'auto', padding: 12, borderRadius: 12, background: '#F5F8FB', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />Terhubung ke CBN fiber app</span>
            <span style={{ fontSize: 11.5, color: '#6B7684' }}>Perubahan langsung berlaku di app tanpa rilis baru.</span>
          </div>
        </aside>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header style={{ position: 'sticky', top: 0, zIndex: 5, height: 64, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E2E9F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6B7684' }}><span>Check-in Admin</span><span>/</span><b style={{ color: '#12263A', fontWeight: 700 }}>{page}{sub}</b></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
              {me && <span className="tab" style={{ fontSize: 13, fontWeight: 600, color: '#3C4A57' }}>{p2(d.getUTCDate())} {MON[d.getUTCMonth()]} {d.getUTCFullYear()} · {p2(d.getUTCHours())}:{p2(d.getUTCMinutes())}:{p2(d.getUTCSeconds())} WIB</span>}
              {me && <span style={{ height: 26, padding: '0 10px', borderRadius: 999, background: '#E8F7EE', color: '#15803D', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{me.env}</span>}
              <button onClick={() => setMenu(!menu)} aria-label="Akun" aria-expanded={menu} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#E8F3FC', color: '#0B72C4', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{me ? initials(me.name) : ''}</button>
              {menu && me && (
                <div style={{ position: 'absolute', top: 44, right: 0, background: '#fff', border: '1px solid #E2E9F0', borderRadius: 12, boxShadow: '0 12px 30px rgba(14,34,51,.15)', padding: 6, minWidth: 180, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13.5 }}>{me.name}</b><span style={{ fontSize: 12, color: '#6B7684' }}>{ROLE[me.role]}</span></div>
                  <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/login'; }} className="h-secondary" style={{ height: 36, border: 'none', background: '#fff', borderRadius: 8, textAlign: 'left', padding: '0 10px', fontSize: 13.5, fontWeight: 600, color: '#E11D2E', cursor: 'pointer' }}>Keluar</button>
                </div>
              )}
            </div>
          </header>
          <main style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1320, width: '100%' }}>{children}</main>
        </div>
      </div>
      <Toaster />
    </MeCtx.Provider>
  );
}
