// Adapter to the existing CBN customer API. Only customer_id is stored locally.
import { decrypt } from './crypto';
import { getSetting } from './settings';
import type { FieldKey, IntegrationCfg } from './defaults';

export type Profile = Record<FieldKey, string>;
type Result = { ok: true; profiles: Map<string, Profile>; ms: number } | { ok: false; error: string; ms: number };

const cache = new Map<string, { p: Profile | null; exp: number }>();
let oauth: { token: string; exp: number } | null = null;

const dig = (o: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), o);

const MOCK_NAMES = ['Dian Anggraeni', 'Dimas Aditya', 'Sari Pratiwi', 'Bayu Kurniawan', 'Nadia Rahma', 'Fikri Hidayat', 'Ayu Lestari', 'Rizky Maulana', 'Putri Wulandari', 'Hendra Setiawan', 'Maya Tanjung', 'Andi Saputra', 'Lina Kartika', 'Yoga Pratama', 'Rina Damayanti'];
const MOCK_AREAS = ['Jakarta Barat', 'Jakarta Selatan', 'Surabaya', 'Batam', 'Bekasi', 'Tangerang'];
const MOCK_PAKET = ['CBN Fiber 50', 'CBN Fiber 100 New', 'CBN Fiber 200', 'CBN Fiber 30'];

function mockProfile(id: string): Profile | null {
  if (!/^\d{6,10}$/.test(id)) return null;
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { customer_id: id, nama: id === '30110910' ? 'Dian Anggraeni' : MOCK_NAMES[h % MOCK_NAMES.length], paket: MOCK_PAKET[h % 4], area: MOCK_AREAS[h % 6], cybro_tier: 'Basic', status: 'Active' };
}

async function authHeader(cfg: IntegrationCfg, signal: AbortSignal): Promise<Record<string, string>> {
  const secret = cfg.secretEnc ? decrypt(cfg.secretEnc) : '';
  if (cfg.auth === 'key') return secret ? { Authorization: 'Bearer ' + secret } : {};
  if (oauth && oauth.exp > Date.now()) return { Authorization: 'Bearer ' + oauth.token };
  const r = await fetch(cfg.tokenUrl, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cfg.clientId, client_secret: secret }),
  });
  if (!r.ok) throw new Error('OAuth token ' + r.status);
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  oauth = { token: j.access_token, exp: Date.now() + ((j.expires_in ?? 3600) - 60) * 1000 };
  return { Authorization: 'Bearer ' + oauth.token };
}

/** Batch fetch, bypassing cache. Empty base URL = mock mode. */
export async function fetchProfiles(ids: string[], cfg?: IntegrationCfg): Promise<Result> {
  cfg ??= await getSetting('integration');
  const t0 = Date.now();
  if (!cfg.url) {
    const profiles = new Map<string, Profile>();
    for (const id of ids) { const p = mockProfile(id); if (p) profiles.set(id, p); }
    return { ok: true, profiles, ms: Date.now() - t0 };
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutSec * 1000);
  try {
    const url = cfg.url.replace(/\/$/, '') + cfg.path.replace('{ids}', ids.map(encodeURIComponent).join(','));
    const r = await fetch(url, { headers: { Accept: 'application/json', ...(await authHeader(cfg, ctl.signal)) }, signal: ctl.signal });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, ms: Date.now() - t0 };
    const j = await r.json();
    const list: unknown[] = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [j];
    const profiles = new Map<string, Profile>();
    for (const item of list) {
      const p = Object.fromEntries(Object.entries(cfg.map).map(([k, path]) => [k, String(dig(item, path) ?? '')])) as Profile;
      if (p.customer_id) profiles.set(p.customer_id, p);
    }
    return { ok: true, profiles, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: ctl.signal.aborted ? 'Timeout' : (e as Error).message, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

/** Cached lookup. On API failure returns what is cached; callers fall back to showing the ID. */
export async function getProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const now = Date.now(), out = new Map<string, Profile>(), miss: string[] = [];
  for (const id of new Set(ids)) {
    const c = cache.get(id);
    if (c && c.exp > now) { if (c.p) out.set(id, c.p); } else miss.push(id);
  }
  if (!miss.length) return out;
  const cfg = await getSetting('integration');
  for (let i = 0; i < miss.length; i += 100) {
    const chunk = miss.slice(i, i + 100);
    const r = await fetchProfiles(chunk, cfg);
    if (!r.ok) continue;
    const exp = now + cfg.cacheMin * 60e3;
    for (const id of chunk) {
      const p = r.profiles.get(id) ?? null;
      cache.set(id, { p, exp });
      if (p) out.set(id, p);
    }
  }
  return out;
}

export const clearProfileCache = () => { cache.clear(); oauth = null; };

const DIM: Record<string, (p: Profile, level: number) => boolean> = {
  'Cybro Silver+': (_p, level) => level >= 1,
  'Paket 100 Mbps+': p => Number(p.paket.match(/(\d+)/)?.[1] ?? 0) >= 100,
};
const dimOf = (s: string) => (s === 'Cybro Silver+' ? 'level' : s.startsWith('Paket') ? 'paket' : 'area');

/** OR within one dimension (area/paket/level), AND across dimensions. No segments = everyone. */
export function matchesSegments(segments: string[], p: Profile | undefined, level: number) {
  if (!segments.length) return true;
  if (!p) return false;
  const groups = new Map<string, string[]>();
  for (const s of segments) groups.set(dimOf(s), [...(groups.get(dimOf(s)) ?? []), s]);
  return [...groups.values()].every(g =>
    g.some(s => (DIM[s] ? DIM[s](p, level) : p.area.toLowerCase().includes(s.toLowerCase()))),
  );
}
