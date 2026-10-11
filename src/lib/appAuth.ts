// Resolves customer_id from the CBN app session token. customer_id is never accepted from the client.
export async function customerFromRequest(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  if (process.env.APP_AUTH_MODE === 'mock') {
    // Demo tokens: local dev and Vercel preview only, never a production deployment.
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') throw new Error('APP_AUTH_MODE=mock is only allowed in dev/preview');
    return /^\d{6,10}$/.test(token) ? token : null;
  }
  const url = process.env.CBN_AUTH_VERIFY_URL;
  if (!url) throw new Error('CBN_AUTH_VERIFY_URL is not set');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(3000) });
  if (!r.ok) return null;
  const j = (await r.json()) as { customer_id?: string | number };
  return j.customer_id != null ? String(j.customer_id) : null;
}

export const deviceOf = (req: Request) => {
  const h = req.headers.get('x-device') ?? req.headers.get('user-agent') ?? '';
  return /iphone|ipad|ios/i.test(h) ? 'iOS' : /android/i.test(h) ? 'Android' : 'Lainnya';
};
