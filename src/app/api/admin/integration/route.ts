import { NextResponse } from 'next/server';
import { bad, requireRole } from '@/lib/adminAuth';
import { decrypt, encrypt } from '@/lib/crypto';
import { clearProfileCache } from '@/lib/customers';
import type { IntegrationCfg } from '@/lib/defaults';
import { getSetting, setSetting } from '@/lib/settings';

/** Secret is never returned; browser only sees a masked hint. */
const publicView = (c: IntegrationCfg) => {
  const k = c.secretEnc ? decrypt(c.secretEnc) : '';
  const { secretEnc: _, ...rest } = c;
  return { ...rest, secretMasked: k ? k.slice(0, 4) + '•'.repeat(Math.max(0, k.length - 8)) + k.slice(-4) : '' };
};

export async function GET() {
  const s = await requireRole('admin');
  if (s instanceof NextResponse) return s;
  return NextResponse.json({ value: publicView(await getSetting('integration')) });
}

export async function PUT(req: Request) {
  const s = await requireRole('admin');
  if (s instanceof NextResponse) return s;
  const b = await req.json();
  const cur = await getSetting('integration');
  if (b.url && !/^https:\/\//.test(b.url)) return bad('Base URL harus https://');
  if (!String(b.path ?? '').includes('{ids}')) return bad('Endpoint harus memuat {ids}');
  if (!(b.cacheMin >= 1 && b.cacheMin <= 1440) || !(b.timeoutSec >= 1 && b.timeoutSec <= 30)) return bad('Cache 1–1440 menit, batas waktu 1–30 detik');
  if (b.auth === 'oauth' && b.url && (!/^https:\/\//.test(b.tokenUrl ?? '') || !b.clientId)) return bad('OAuth butuh Token URL (https) dan Client ID');
  const next: IntegrationCfg = {
    ...cur,
    url: String(b.url ?? '').trim(), path: String(b.path).trim(), auth: b.auth === 'oauth' ? 'oauth' : 'key',
    tokenUrl: String(b.tokenUrl ?? '').trim(), clientId: String(b.clientId ?? '').trim(),
    cacheMin: Number(b.cacheMin), timeoutSec: Number(b.timeoutSec),
    map: Object.fromEntries(Object.keys(cur.map).map(k => [k, String(b.map?.[k] ?? cur.map[k as keyof typeof cur.map]).trim()])) as IntegrationCfg['map'],
    secretEnc: typeof b.secret === 'string' && b.secret ? encrypt(b.secret) : cur.secretEnc,
  };
  await setSetting('integration', next);
  clearProfileCache();
  return NextResponse.json({ value: publicView(next) });
}
