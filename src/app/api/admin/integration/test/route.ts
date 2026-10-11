import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { fetchProfiles } from '@/lib/customers';
import { getSetting, setSetting } from '@/lib/settings';

export async function POST(req: Request) {
  const s = await requireRole('admin');
  if (s instanceof NextResponse) return s;
  const id = String((await req.json()).id ?? '').trim();
  if (!id) return bad('Isi customer ID');
  const cfg = await getSetting('integration');
  const r = await fetchProfiles([id], cfg);
  const p = r.ok ? r.profiles.get(id) : undefined;
  await setSetting('integration', { ...cfg, lastTest: { ok: r.ok, ms: r.ms, at: Date.now() } });
  return NextResponse.json({ ok: r.ok, found: !!p, ms: r.ms, mock: !cfg.url, error: r.ok ? null : r.error, profile: p ?? null });
}
